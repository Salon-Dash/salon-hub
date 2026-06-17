package com.booksy.hours.dto;

import java.util.Set;

/**
 * DTO returned to booking-service: the range (startTime/endTime) and open days for a business.
 * Field names match what BookingService's BusinessHoursResponse deserializes.
 */
public record BusinessHoursRangeDto(
        int businessId,
        String startTime,
        String endTime,
        Set<String> openDays
) {
}
