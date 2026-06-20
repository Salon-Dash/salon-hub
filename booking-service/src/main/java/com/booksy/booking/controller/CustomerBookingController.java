package com.booksy.booking.controller;

import com.booksy.booking.model.Appointment;
import com.booksy.booking.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Endpoints for the customer mobile app.
 * All routes under /api/customer/** require a valid CUSTOMER JWT.
 */
@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
@Slf4j
public class CustomerBookingController {

    private final AppointmentRepository appointmentRepository;
    private final JdbcTemplate jdbcTemplate;

    /**
     * GET /api/customer/bookings
     * Returns all bookings for the authenticated customer (identified by JWT subject = email).
     */
    @GetMapping("/bookings")
    public ResponseEntity<List<Map<String, Object>>> getMyBookings(Authentication auth) {
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String email = auth.getName();
        log.info("GET /api/customer/bookings for {}", email);

        List<Appointment> appts = appointmentRepository
                .findByClientEmailOrderByAppointmentDateDescStartTimeDesc(email);

        List<Map<String, Object>> result = new ArrayList<>();
        for (Appointment a : appts) {
            Map<String, Object> row = new HashMap<>();
            row.put("id",              a.getId());
            row.put("businessId",      a.getBusinessId());
            row.put("serviceId",       a.getServiceId());
            row.put("staffId",         a.getStaffId());
            row.put("serviceName",     a.getServiceName() != null ? a.getServiceName() : "");
            row.put("appointmentDate", a.getAppointmentDate() != null ? a.getAppointmentDate().toString() : "");
            row.put("startTime",       a.getStartTime() != null ? a.getStartTime().toString() : "");
            row.put("endTime",         a.getEndTime()   != null ? a.getEndTime().toString()   : "");
            row.put("status",          a.getStatus());
            row.put("price",           a.getPrice() != null ? a.getPrice() : 0);
            row.put("clientName",      a.getClientName() != null ? a.getClientName() : "");
            row.put("clientEmail",     a.getClientEmail() != null ? a.getClientEmail() : email);
            result.add(row);
        }

        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/customer/bookings
     * Create a booking for the authenticated customer. Saves clientEmail from JWT.
     */
    @PostMapping("/bookings")
    public ResponseEntity<Map<String, Object>> createMyBooking(
            Authentication auth,
            @RequestBody Map<String, Object> body) {
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String email = auth.getName();

        Appointment appt = new Appointment();
        appt.setBusinessId(Integer.parseInt(body.getOrDefault("businessId", 0).toString()));
        appt.setServiceId(Integer.parseInt(body.getOrDefault("serviceId", 0).toString()));
        appt.setStaffId(body.get("staffId") != null ? Integer.parseInt(body.get("staffId").toString()) : 0);
        appt.setClientEmail(email);
        appt.setClientName(body.getOrDefault("clientName", email).toString());
        appt.setStatus("CONFIRMED");
        if (body.get("appointmentDate") != null)
            appt.setAppointmentDate(java.time.LocalDate.parse(body.get("appointmentDate").toString()));
        if (body.get("startTime") != null) {
            String t = body.get("startTime").toString();
            appt.setStartTime(java.time.LocalTime.parse(t.length() >= 5 ? t.substring(0, 5) : t));
        }
        if (body.get("endTime") != null) {
            String t = body.get("endTime").toString();
            appt.setEndTime(java.time.LocalTime.parse(t.length() >= 5 ? t.substring(0, 5) : t));
        }

        // Double-booking check
        if (appt.getStaffId() > 0 && appt.getAppointmentDate() != null && appt.getStartTime() != null && appt.getEndTime() != null) {
            Integer conflicts = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM appointments WHERE staff_id = ? AND appointment_date = ? AND status != 'CANCELLED' AND start_time < ? AND end_time > ?",
                    Integer.class, appt.getStaffId(), appt.getAppointmentDate(), appt.getEndTime(), appt.getStartTime());
            if (conflicts != null && conflicts > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "This time slot is already booked");
            }
        }

        // Fetch service name and price from services table
        try {
            Map<String, Object> svc = jdbcTemplate.queryForMap(
                    "SELECT name, price FROM services WHERE id = ? AND business_id = ?",
                    appt.getServiceId(), appt.getBusinessId());
            appt.setServiceName((String) svc.get("name"));
            Object price = svc.get("price");
            if (price instanceof BigDecimal) appt.setPrice((BigDecimal) price);
        } catch (Exception ignored) {
            // Service not found — proceed without name/price rather than failing the booking
        }

        Appointment saved = appointmentRepository.save(appt);
        log.info("Customer booking created id={} for {}", saved.getId(), email);

        Map<String, Object> resp = new HashMap<>();
        resp.put("id",              saved.getId());
        resp.put("businessId",      saved.getBusinessId());
        resp.put("serviceId",       saved.getServiceId());
        resp.put("appointmentDate", saved.getAppointmentDate() != null ? saved.getAppointmentDate().toString() : "");
        resp.put("startTime",       saved.getStartTime() != null ? saved.getStartTime().toString() : "");
        resp.put("endTime",         saved.getEndTime()   != null ? saved.getEndTime().toString()   : "");
        resp.put("status",          saved.getStatus());
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }
}
