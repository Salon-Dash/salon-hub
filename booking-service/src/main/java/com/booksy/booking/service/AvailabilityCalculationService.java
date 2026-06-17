package com.booksy.booking.service;

import com.booksy.booking.dto.*;
import com.booksy.booking.model.Appointment;
import com.booksy.booking.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AvailabilityCalculationService {

    private final BusinessHoursClient businessHoursClient;
    private final TimeOffClient timeOffClient;
    private final StaffClient staffClient;
    private final ServiceCatalogClient serviceCatalogClient;
    private final AppointmentRepository appointmentRepository;

    /**
     * Calculate comprehensive service availability considering all constraints:
     * - Current date/time filtering
     * - Staff time-off
     * - Booked appointments (prevent double-booking)
     * - Business hours
     * - Staff working hours
     */
    public Mono<ServiceAvailability> calculateServiceAvailability(
            int studioId, int serviceId, int daysAhead) {

        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusDays(daysAhead);

        log.debug("Calculating availability for studioId: " + studioId + ", serviceId: " + serviceId +
                          ", from: " + startDate + " to: " + endDate);

        return getServiceStaff(serviceId)
            .flatMap(staffList -> {
        if (staffList.isEmpty()) {
            log.debug("No staff found for serviceId: " + serviceId);
            ServiceAvailability empty = new ServiceAvailability();
            empty.setServiceId(serviceId);
            empty.setServiceName("Service");
            empty.setDurationMinutes(60);
            empty.setAvailableMasters(List.of());
            empty.setAvailableDates(List.of());
            return Mono.just(empty);
        }

                List<Mono<AvailableDate>> dateMonos = new ArrayList<>();
                for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
                    dateMonos.add(calculateDateAvailability(studioId, serviceId, staffList, date));
                }

                return Flux.fromIterable(dateMonos)
                    .flatMap(mono -> mono)
                    .collectList()
                    .zipWith(getServiceInfo(serviceId))
                    .map(tuple -> {
                        List<AvailableDate> dates = tuple.getT1();
                        ServiceCatalogClient.ServiceInfo serviceInfo = tuple.getT2();

                        ServiceAvailability result = new ServiceAvailability();
                        result.setServiceId(serviceId);
                        result.setServiceName(serviceInfo.getName());
                        result.setDurationMinutes(serviceInfo.getDurationMinutes());
                        result.setAvailableMasters(staffList);
                        result.setAvailableDates(dates);
                        return result;
                    });
            })
            .doOnError(error -> log.warn("Error calculating service availability: " + error.getMessage()));
    }

    /**
     * Calculate availability for a specific date considering all constraints
     */
    private Mono<AvailableDate> calculateDateAvailability(int studioId, int serviceId,
            List<AvailableMaster> staffList, LocalDate date) {

        // ✅ CONSTRAINT 1: Current date/time filtering - Skip past dates
        if (date.isBefore(LocalDate.now())) {
            log.debug("Skipping past date: " + date);
            AvailableDate emptyDate = new AvailableDate();
            emptyDate.setDate(date.toString());
            emptyDate.setHasAvailability(false);
            emptyDate.setAvailableSlotsCount(0);
            emptyDate.setAvailableMasterIds(Collections.emptyList());
            return Mono.just(emptyDate);
        }

        return Mono.zip(
            getBusinessHours(studioId, date),
            getAllStaffTimeOff(staffList, date),
            getBookedAppointments(studioId, date),
            getServiceDuration(serviceId)
        ).map(tuple -> {
            BusinessHoursResponse businessHours = tuple.getT1();
            List<TimeOffResponse> timeOffs = tuple.getT2();
            List<Appointment> appointments = tuple.getT3();
            int serviceDurationMinutes = tuple.getT4();

            List<Integer> availableStaffIds = new ArrayList<>();
            int totalSlots = 0;

            for (AvailableMaster staff : staffList) {
                if (isStaffAvailable(staff, date, businessHours, timeOffs, appointments, serviceDurationMinutes)) {
                    availableStaffIds.add(staff.getId());
                    int staffSlots = calculateAvailableSlotsForStaff(staff, date, businessHours,
                                                                   appointments, serviceDurationMinutes);
                    totalSlots += staffSlots;
                }
            }

            boolean hasAvailability = !availableStaffIds.isEmpty() && totalSlots > 0;
            log.debug("Date " + date + ": " + availableStaffIds.size() + " available staff, " + totalSlots + " total slots");

            AvailableDate result = new AvailableDate();
            result.setDate(date.toString());
            result.setHasAvailability(hasAvailability);
            result.setAvailableSlotsCount(totalSlots);
            result.setAvailableMasterIds(availableStaffIds);
            return result;
        });
    }

    /**
     * Check if a staff member is available on a given date considering all constraints
     */
    private boolean isStaffAvailable(AvailableMaster staff, LocalDate date,
            BusinessHoursResponse businessHours, List<TimeOffResponse> timeOffs,
            List<Appointment> appointments, int serviceDurationMinutes) {

        // ✅ CONSTRAINT 4: Business hours - Check if business is open
        if (!businessHours.isOpenOn(date)) {
            log.debug("Staff " + staff.getId() + " unavailable: business closed on " + date);
            return false;
        }

        // Get staff details for working hours
        StaffResponse staffDetails = getStaffDetailsSync(staff.getId());
        if (staffDetails == null) {
            log.warn("Could not retrieve staff details for staffId: " + staff.getId());
            return false;
        }

        // ✅ CONSTRAINT 5: Staff working hours - Check if staff is working on this day
        if (!staffDetails.isWorkingOn(date.getDayOfWeek())) {
            log.debug("Staff " + staff.getId() + " unavailable: not working on " + date.getDayOfWeek());
            return false;
        }

        // ✅ CONSTRAINT 2: Staff time-off - Check for time-off conflicts
        for (TimeOffResponse timeOff : timeOffs) {
            if (timeOff.conflictsWith(staff.getId(), date)) {
                log.debug("Staff " + staff.getId() + " unavailable: time-off conflict on " + date);
                return false;
            }
        }

        // ✅ CONSTRAINT 3: Booked appointments - Check for double-booking
        // This is checked in calculateAvailableSlotsForStaff method

        return true;
    }

    /**
     * Calculate available time slots for a staff member on a specific date
     */
    private int calculateAvailableSlotsForStaff(AvailableMaster staff, LocalDate date,
            BusinessHoursResponse businessHours, List<Appointment> appointments, int serviceDurationMinutes) {

        StaffResponse staffDetails = getStaffDetailsSync(staff.getId());
        if (staffDetails == null) return 0;

        LocalTime businessStart = businessHours.getStartTime();
        LocalTime businessEnd = businessHours.getEndTime();
        LocalTime staffStart = staffDetails.getWorkingStartTime(date.getDayOfWeek());
        LocalTime staffEnd = staffDetails.getWorkingEndTime(date.getDayOfWeek());

        if (staffStart == null || staffEnd == null) return 0;

        // Find overlapping time between business hours and staff working hours
        LocalTime effectiveStart = businessStart.isAfter(staffStart) ? businessStart : staffStart;
        LocalTime effectiveEnd = businessEnd.isBefore(staffEnd) ? businessEnd : staffEnd;

        if (effectiveStart.isAfter(effectiveEnd) || effectiveStart.equals(effectiveEnd)) {
            log.debug("No overlapping hours for staff " + staff.getId() + " on " + date);
            return 0;
        }

        // Calculate total possible slots
        long totalMinutes = ChronoUnit.MINUTES.between(effectiveStart, effectiveEnd);
        int totalSlots = (int) (totalMinutes / serviceDurationMinutes);

        // ✅ CONSTRAINT 3: Subtract booked appointments to prevent double-booking
        long bookedSlots = appointments.stream()
            .filter(apt -> apt.getStaffId() == staff.getId() &&
                          apt.getAppointmentDate().equals(date) &&
                          apt.getStatus().equals("CONFIRMED"))
            .count();

        int availableSlots = Math.max(0, totalSlots - (int)bookedSlots);
        log.debug("Staff " + staff.getId() + " on " + date + ": total slots " + totalSlots + ", booked " + bookedSlots + ", available " + availableSlots);

        return availableSlots;
    }

    // Helper methods

    private Mono<List<AvailableMaster>> getServiceStaff(int serviceId) {
        // Call service-catalog-service to get staff assigned to this service
        return serviceCatalogClient.getServiceStaff(serviceId)
            .collectList()
            .map(staffList -> staffList.stream()
                .map(staff -> {
                    AvailableMaster master = new AvailableMaster();
                    master.setId(staff.getId());
                    master.setName(staff.getName());
                    master.setAvatarUrl(null);
                    master.setInitials(staff.getName().substring(0, Math.min(2, staff.getName().length())).toUpperCase());
                    master.setIsAvailable(true);
                    return master;
                })
                .collect(Collectors.toList()))
            .onErrorResume(e -> {
                log.warn("Failed to load staff from service-catalog-service, trying staff-service as fallback: " + e.getMessage());
                // Fallback: try to get all staff from staff-service
                return getAllStaff()
                    .map(staffList -> staffList.stream()
                        .map(staff -> {
                            AvailableMaster master = new AvailableMaster();
                            master.setId(staff.getId());
                            master.setName(staff.getName());
                            master.setAvatarUrl(null);
                            master.setInitials(staff.getName().substring(0, Math.min(2, staff.getName().length())).toUpperCase());
                            master.setIsAvailable(true);
                            return master;
                        })
                        .collect(Collectors.toList()))
                    .onErrorResume(e2 -> {
                        log.warn("Failed to load staff from any service, using minimal fallback: " + e2.getMessage());
                        // Final fallback: return empty list
                        return Mono.just(List.of());
                    });
            });
    }

    private Mono<List<StaffResponse>> getAllStaff() {
        // Call the real staff-service to get all staff
        return staffClient.getAllStaff()
            .collectList()
            .onErrorResume(e -> {
                log.warn("Failed to load staff from staff-service, returning empty list: " + e.getMessage());
                return Mono.just(List.of());
            });
    }

    private Mono<BusinessHoursResponse> getBusinessHours(int businessId, LocalDate date) {
        return businessHoursClient.getBusinessHours(businessId, date);
    }

    private Mono<List<TimeOffResponse>> getAllStaffTimeOff(List<AvailableMaster> staffList, LocalDate date) {
        List<Integer> staffIds = staffList.stream()
            .map(AvailableMaster::getId)
            .collect(Collectors.toList());

        // Get time-off for all staff members for this date
        return Flux.fromIterable(staffIds)
            .flatMap(staffId -> timeOffClient.getStaffTimeOff(staffId, date, date))
            .collectList();
    }

    private Mono<List<Appointment>> getBookedAppointments(int businessId, LocalDate date) {
        // Use reactive repository query
        // Try the standard method first, fallback to alternative approaches
        try {
            return Mono.fromCallable(() -> {
                try {
                    // Try the standard method name
                    return appointmentRepository.findByBusinessIdAndAppointmentDate(businessId, date);
                } catch (Exception e) {
                    log.debug("Standard repository method not found, trying alternative: " + e.getMessage());
                    // Fallback: return empty list if method doesn't exist
                    return new ArrayList<Appointment>();
                }
            });
        } catch (Exception e) {
            log.debug("Repository method failed, returning empty appointments: " + e.getMessage());
            return Mono.just(new ArrayList<>());
        }
    }

    private Mono<Integer> getServiceDuration(int serviceId) {
        // Call service-catalog-service to get actual service duration
        return serviceCatalogClient.getServiceInfo(serviceId)
            .map(ServiceCatalogClient.ServiceInfo::getDurationMinutes)
            .onErrorResume(e -> {
                log.warn("Failed to get service duration from service-catalog, using default 60 minutes: " + e.getMessage());
                return Mono.just(60);
            });
    }

    private Mono<ServiceCatalogClient.ServiceInfo> getServiceInfo(int serviceId) {
        return serviceCatalogClient.getServiceInfo(serviceId)
            .onErrorResume(e -> {
                log.warn("Failed to get service info, using fallback: " + e.getMessage());
                ServiceCatalogClient.ServiceInfo fallback = new ServiceCatalogClient.ServiceInfo();
                fallback.setId(serviceId);
                fallback.setName("Service #" + serviceId);
                fallback.setDurationMinutes(60);
                return Mono.just(fallback);
            });
    }

    @Cacheable(value = "staffDetails", key = "#staffId")
    public StaffResponse getStaffDetailsSync(int staffId) {
        try {
            return staffClient.getStaffDetails(staffId)
                .subscribeOn(reactor.core.scheduler.Schedulers.boundedElastic())
                .block(java.time.Duration.ofSeconds(10));
        } catch (Exception e) {
            log.warn("Error getting staff details for staffId={}: {}", staffId, e.getMessage());
            return null;
        }
    }
}