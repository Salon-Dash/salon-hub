package com.booksy.timeoff.service;

import com.booksy.timeoff.dto.*;
import com.booksy.timeoff.model.TimeOff;
import com.booksy.timeoff.repository.TimeOffRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TimeOffService {

    private final TimeOffRepository repository;

    // Optional — only available when spring-boot-starter-jdbc is on the classpath.
    // Used for cross-table conflict checks against the shared appointments table.
    @Autowired(required = false)
    private JdbcTemplate jdbc;

    public List<TimeOffResponseDto> getByStaffAndDateRange(Long staffId, LocalDate start, LocalDate end) {
        return repository.findByStaffIdAndEndDateGreaterThanEqualAndStartDateLessThanEqual(staffId, start, end)
            .stream().map(this::toResponseDto).toList();
    }

    public List<TimeOffItemDto> getByBusiness(Long businessId) {
        return repository.findByBusinessId(businessId)
            .stream().map(this::toItemDto).toList();
    }

    public List<TimeOffItemDto> getByBusinessAndDate(Long businessId, LocalDate date) {
        return repository.findByBusinessIdAndDate(businessId, date)
            .stream().map(this::toItemDto).toList();
    }

    public List<TimeOffItemDto> getByBusinessStaffAndDate(Long businessId, Long staffId, LocalDate date) {
        return repository.findByBusinessIdAndStaffIdAndDate(businessId, staffId, date)
            .stream().map(this::toItemDto).toList();
    }

    @Transactional
    public TimeOffItemDto create(CreateTimeOffRequest req) {
        // Check for existing confirmed appointments that conflict with this time-off block.
        // Both services share the same booksy_platform database, so a direct JDBC query is safe.
        checkForAppointmentConflicts(req.staffId(), req.startDate(), req.endDate(),
                req.startTime(), req.endTime(), req.isFullDay());

        TimeOff t = new TimeOff();
        t.setBusinessId(req.businessId());
        t.setStaffId(req.staffId());
        t.setStartDate(req.startDate());
        t.setEndDate(req.endDate());
        t.setStartTime(req.startTime());
        t.setEndTime(req.endTime());
        t.setFullDay(req.isFullDay());
        t.setReason(req.reason());
        t.setRecurring(req.isRecurring());
        t.setRecurrencePattern(req.recurrencePattern());
        t.setRecurrenceEndDate(req.recurrenceEndDate());
        t.setApproved(true);
        return toItemDto(repository.save(t));
    }

    /**
     * Verifies that no non-cancelled appointments exist for the given staff member within the
     * proposed time-off window. Throws 409 CONFLICT if any overlap is found.
     *
     * <p>Both the time-off-service and the booking-service share the same {@code booksy_platform}
     * PostgreSQL database, so a direct JdbcTemplate query against the {@code appointments} table
     * is used instead of a cross-service HTTP call.</p>
     */
    private void checkForAppointmentConflicts(Long staffId,
                                               LocalDate startDate, LocalDate endDate,
                                               LocalTime startTime, LocalTime endTime,
                                               boolean fullDay) {
        if (jdbc == null || staffId == null || startDate == null || endDate == null) {
            return; // JdbcTemplate not available or insufficient data — skip check
        }

        Integer conflictCount;
        if (fullDay || startTime == null || endTime == null) {
            // Full-day block: any non-cancelled appointment on any day in the range conflicts
            conflictCount = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM appointments " +
                    "WHERE staff_id = ? " +
                    "  AND appointment_date BETWEEN ? AND ? " +
                    "  AND status NOT IN ('CANCELLED')",
                    Integer.class,
                    staffId, startDate, endDate);
            if (conflictCount != null && conflictCount > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Staff has " + conflictCount + " confirmed appointment(s) on the blocked day(s). " +
                        "Cancel them first.");
            }
        } else {
            // Partial-day block: check for appointments whose time window overlaps [startTime, endTime]
            conflictCount = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM appointments " +
                    "WHERE staff_id = ? " +
                    "  AND appointment_date BETWEEN ? AND ? " +
                    "  AND status NOT IN ('CANCELLED') " +
                    "  AND start_time < ? AND end_time > ?",
                    Integer.class,
                    staffId, startDate, endDate, endTime, startTime);
            if (conflictCount != null && conflictCount > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Staff has " + conflictCount + " confirmed appointment(s) during this time block. " +
                        "Cancel them first.");
            }
        }
        log.debug("No appointment conflicts found for staffId={} between {} and {}", staffId, startDate, endDate);
    }

    @Transactional
    public TimeOffItemDto update(Long id, CreateTimeOffRequest req) {
        TimeOff t = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Time-off not found: " + id));
        if (req.startDate() != null) t.setStartDate(req.startDate());
        if (req.endDate() != null) t.setEndDate(req.endDate());
        if (req.startTime() != null) t.setStartTime(req.startTime());
        if (req.endTime() != null) t.setEndTime(req.endTime());
        t.setFullDay(req.isFullDay());
        t.setRecurring(req.isRecurring());
        if (req.reason() != null) t.setReason(req.reason());
        if (req.recurrencePattern() != null) t.setRecurrencePattern(req.recurrencePattern());
        if (req.recurrenceEndDate() != null) t.setRecurrenceEndDate(req.recurrenceEndDate());
        return toItemDto(repository.save(t));
    }

    @Transactional
    public TimeOffItemDto approve(Long id, Long approvedBy) {
        TimeOff t = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Time-off not found: " + id));
        t.setApproved(true);
        t.setApprovedBy(approvedBy);
        t.setApprovedAt(LocalDateTime.now());
        return toItemDto(repository.save(t));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Time-off not found: " + id);
        }
        repository.deleteById(id);
    }

    private TimeOffResponseDto toResponseDto(TimeOff t) {
        return new TimeOffResponseDto(
            (int)(long) t.getStaffId(), t.getStartDate(), t.getEndDate(),
            t.getStartTime(), t.getEndTime(), t.isFullDay()
        );
    }

    private TimeOffItemDto toItemDto(TimeOff t) {
        return new TimeOffItemDto(
            t.getId(), t.getBusinessId(), t.getStaffId(), null,
            t.getStartDate(), t.getEndDate(), t.getStartTime(), t.getEndTime(),
            t.isFullDay(), t.isRecurring(), t.getRecurrencePattern(), t.getRecurrenceEndDate(),
            t.getReason(), t.isApproved(), t.isNeedsManagerApproval(), t.getApprovedBy(), t.getApprovedAt()
        );
    }
}
