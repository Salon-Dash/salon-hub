package com.booksy.timeoff.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record TimeOffItemDto(
    Long id,
    Long businessId,
    Long staffId,
    String staffName,
    LocalDate startDate,
    LocalDate endDate,
    LocalTime startTime,
    LocalTime endTime,
    @JsonProperty("isFullDay") boolean isFullDay,
    @JsonProperty("isRecurring") boolean isRecurring,
    String recurrencePattern,
    LocalDate recurrenceEndDate,
    String reason,
    @JsonProperty("isApproved") boolean isApproved,
    boolean needsManagerApproval,
    Long approvedBy,
    LocalDateTime approvedAt
) {}
