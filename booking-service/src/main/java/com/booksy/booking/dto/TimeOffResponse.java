package com.booksy.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TimeOffResponse {
    private int staffId;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalTime startTime; // null for full day
    private LocalTime endTime;   // null for full day
    private boolean isFullDay;

    public boolean conflictsWith(int staffId, LocalDate date) {
        if (this.staffId != staffId) return false;

        boolean dateInRange = !date.isBefore(startDate) && !date.isAfter(endDate);
        if (!dateInRange) return false;

        // Only block the whole day for full-day time-off
        return isFullDay || (startTime == null && endTime == null);
    }

    public boolean conflictsWithSlot(int staffId, LocalDate date, LocalTime slotStart, LocalTime slotEnd) {
        if (this.staffId != staffId) return false;

        boolean dateInRange = !date.isBefore(startDate) && !date.isAfter(endDate);
        if (!dateInRange) return false;

        if (isFullDay || (startTime == null && endTime == null)) return true;

        // Partial time-off: check if the slot overlaps with the time-off window
        LocalTime offStart = startTime != null ? startTime : LocalTime.MIN;
        LocalTime offEnd = endTime != null ? endTime : LocalTime.MAX;
        return slotStart.isBefore(offEnd) && slotEnd.isAfter(offStart);
    }
}