package com.booksy.staff.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Date;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * ShiftController — handles /api/shifts/** routed here from the gateway.
 *
 * Shifts are staff-level schedule overrides (different from recurring working hours).
 * They live in the shifts table added by V2 migration.
 */
@RestController
@RequestMapping("/api/shifts")
@RequiredArgsConstructor
@Slf4j
public class ShiftController {

    private final JdbcTemplate jdbc;

    /** GET /api/shifts/business/{businessId}/date/{date} */
    @GetMapping("/business/{businessId}/date/{date}")
    public List<Map<String, Object>> getShiftsByBusinessAndDate(
            @PathVariable Long businessId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        log.debug("GET /api/shifts/business/{}/date/{}", businessId, date);
        return jdbc.queryForList(
                "SELECT s.id, s.business_id, s.staff_id, st.name AS staff_name, " +
                "s.shift_date, s.start_time, s.end_time, s.notes " +
                "FROM shifts s LEFT JOIN staff st ON st.id = s.staff_id " +
                "WHERE s.business_id = ? AND s.shift_date = ? ORDER BY s.start_time",
                businessId, date);
    }

    /** GET /api/shifts/staff/{staffId}/date/{date} */
    @GetMapping("/staff/{staffId}/date/{date}")
    public List<Map<String, Object>> getShiftsByStaffAndDate(
            @PathVariable Long staffId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        log.debug("GET /api/shifts/staff/{}/date/{}", staffId, date);
        return jdbc.queryForList(
                "SELECT s.id, s.business_id, s.staff_id, st.name AS staff_name, " +
                "s.shift_date, s.start_time, s.end_time, s.notes " +
                "FROM shifts s LEFT JOIN staff st ON st.id = s.staff_id " +
                "WHERE s.staff_id = ? AND s.shift_date = ? ORDER BY s.start_time",
                staffId, date);
    }

    /** POST /api/shifts/business/{businessId} */
    @PostMapping("/business/{businessId}")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createShift(
            @PathVariable Long businessId,
            @RequestBody Map<String, Object> body) {
        if (body.get("staffId") == null) throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "staffId is required");
        Long staffId = Long.parseLong(body.get("staffId").toString());
        Object dateVal = body.containsKey("shiftDate") ? body.get("shiftDate") : body.get("date");
        if (dateVal == null) throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "shiftDate is required");
        LocalDate shiftDate = LocalDate.parse(dateVal.toString());
        if (body.get("startTime") == null || body.get("endTime") == null)
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "startTime and endTime are required");
        String startTime = body.get("startTime").toString();
        String endTime = body.get("endTime").toString();
        String notes = body.containsKey("notes") ? (String) body.get("notes") : null;

        // The path businessId is owner-verified by the tenant filter; make sure the
        // staff member actually belongs to it so a shift can't be created against
        // another tenant's staff.
        Long staffBusinessId = jdbc.query("SELECT business_id FROM staff WHERE id = ?",
                rs -> rs.next() ? rs.getLong(1) : null, staffId);
        if (staffBusinessId != null && !staffBusinessId.equals(businessId))
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "Staff does not belong to business " + businessId);

        Long id = jdbc.queryForObject(
                "INSERT INTO shifts (business_id, staff_id, shift_date, start_time, end_time, notes, created_at, updated_at) " +
                "VALUES (?, ?, ?, ?::time, ?::time, ?, NOW(), NOW()) RETURNING id",
                Long.class,
                businessId, staffId, Date.valueOf(shiftDate), startTime, endTime, notes);

        return fetchShiftById(id);
    }

    /** PUT /api/shifts/{id}/business/{businessId} */
    @PutMapping("/{id}/business/{businessId}")
    public Map<String, Object> updateShift(
            @PathVariable Long id,
            @PathVariable Long businessId,
            @RequestBody Map<String, Object> body) {
        int rows = jdbc.update(
                "UPDATE shifts SET " +
                "shift_date = COALESCE(?::date, shift_date), " +
                "start_time = COALESCE(?::time, start_time), " +
                "end_time   = COALESCE(?::time, end_time), " +
                "notes      = COALESCE(?, notes), " +
                "updated_at = NOW() " +
                "WHERE id = ? AND business_id = ?",
                body.getOrDefault("shiftDate", null) != null ? body.get("shiftDate").toString() : null,
                body.getOrDefault("startTime", null) != null ? body.get("startTime").toString() : null,
                body.getOrDefault("endTime", null) != null ? body.get("endTime").toString() : null,
                body.getOrDefault("notes", null),
                id, businessId);

        if (rows == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Shift not found: " + id);
        }
        return fetchShiftById(id);
    }

    /** DELETE /api/shifts/{id}/business/{businessId} */
    @DeleteMapping("/{id}/business/{businessId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteShift(@PathVariable Long id, @PathVariable Long businessId) {
        int rows = jdbc.update("DELETE FROM shifts WHERE id = ? AND business_id = ?", id, businessId);
        if (rows == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Shift not found: " + id);
        }
    }

    private Map<String, Object> fetchShiftById(Long id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT s.id, s.business_id, s.staff_id, st.name AS staff_name, " +
                "s.shift_date, s.start_time, s.end_time, s.notes " +
                "FROM shifts s LEFT JOIN staff st ON st.id = s.staff_id WHERE s.id = ?", id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Shift not found: " + id);
        return rows.get(0);
    }
}
