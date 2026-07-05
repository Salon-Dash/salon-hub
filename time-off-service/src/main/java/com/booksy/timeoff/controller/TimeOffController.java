package com.booksy.timeoff.controller;

import com.booksy.timeoff.dto.*;
import com.booksy.timeoff.service.TimeOffService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/time-off")
@RequiredArgsConstructor
public class TimeOffController {

    private final TimeOffService timeOffService;

    @GetMapping("/staff/{staffId}")
    public List<TimeOffResponseDto> getByStaff(
            @PathVariable Long staffId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now().plusDays(90);
        return timeOffService.getByStaffAndDateRange(staffId, start, end);
    }

    @GetMapping("/business/{businessId}")
    public List<TimeOffItemDto> getByBusiness(@PathVariable Long businessId) {
        return timeOffService.getByBusiness(businessId);
    }

    @GetMapping("/business/{businessId}/date/{date}")
    public List<TimeOffItemDto> getByBusinessAndDate(
            @PathVariable Long businessId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return timeOffService.getByBusinessAndDate(businessId, date);
    }

    @GetMapping("/business/{businessId}/staff/{staffId}/date/{date}")
    public List<TimeOffItemDto> getByBusinessStaffAndDate(
            @PathVariable Long businessId,
            @PathVariable Long staffId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return timeOffService.getByBusinessStaffAndDate(businessId, staffId, date);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TimeOffItemDto create(@RequestBody CreateTimeOffRequest request) {
        // Without a businessId the tenant filter can't resolve the target tenant and
        // skips its ownership check, letting a caller create time-off against another
        // business's staff. Require it so ownership is always enforced.
        if (request.businessId() == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.BAD_REQUEST, "businessId is required");
        }
        return timeOffService.create(request);
    }

    @PutMapping("/{id}")
    public TimeOffItemDto update(
            @PathVariable Long id,
            @RequestBody CreateTimeOffRequest request) {
        return timeOffService.update(id, request);
    }

    @PutMapping("/{id}/approve")
    public TimeOffItemDto approve(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") Long approvedBy) {
        return timeOffService.approve(id, approvedBy);
    }

    /** POST /api/time-off/{id}/approve — alias for PUT (frontend compatibility) */
    @PostMapping("/{id}/approve")
    public TimeOffItemDto approvePost(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") Long approvedBy) {
        return timeOffService.approve(id, approvedBy);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        timeOffService.delete(id);
    }
}
