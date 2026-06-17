package com.booksy.timeoff.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record CreateTimeOffRequest(
    Long businessId,
    Long staffId,
    LocalDate startDate,
    LocalDate endDate,
    LocalTime startTime,
    LocalTime endTime,
    boolean isFullDay,
    String reason,
    boolean isRecurring,
    String recurrencePattern,
    LocalDate recurrenceEndDate
) {}
