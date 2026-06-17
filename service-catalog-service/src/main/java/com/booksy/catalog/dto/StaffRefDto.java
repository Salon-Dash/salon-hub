package com.booksy.catalog.dto;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Map;

public record StaffRefDto(
    int id,
    String name,
    Map<DayOfWeek, LocalTime> workingHoursStart,
    Map<DayOfWeek, LocalTime> workingHoursEnd
) {}
