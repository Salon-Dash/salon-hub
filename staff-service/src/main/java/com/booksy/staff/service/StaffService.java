package com.booksy.staff.service;

import com.booksy.staff.dto.StaffCreateRequest;
import com.booksy.staff.dto.StaffDto;
import com.booksy.staff.model.Staff;
import com.booksy.staff.model.StaffWorkingHours;
import com.booksy.staff.repository.StaffRepository;
import com.booksy.staff.repository.StaffWorkingHoursRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StaffService {

    private final StaffRepository staffRepository;
    private final StaffWorkingHoursRepository staffWorkingHoursRepository;

    /**
     * Fetch a single active staff member by ID, including their working hours.
     */
    @Transactional(readOnly = true)
    public StaffDto getById(Long id) {
        log.debug("Fetching staff with id={}", id);
        Staff staff = staffRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Staff not found with id: " + id));
        List<StaffWorkingHours> hours = staffWorkingHoursRepository.findByStaffId(id);
        return toDto(staff, hours);
    }

    /**
     * Return all active staff. If {@code businessId} is provided, filter by business.
     */
    @Transactional(readOnly = true)
    public List<StaffDto> getAllActive(Long businessId) {
        log.debug("Fetching all active staff, businessId={}", businessId);
        List<Staff> staffList = (businessId != null)
                ? staffRepository.findByBusinessIdAndIsActiveTrue(businessId)
                : staffRepository.findAll().stream()
                        .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                        .collect(Collectors.toList());

        if (staffList.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> ids = staffList.stream().map(Staff::getId).collect(Collectors.toList());
        List<StaffWorkingHours> allHours = staffWorkingHoursRepository.findByStaffIdIn(ids);

        Map<Long, List<StaffWorkingHours>> hoursByStaffId = allHours.stream()
                .collect(Collectors.groupingBy(StaffWorkingHours::getStaffId));

        return staffList.stream()
                .map(s -> toDto(s, hoursByStaffId.getOrDefault(s.getId(), Collections.emptyList())))
                .collect(Collectors.toList());
    }

    /**
     * Return all active staff belonging to a specific business.
     */
    @Transactional(readOnly = true)
    public List<StaffDto> getAllByBusiness(Long businessId) {
        log.debug("Fetching staff for businessId={}", businessId);
        List<Staff> staffList = staffRepository.findByBusinessIdAndIsActiveTrue(businessId);
        if (staffList.isEmpty()) {
            return Collections.emptyList();
        }
        List<Long> ids = staffList.stream().map(Staff::getId).collect(Collectors.toList());
        List<StaffWorkingHours> allHours = staffWorkingHoursRepository.findByStaffIdIn(ids);
        Map<Long, List<StaffWorkingHours>> hoursByStaffId = allHours.stream()
                .collect(Collectors.groupingBy(StaffWorkingHours::getStaffId));
        return staffList.stream()
                .map(s -> toDto(s, hoursByStaffId.getOrDefault(s.getId(), Collections.emptyList())))
                .collect(Collectors.toList());
    }

    /**
     * Create a new staff member with optional schedule.
     */
    @Transactional
    public StaffDto create(StaffCreateRequest request) {
        log.info("Creating staff member name='{}', businessId={}", request.name(), request.businessId());
        Staff staff = Staff.builder()
                .businessId(request.businessId())
                .name(request.name())
                .email(request.email())
                .phone(request.phone())
                .position(request.position())
                .avatarUrl(request.avatarUrl())
                .isActive(true)
                .build();
        staff = staffRepository.save(staff);

        List<StaffWorkingHours> hours = saveWorkingHours(staff.getId(), request.schedule());
        log.info("Created staff id={} with {} working hour entries", staff.getId(), hours.size());
        return toDto(staff, hours);
    }

    /**
     * Return the businessId stored for a given staff member.
     * Used by the controller to verify ownership before update/delete.
     */
    @Transactional(readOnly = true)
    public Long getBusinessIdForStaff(Long staffId) {
        return staffRepository.findById(staffId)
                .map(Staff::getBusinessId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Staff not found with id: " + staffId));
    }

    /**
     * Update an existing staff member and replace their schedule.
     * If both the stored businessId and the request businessId are present and differ,
     * the update is rejected to prevent cross-business data mutation.
     */
    @Transactional
    public StaffDto update(Long id, StaffCreateRequest request) {
        log.info("Updating staff id={}", id);
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Staff not found with id: " + id));

        // Ownership check: prevent moving a staff member to a different business
        if (staff.getBusinessId() != null && request.businessId() != null
                && !staff.getBusinessId().equals(request.businessId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Staff member does not belong to the specified business");
        }

        staff.setName(request.name());
        staff.setEmail(request.email());
        staff.setPhone(request.phone());
        staff.setPosition(request.position());
        staff.setAvatarUrl(request.avatarUrl());
        if (request.businessId() != null) {
            staff.setBusinessId(request.businessId());
        }
        staff = staffRepository.save(staff);

        // Replace working hours
        staffWorkingHoursRepository.deleteByStaffId(id);
        List<StaffWorkingHours> hours = saveWorkingHours(id, request.schedule());
        log.info("Updated staff id={} with {} working hour entries", id, hours.size());
        return toDto(staff, hours);
    }

    /**
     * Soft-delete a staff member by marking them inactive, then cancel their future appointments
     * in the booking-service (best-effort, fire-and-forget).
     */
    @Transactional
    public void deactivate(Long id) {
        log.info("Deactivating staff id={}", id);
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Staff not found with id: " + id));
        Long businessId = staff.getBusinessId();
        staff.setIsActive(false);
        staffRepository.save(staff);

        // Cancel future appointments for this staff member (best-effort, fire-and-forget).
        // The booking-service endpoint POST /api/bookings/business/{businessId}/cancel-staff/{staffId}
        // is expected to mark future appointments as CANCELLED.
        try {
            String url = "http://booking-service:8084/api/bookings/business/" + businessId
                    + "/cancel-staff/" + id;
            org.springframework.web.reactive.function.client.WebClient.create()
                    .post()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .subscribe(
                            v -> log.info("Cancelled future appointments for staff id={}", id),
                            err -> log.warn("Could not cancel future appointments for deleted staff {}: {}", id, err.getMessage()));
        } catch (Exception e) {
            log.warn("Could not cancel future appointments for deleted staff {}: {}", id, e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private List<StaffWorkingHours> saveWorkingHours(Long staffId, Map<String, String[]> schedule) {
        if (schedule == null || schedule.isEmpty()) {
            return Collections.emptyList();
        }
        List<StaffWorkingHours> toSave = new ArrayList<>();
        for (Map.Entry<String, String[]> entry : schedule.entrySet()) {
            String day = entry.getKey().toUpperCase();
            String[] times = entry.getValue();
            if (times == null || times.length < 2) {
                log.warn("Skipping invalid schedule entry for day={}", day);
                continue;
            }
            try {
                LocalTime start = LocalTime.parse(times[0]);
                LocalTime end = LocalTime.parse(times[1]);
                toSave.add(StaffWorkingHours.builder()
                        .staffId(staffId)
                        .dayOfWeek(day)
                        .startTime(start)
                        .endTime(end)
                        .isWorking(true)
                        .build());
            } catch (DateTimeParseException e) {
                log.warn("Skipping unparseable times for day={}: {}", day, e.getMessage());
            }
        }
        return staffWorkingHoursRepository.saveAll(toSave);
    }

    private StaffDto toDto(Staff staff, List<StaffWorkingHours> hours) {
        Map<DayOfWeek, LocalTime> startMap = new LinkedHashMap<>();
        Map<DayOfWeek, LocalTime> endMap = new LinkedHashMap<>();

        for (StaffWorkingHours h : hours) {
            if (Boolean.FALSE.equals(h.getIsWorking())) {
                continue;
            }
            try {
                DayOfWeek day = DayOfWeek.valueOf(h.getDayOfWeek().toUpperCase());
                startMap.put(day, h.getStartTime());
                endMap.put(day, h.getEndTime());
            } catch (IllegalArgumentException e) {
                log.warn("Unknown day_of_week value '{}' for staffId={}", h.getDayOfWeek(), staff.getId());
            }
        }

        return new StaffDto(
                staff.getId(),
                staff.getBusinessId(),
                staff.getName(),
                staff.getEmail(),
                staff.getPhone(),
                staff.getPosition(),
                staff.getAvatarUrl(),
                startMap.isEmpty() ? null : startMap,
                endMap.isEmpty() ? null : endMap
        );
    }
}
