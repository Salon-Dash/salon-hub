package com.booksy.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessHoursResponse {
    private int businessId;
    private LocalTime startTime;
    private LocalTime endTime;
    private Set<DayOfWeek> openDays;

    public boolean isOpenOn(LocalDate date) {
        return openDays != null && openDays.contains(date.getDayOfWeek());
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    // Add setters
    public void setBusinessId(int businessId) {
        this.businessId = businessId;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public void setOpenDays(Set<DayOfWeek> openDays) {
        this.openDays = openDays;
    }

    public static BusinessHoursResponse createDefault(int businessId, LocalDate date) {
        // Default: 9 AM - 5 PM, Monday-Friday
        BusinessHoursResponse response = new BusinessHoursResponse();
        response.setBusinessId(businessId);
        response.setStartTime(LocalTime.of(9, 0));
        response.setEndTime(LocalTime.of(17, 0));
        response.setOpenDays(Set.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                   DayOfWeek.THURSDAY, DayOfWeek.FRIDAY));
        return response;
    }
}