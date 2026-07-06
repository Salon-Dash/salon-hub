package com.booksy.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Real bookable start times for a service on a single date.
 * Times are the salon's local wall-clock time in "HH:mm" (24h) — the same
 * representation appointments are stored in (Appointment.startTime is a LocalTime).
 * The customer app displays and re-sends these strings unchanged.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailySlots {
    private int serviceId;
    private String date;            // yyyy-MM-dd
    private int durationMinutes;
    private List<String> availableSlots; // e.g. ["09:00","09:15",...]

    public static DailySlots empty(int serviceId, String date, int durationMinutes) {
        return new DailySlots(serviceId, date, durationMinutes, List.of());
    }
}
