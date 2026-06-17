package com.booksy.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StaffResponse {
    private int id;
    private String name;
    private Map<DayOfWeek, LocalTime> workingHoursStart;
    private Map<DayOfWeek, LocalTime> workingHoursEnd;

    public boolean isWorkingOn(DayOfWeek dayOfWeek) {
        return workingHoursStart != null && workingHoursStart.containsKey(dayOfWeek);
    }

    public LocalTime getWorkingStartTime(DayOfWeek dayOfWeek) {
        return workingHoursStart != null ? workingHoursStart.get(dayOfWeek) : null;
    }

    public LocalTime getWorkingEndTime(DayOfWeek dayOfWeek) {
        return workingHoursEnd != null ? workingHoursEnd.get(dayOfWeek) : null;
    }

    // Add explicit getters for Lombok
    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    // Add setters
    public void setId(int id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setWorkingHoursStart(Map<DayOfWeek, LocalTime> workingHoursStart) {
        this.workingHoursStart = workingHoursStart;
    }

    public void setWorkingHoursEnd(Map<DayOfWeek, LocalTime> workingHoursEnd) {
        this.workingHoursEnd = workingHoursEnd;
    }
}