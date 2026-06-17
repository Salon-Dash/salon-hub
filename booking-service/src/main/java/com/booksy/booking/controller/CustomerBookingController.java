package com.booksy.booking.controller;

import com.booksy.booking.model.Appointment;
import com.booksy.booking.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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

    /**
     * GET /api/customer/bookings
     * Returns all bookings for the authenticated customer (identified by JWT subject = email).
     */
    @GetMapping("/bookings")
    public ResponseEntity<List<Map<String, Object>>> getMyBookings(Authentication auth) {
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String email = auth.getName(); // JWT subject = customer email
        log.info("GET /api/customer/bookings for {}", email);

        List<Appointment> appts = appointmentRepository
                .findByClientEmailOrderByAppointmentDateDescStartTimeDesc(email);

        List<Map<String, Object>> result = appts.stream().map(a -> Map.<String, Object>of(
                "id",              a.getId(),
                "businessId",      a.getBusinessId(),
                "serviceId",       a.getServiceId(),
                "staffId",         a.getStaffId(),
                "serviceName",     a.getServiceName() != null ? a.getServiceName() : "",
                "appointmentDate", a.getAppointmentDate().toString(),
                "startTime",       a.getStartTime() != null ? a.getStartTime().toString() : "",
                "endTime",         a.getEndTime()   != null ? a.getEndTime().toString()   : "",
                "status",          a.getStatus(),
                "price",           a.getPrice() != null ? a.getPrice() : 0,
                "clientName",      a.getClientName() != null ? a.getClientName() : "",
                "clientEmail",     a.getClientEmail() != null ? a.getClientEmail() : email
        )).toList();

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
        appt.setClientName((String) body.getOrDefault("clientName", email));
        appt.setStatus("CONFIRMED");
        if (body.get("appointmentDate") != null)
            appt.setAppointmentDate(java.time.LocalDate.parse(body.get("appointmentDate").toString()));
        if (body.get("startTime") != null)
            appt.setStartTime(java.time.LocalTime.parse(body.get("startTime").toString().substring(0, 5)));
        if (body.get("endTime") != null)
            appt.setEndTime(java.time.LocalTime.parse(body.get("endTime").toString().substring(0, 5)));

        Appointment saved = appointmentRepository.save(appt);
        log.info("Customer booking created id={} for {}", saved.getId(), email);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id",              saved.getId(),
                "businessId",      saved.getBusinessId(),
                "serviceId",       saved.getServiceId(),
                "appointmentDate", saved.getAppointmentDate().toString(),
                "startTime",       saved.getStartTime().toString(),
                "endTime",         saved.getEndTime().toString(),
                "status",          saved.getStatus()
        ));
    }
}
