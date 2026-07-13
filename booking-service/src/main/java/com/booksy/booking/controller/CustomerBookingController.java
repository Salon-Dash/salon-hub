package com.booksy.booking.controller;

import com.booksy.booking.model.Appointment;
import com.booksy.booking.repository.AppointmentRepository;
import com.booksy.booking.service.NotificationClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
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
 *
 * Time handling: appointments store naive salon wall-clock (LocalDate/LocalTime).
 * The container runs TZ=Europe/Warsaw so now() matches the salon, and both
 * create + reschedule reject past times server-side.
 */
@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
@Slf4j
public class CustomerBookingController {

    private final AppointmentRepository appointmentRepository;
    private final JdbcTemplate jdbcTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationClient notificationClient;

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

        // Reject bookings in the past. now() is the salon wall-clock (container
        // TZ=Europe/Warsaw), so this holds even for direct API calls that bypass
        // the app's slot list (which already hides past times).
        if (appt.getAppointmentDate() != null && appt.getStartTime() != null) {
            java.time.LocalDateTime when = java.time.LocalDateTime.of(appt.getAppointmentDate(), appt.getStartTime());
            if (when.isBefore(java.time.LocalDateTime.now())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot book a time in the past");
            }
        }

        // "No preference": the app promises auto-assignment but sends no staffId.
        // Resolve a concrete, least-busy eligible staff member here — storing 0
        // would make the appointment belong to no staff column and vanish from the
        // admin calendar (the actual bug a customer hit). Eligible = assigned to the
        // service, active, working that weekday over the whole slot, and free.
        if (appt.getStaffId() <= 0 && appt.getAppointmentDate() != null
                && appt.getStartTime() != null && appt.getEndTime() != null) {
            String weekday = appt.getAppointmentDate().getDayOfWeek().name(); // MONDAY..SUNDAY
            Integer chosen;
            try {
                chosen = jdbcTemplate.queryForObject(
                        "SELECT s.id FROM staff s " +
                        "JOIN service_staff_assignments ssa ON ssa.staff_id = s.id AND ssa.service_id = ? " +
                        "JOIN staff_working_hours wh ON wh.staff_id = s.id AND wh.day_of_week = ? AND wh.is_working = true " +
                        "WHERE s.business_id = ? AND s.is_active = true " +
                        "AND wh.start_time <= ? AND wh.end_time >= ? " +
                        "AND NOT EXISTS (SELECT 1 FROM appointments c WHERE c.staff_id = s.id " +
                        "  AND c.appointment_date = ? AND c.status <> 'CANCELLED' " +
                        "  AND c.start_time < ? AND c.end_time > ?) " +
                        "ORDER BY (SELECT COUNT(*) FROM appointments a WHERE a.staff_id = s.id " +
                        "  AND a.appointment_date = ? AND a.status <> 'CANCELLED') ASC, s.id ASC " +
                        "LIMIT 1",
                        Integer.class,
                        appt.getServiceId(), weekday, appt.getBusinessId(),
                        appt.getStartTime(), appt.getEndTime(),
                        appt.getAppointmentDate(), appt.getEndTime(), appt.getStartTime(),
                        appt.getAppointmentDate());
            } catch (org.springframework.dao.EmptyResultDataAccessException e) {
                chosen = null;
            }
            if (chosen == null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "No staff is available for this time. Please pick another slot.");
            }
            appt.setStaffId(chosen);
            log.info("Auto-assigned staff {} for no-preference booking (service {}, {} {})",
                    chosen, appt.getServiceId(), appt.getAppointmentDate(), appt.getStartTime());
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

        // The COUNT check above is a fast-path only (TOCTOU under concurrency). The
        // real guard is the DB exclusion constraint (V4__no_double_booking_constraint):
        // a racing booking for the same slot trips it here — surface as 409, not 500.
        Appointment saved;
        try {
            saved = appointmentRepository.save(appt);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This time slot is already booked");
        }
        log.info("Customer booking created id={} for {}", saved.getId(), email);
        broadcast(saved); // push to the dashboard's live calendar (same topic admin bookings use)
        notifyCustomer(saved, false); // email/notify the same way admin-created bookings do

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

    /**
     * POST /api/customer/bookings/{id}/cancel
     * Cancel a booking that belongs to the authenticated customer. Ownership is
     * enforced by matching the appointment's clientEmail to the JWT subject, so a
     * customer can never cancel someone else's booking.
     */
    @PostMapping("/bookings/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancelMyBooking(
            Authentication auth,
            @PathVariable Long id) {
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String email = auth.getName();

        Appointment appt = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (appt.getClientEmail() == null || !appt.getClientEmail().equalsIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This booking does not belong to you");
        }

        appt.setStatus("CANCELLED");
        Appointment saved = appointmentRepository.save(appt);
        log.info("Customer booking id={} cancelled by {}", saved.getId(), email);
        broadcast(saved); // let the dashboard drop it from the live calendar in realtime
        notifyCustomer(saved, true);

        Map<String, Object> resp = new HashMap<>();
        resp.put("id",     saved.getId());
        resp.put("status", saved.getStatus());
        return ResponseEntity.ok(resp);
    }

    /**
     * PUT /api/customer/bookings/{id}
     * Reschedule the authenticated customer's own booking to a new date/time.
     * Business/service/staff stay the same; only the slot moves. Ownership is
     * enforced by clientEmail, and the slot is conflict-checked (excluding this
     * appointment itself).
     */
    @PutMapping("/bookings/{id}")
    public ResponseEntity<Map<String, Object>> rescheduleMyBooking(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String email = auth.getName();

        Appointment appt = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (appt.getClientEmail() == null || !appt.getClientEmail().equalsIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This booking does not belong to you");
        }

        java.time.LocalDate newDate = body.get("appointmentDate") != null
                ? java.time.LocalDate.parse(body.get("appointmentDate").toString())
                : appt.getAppointmentDate();
        java.time.LocalTime newStart = appt.getStartTime();
        java.time.LocalTime newEnd = appt.getEndTime();
        if (body.get("startTime") != null) {
            String t = body.get("startTime").toString();
            newStart = java.time.LocalTime.parse(t.length() >= 5 ? t.substring(0, 5) : t);
        }
        if (body.get("endTime") != null) {
            String t = body.get("endTime").toString();
            newEnd = java.time.LocalTime.parse(t.length() >= 5 ? t.substring(0, 5) : t);
        }

        // Reject rescheduling into the past (salon wall-clock via container TZ).
        if (newDate != null && newStart != null) {
            java.time.LocalDateTime when = java.time.LocalDateTime.of(newDate, newStart);
            if (when.isBefore(java.time.LocalDateTime.now())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot reschedule to a time in the past");
            }
        }

        // Conflict check — exclude THIS appointment so moving within its own window is fine.
        if (appt.getStaffId() > 0 && newDate != null && newStart != null && newEnd != null) {
            Integer conflicts = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM appointments WHERE staff_id = ? AND appointment_date = ? AND status != 'CANCELLED' AND id <> ? AND start_time < ? AND end_time > ?",
                    Integer.class, appt.getStaffId(), newDate, id, newEnd, newStart);
            if (conflicts != null && conflicts > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "This time slot is already booked");
            }
        }

        appt.setAppointmentDate(newDate);
        appt.setStartTime(newStart);
        appt.setEndTime(newEnd);
        appt.setStatus("CONFIRMED");
        Appointment saved;
        try {
            saved = appointmentRepository.save(appt);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This time slot is already booked");
        }
        log.info("Customer booking id={} rescheduled by {}", saved.getId(), email);
        broadcast(saved);
        notifyCustomer(saved, false); // re-confirm at the new time

        Map<String, Object> resp = new HashMap<>();
        resp.put("id",              saved.getId());
        resp.put("appointmentDate", saved.getAppointmentDate() != null ? saved.getAppointmentDate().toString() : "");
        resp.put("startTime",       saved.getStartTime() != null ? saved.getStartTime().toString() : "");
        resp.put("endTime",         saved.getEndTime()   != null ? saved.getEndTime().toString()   : "");
        resp.put("status",          saved.getStatus());
        return ResponseEntity.ok(resp);
    }

    /**
     * Push an appointment change to the dashboard's live calendar over WebSocket,
     * using the same topics the admin BookingController publishes to, so a booking
     * made from the customer app appears without a manual refresh.
     */
    private void broadcast(Appointment appt) {
        if (appt == null) return;
        messagingTemplate.convertAndSend("/topic/appointments/" + appt.getBusinessId(), appt);
        messagingTemplate.convertAndSend(
                "/topic/appointments/" + appt.getBusinessId() + "/staff/" + appt.getStaffId(), appt);
    }

    /**
     * Fire the same booking notification the admin BookingController sends, so a
     * self-service booking made from the customer app also reaches the salon (and
     * the client). Fire-and-forget inside NotificationClient — a notification
     * failure never breaks the booking. staffName/businessName are left null and
     * resolved downstream, matching the admin path.
     */
    private void notifyCustomer(Appointment appt, boolean cancelled) {
        if (appt == null) return;
        if (cancelled) {
            notificationClient.notifyBookingCancelled(
                    appt.getId(), appt.getClientEmail(), appt.getClientName(), null,
                    appt.getServiceName(), null, null,
                    appt.getAppointmentDate(), appt.getStartTime(), appt.getEndTime(), appt.getPrice());
        } else {
            notificationClient.notifyBookingConfirmed(
                    appt.getId(), appt.getClientEmail(), appt.getClientName(), null,
                    appt.getServiceName(), null, null,
                    appt.getAppointmentDate(), appt.getStartTime(), appt.getEndTime(), appt.getPrice());
        }
    }
}
