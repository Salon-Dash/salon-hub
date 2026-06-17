package com.booksy.staff.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record StaffDto(
        Long id,
        Long businessId,
        String name,
        String email,
        String phone,
        String position,
        String avatarUrl,
        Map<DayOfWeek, LocalTime> workingHoursStart,
        Map<DayOfWeek, LocalTime> workingHoursEnd
) {
}
