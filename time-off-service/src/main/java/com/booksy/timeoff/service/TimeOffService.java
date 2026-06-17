package com.booksy.timeoff.service;

import com.booksy.timeoff.dto.*;
import com.booksy.timeoff.model.TimeOff;
import com.booksy.timeoff.repository.TimeOffRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TimeOffService {

    private final TimeOffRepository repository;

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
