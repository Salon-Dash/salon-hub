package com.booksy.hours.controller;

import com.booksy.hours.dto.BusinessHoursItemDto;
import com.booksy.hours.dto.BusinessHoursRangeDto;
import com.booksy.hours.service.BusinessHoursService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/business-hours")
@RequiredArgsConstructor
@Slf4j
public class BusinessHoursController {

    private final BusinessHoursService businessHoursService;

    /**
     * GET /api/business-hours/business/{businessId}
     * Returns the full weekly schedule for the admin dashboard.
     */
    @GetMapping("/business/{businessId}")
    public List<BusinessHoursItemDto> getByBusiness(@PathVariable Long businessId) {
        log.debug("GET business hours for businessId={}", businessId);
        return businessHoursService.getByBusiness(businessId);
    }

    /**
     * GET /api/business-hours/business/{businessId}/date/{date}
     * Returns the range DTO consumed by booking-service's BusinessHoursClient.
     */
    @GetMapping("/business/{businessId}/date/{date}")
    public BusinessHoursRangeDto getForDate(
            @PathVariable Long businessId,
            @PathVariable String date) {
        log.debug("GET business hours for businessId={} date={}", businessId, date);
        LocalDate localDate = LocalDate.parse(date);
        return businessHoursService.getForDate(businessId, localDate);
    }

    /**
     * PUT /api/business-hours/business/{businessId}
     * Bulk upsert — salon owner saves their weekly schedule.
     */
    @PutMapping("/business/{businessId}")
    public List<BusinessHoursItemDto> bulkUpsert(
            @PathVariable Long businessId,
            @RequestBody List<BusinessHoursItemDto> items) {
        log.debug("PUT bulk upsert business hours for businessId={}, {} items", businessId, items.size());
        return businessHoursService.bulkUpsert(businessId, items);
    }

    /**
     * POST /api/business-hours/business/{businessId}/initialize
     * Creates a default 7-day schedule if rows are missing.
     */
    @PostMapping("/business/{businessId}/initialize")
    public List<BusinessHoursItemDto> initialize(@PathVariable Long businessId) {
        log.debug("POST initialize business hours for businessId={}", businessId);
        return businessHoursService.initializeDefaults(businessId);
    }
}
