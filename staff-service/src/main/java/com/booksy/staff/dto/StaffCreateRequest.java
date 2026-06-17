package com.booksy.staff.dto;

import java.util.Map;

/**
 * Request DTO for creating or updating a staff member.
 *
 * <p>The {@code schedule} map uses DayOfWeek names as keys (e.g. "MONDAY") and a two-element
 * String array where index 0 is the start time and index 1 is the end time (both "HH:mm").</p>
 *
 * <p>Example:</p>
 * <pre>
 * {
 *   "businessId": 1,
 *   "name": "Alice",
 *   "schedule": {
 *     "MONDAY": ["09:00", "17:00"],
 *     "WEDNESDAY": ["10:00", "18:00"]
 *   }
 * }
 * </pre>
 */
public record StaffCreateRequest(
        Long businessId,
        String name,
        String email,
        String phone,
        String position,
        String avatarUrl,
        Map<String, String[]> schedule
) {
}
