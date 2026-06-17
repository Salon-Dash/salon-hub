package com.booksy.hours.dto;

/**
 * DTO for admin dashboard: represents a single day's schedule for a business.
 */
public record BusinessHoursItemDto(
        Long id,
        Long businessId,
        String dayOfWeek,
        boolean enabled,
        String startTime,
        String endTime
) {
}
