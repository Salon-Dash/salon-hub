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
import java.time.format.DateTimeFormatter;
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

    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");

    /**
     * Phase 2 slot engine: compute the actual bookable start times for a service on
     * a single date. Unlike {@link #calculateServiceAvailability} (a coarse count),
     * this returns concrete wall-clock start times respecting:
     *   business hours ∩ staff working hours − time-off − existing appointments,
     * such that the service duration fits, stepped by the service's booking interval,
     * with padding (buffer) reserved before/after each candidate slot.
     *
     * @param staffId optional — if non-null, only that staff's slots; otherwise the
     *                union across all staff assigned to the service.
     */
    public Mono<DailySlots> calculateDailySlots(int studioId, int serviceId, LocalDate date, Integer staffId) {
        if (date.isBefore(LocalDate.now())) {
            return Mono.just(DailySlots.empty(serviceId, date.toString(), 60));
        }
        return getServiceStaff(serviceId)
            .flatMap(allStaff -> {
                List<AvailableMaster> staffList = staffId == null
                    ? allStaff
                    : allStaff.stream().filter(s -> s.getId() == staffId.intValue()).collect(Collectors.toList());
                if (staffList.isEmpty()) {
                    return Mono.just(DailySlots.empty(serviceId, date.toString(), 60));
                }
                return Mono.zip(
                    getBusinessHours(studioId, date),
                    getAllStaffTimeOff(staffList, date),
                    getBookedAppointments(studioId, date),
                    getServiceInfo(serviceId)
                )
                // getStaffDetailsSync() blocks (WebClient .block()), which is illegal on
                // the Reactor event loop; hop to a bounded-elastic worker for the mapping.
                .publishOn(reactor.core.scheduler.Schedulers.boundedElastic())
                .map(tuple -> {
                    BusinessHoursResponse businessHours = tuple.getT1();
                    List<TimeOffResponse> timeOffs = tuple.getT2();
                    List<Appointment> appointments = tuple.getT3();
                    ServiceCatalogClient.ServiceInfo info = tuple.getT4();

                    int duration = info.getDurationMinutes() > 0 ? info.getDurationMinutes() : 60;
                    if (!businessHours.isOpenOn(date)) {
                        return DailySlots.empty(serviceId, date.toString(), duration);
                    }
                    int interval = info.getBookingInterval() > 0 ? info.getBookingInterval() : duration;
                    int padBefore = Math.max(0, info.getPaddingBefore());
                    int padAfter = Math.max(0, info.getPaddingAfter());
                    // Processing time: extra client-visit minutes AFTER the active work where
                    // the staff is free. The full visit must fit within opening hours, but the
                    // staff-busy interval (used for conflicts/padding) stays = active duration,
                    // so another booking may start during this appointment's processing tail.
                    int visitTotal = duration + Math.max(0, info.getProcessingDuring()) + Math.max(0, info.getProcessingAfter());

                    TreeSet<LocalTime> slots = new TreeSet<>();
                    for (AvailableMaster staff : staffList) {
                        addStaffSlots(slots, staff, date, businessHours, timeOffs, appointments,
                                      duration, visitTotal, interval, padBefore, padAfter);
                    }
                    List<String> formatted = slots.stream().map(HHMM::format).collect(Collectors.toList());
                    log.debug("Slots for service {} on {} (staff {}): {} slots", serviceId, date, staffId, formatted.size());
                    return new DailySlots(serviceId, date.toString(), duration, formatted);
                });
            })
            .onErrorResume(e -> {
                log.warn("Error computing daily slots for service {} on {}: {}", serviceId, date, e.getMessage());
                return Mono.just(DailySlots.empty(serviceId, date.toString(), 60));
            });
    }

    /**
     * Add every free start time for one staff member on {@code date} to {@code out}.
     * A candidate slot [start, start+duration] is rejected if its padded window
     * [start-padBefore, start+duration+padAfter] overlaps any existing appointment,
     * if it falls in the past (today), or if it runs past the effective window.
     */
    private void addStaffSlots(TreeSet<LocalTime> out, AvailableMaster staff, LocalDate date,
            BusinessHoursResponse businessHours, List<TimeOffResponse> timeOffs,
            List<Appointment> appointments, int duration, int visitTotal, int interval, int padBefore, int padAfter) {

        StaffResponse sd = getStaffDetailsSync(staff.getId());
        if (sd == null) return;
        DayOfWeek dow = date.getDayOfWeek();
        if (!sd.isWorkingOn(dow)) return;
        for (TimeOffResponse t : timeOffs) {
            if (t.conflictsWith(staff.getId(), date)) return; // full-day block
        }
        LocalTime staffStart = sd.getWorkingStartTime(dow);
        LocalTime staffEnd = sd.getWorkingEndTime(dow);
        if (staffStart == null || staffEnd == null) return;

        LocalTime effStart = businessHours.getStartTime().isAfter(staffStart) ? businessHours.getStartTime() : staffStart;
        LocalTime effEnd = businessHours.getEndTime().isBefore(staffEnd) ? businessHours.getEndTime() : staffEnd;
        if (!effStart.isBefore(effEnd)) return;

        List<Appointment> busy = appointments.stream()
            .filter(a -> a.getStaffId() == staff.getId()
                    && date.equals(a.getAppointmentDate())
                    && a.getStatus() != null && !"CANCELLED".equalsIgnoreCase(a.getStatus())
                    && a.getStartTime() != null && a.getEndTime() != null)
            .collect(Collectors.toList());

        boolean isToday = date.equals(LocalDate.now());
        LocalTime now = LocalTime.now();
        int step = interval > 0 ? interval : (duration > 0 ? duration : 60);

        // Full client visit (active + processing) must fit inside opening hours…
        for (LocalTime t = effStart; !t.plusMinutes(visitTotal).isAfter(effEnd); t = t.plusMinutes(step)) {
            if (isToday && t.isBefore(now)) continue;
            // …but the staff is only occupied for the active `duration` (+ padding),
            // so conflicts/padding are checked against that shorter busy window.
            LocalTime blockStart = minusClamped(t, padBefore);
            LocalTime blockEnd = plusClamped(t.plusMinutes(duration), padAfter);
            boolean conflict = false;
            for (Appointment a : busy) {
                if (blockStart.isBefore(a.getEndTime()) && a.getStartTime().isBefore(blockEnd)) {
                    conflict = true;
                    break;
                }
            }
            if (!conflict) out.add(t);
        }
    }

    private static LocalTime minusClamped(LocalTime t, int minutes) {
        if (minutes <= 0) return t;
        long s = t.toSecondOfDay() - minutes * 60L;
        return s <= 0 ? LocalTime.MIN : LocalTime.ofSecondOfDay(s);
    }

    private static LocalTime plusClamped(LocalTime t, int minutes) {
        if (minutes <= 0) return t;
        long s = t.toSecondOfDay() + minutes * 60L;
        return s >= 86400 ? LocalTime.MAX : LocalTime.ofSecondOfDay(s);
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
                          !apt.getStatus().equals("CANCELLED"))
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
                    String name = staff.getName() != null ? staff.getName() : "Staff " + staff.getId();
                    master.setName(name);
                    master.setAvatarUrl(null);
                    master.setInitials(name.substring(0, Math.min(2, name.length())).toUpperCase());
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
                            String name = staff.getName() != null ? staff.getName() : "Staff " + staff.getId();
                            master.setName(name);
                            master.setAvatarUrl(null);
                            master.setInitials(name.substring(0, Math.min(2, name.length())).toUpperCase());
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