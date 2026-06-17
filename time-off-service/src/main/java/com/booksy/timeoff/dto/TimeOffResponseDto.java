package com.booksy.timeoff.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.time.LocalTime;

public record TimeOffResponseDto(
    int staffId,
    LocalDate startDate,
    LocalDate endDate,
    LocalTime startTime,
    LocalTime endTime,
    @JsonProperty("isFullDay") boolean isFullDay
) {}
