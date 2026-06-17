package com.booksy.booking.controller;

import com.booksy.booking.model.Appointment;
import com.booksy.booking.service.NotificationClient;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Time;
import java.sql.Timestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {
    private final SimpMessagingTemplate messagingTemplate;
    private final JdbcTemplate jdbcTemplate;
    private final NotificationClient notificationClient;
    private final RowMapper<Appointment> appointmentRowMapper = new RowMapper<>() {
        @Override
        public Appointment mapRow(ResultSet rs, int rowNum) throws SQLException {
            Appointment appointment = new Appointment();
            appointment.setId(rs.getLong("id"));
            appointment.setBusinessId(rs.getInt("business_id"));
            appointment.setStaffId(rs.getInt("staff_id"));
            appointment.setClientId(rs.getInt("client_id"));
            appointment.setServiceId(rs.getInt("service_id"));
            appointment.setAppointmentDate(rs.getDate("appointment_date").toLocalDate());
            appointment.setStartTime(rs.getTime("start_time").toLocalTime());
            appointment.setEndTime(rs.getTime("end_time").toLocalTime());
            appointment.setStatus(rs.getString("status"));
            appointment.setServiceName(rs.getString("service_name"));
            appointment.setClientName(rs.getString("client_name"));
            appointment.setPrice(rs.getBigDecimal("price"));
            return appointment;
        }
    };

    public BookingController(SimpMessagingTemplate messagingTemplate, JdbcTemplate jdbcTemplate,
                             NotificationClient notificationClient) {
        this.messagingTemplate = messagingTemplate;
        this.jdbcTemplate = jdbcTemplate;
        this.notificationClient = notificationClient;
    }

    @GetMapping("/business/{businessId}")
    public List<Appointment> getBookingsByBusiness(
            @PathVariable int businessId,
            @RequestParam(required = false) LocalDate date,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate) {
        LocalDate rangeStart = date != null ? date : startDate;
        LocalDate rangeEnd = date != null ? date : endDate;
        if (rangeStart != null && rangeEnd != null) {
            return jdbcTemplate.query(
                    "SELECT id, business_id, staff_id, COALESCE(client_id, 0) AS client_id, service_id, appointment_date, start_time, end_time, status " +
                            ", service_name, client_name, price " +
                            "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? ORDER BY appointment_date ASC, start_time ASC",
                    appointmentRowMapper,
                    businessId,
                    rangeStart,
                    rangeEnd
            );
        }
        return jdbcTemplate.query(
                "SELECT id, business_id, staff_id, COALESCE(client_id, 0) AS client_id, service_id, appointment_date, start_time, end_time, status " +
                        ", service_name, client_name, price " +
                        "FROM appointments WHERE business_id = ? ORDER BY appointment_date ASC, start_time ASC",
                appointmentRowMapper,
                businessId
        );
    }

    @GetMapping("/staff/{staffId}")
    public List<Appointment> getBookingsByStaff(
            @PathVariable int staffId,
            @RequestParam(required = false) LocalDate date,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate) {
        LocalDate rangeStart = date != null ? date : startDate;
        LocalDate rangeEnd = date != null ? date : endDate;
        if (rangeStart != null && rangeEnd != null) {
            return jdbcTemplate.query(
                    "SELECT id, business_id, staff_id, COALESCE(client_id, 0) AS client_id, service_id, appointment_date, start_time, end_time, status " +
                            ", service_name, client_name, price " +
                            "FROM appointments WHERE staff_id = ? AND appointment_date BETWEEN ? AND ? ORDER BY appointment_date ASC, start_time ASC",
                    appointmentRowMapper,
                    staffId,
                    rangeStart,
                    rangeEnd
            );
        }
        return jdbcTemplate.query(
                "SELECT id, business_id, staff_id, COALESCE(client_id, 0) AS client_id, service_id, appointment_date, start_time, end_time, status " +
                        ", service_name, client_name, price " +
                        "FROM appointments WHERE staff_id = ? ORDER BY appointment_date ASC, start_time ASC",
                appointmentRowMapper,
                staffId
        );
    }

    @GetMapping
    public List<Appointment> getAllBookings(
            @RequestParam(required = true) Integer businessId,
            @RequestParam(required = false) Integer staffId,
            @RequestParam(required = false) LocalDate date,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate) {
        StringBuilder sql = new StringBuilder(
                "SELECT id, business_id, staff_id, COALESCE(client_id, 0) AS client_id, service_id, appointment_date, start_time, end_time, status, service_name, client_name, price FROM appointments WHERE 1=1"
        );
        new Object() {
            final java.util.List<Object> params = new java.util.ArrayList<>();
        };
        java.util.List<Object> params = new java.util.ArrayList<>();
        LocalDate rangeStart = date != null ? date : startDate;
        LocalDate rangeEnd = date != null ? date : endDate;

        if (businessId != null) {
            sql.append(" AND business_id = ?");
            params.add(businessId);
        }
        if (staffId != null) {
            sql.append(" AND staff_id = ?");
            params.add(staffId);
        }
        if (rangeStart != null) {
            sql.append(" AND appointment_date >= ?");
            params.add(rangeStart);
        }
        if (rangeEnd != null) {
            sql.append(" AND appointment_date <= ?");
            params.add(rangeEnd);
        }
        sql.append(" ORDER BY appointment_date ASC, start_time ASC");
        return jdbcTemplate.query(sql.toString(), appointmentRowMapper, params.toArray());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Appointment createBooking(@RequestBody BookingRequest request) {
        if (request.appointmentDate() == null || request.startTime() == null || request.endTime() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "appointmentDate, startTime, and endTime are required");
        }
        Integer conflictCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM appointments WHERE staff_id = ? AND appointment_date = ? AND status != 'CANCELLED' AND start_time < ? AND end_time > ?",
                Integer.class, request.staffId(), request.appointmentDate(), request.endTime(), request.startTime());
        if (conflictCount != null && conflictCount > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This time slot is already booked for the selected staff member");
        }
        Appointment created = toAppointment(0L, request);
        ServiceSnapshot serviceSnapshot = fetchServiceSnapshot(created.getBusinessId(), created.getServiceId());
        if (serviceSnapshot != null) {
            created.setServiceName(serviceSnapshot.name());
            created.setPrice(serviceSnapshot.price());
        }
        if (request.clientName() != null && !request.clientName().isBlank()) {
            created.setClientName(request.clientName().trim());
        }
        LocalDateTime now = LocalDateTime.now();
        Number generatedId = jdbcTemplate.queryForObject(
                "INSERT INTO appointments (business_id, staff_id, client_id, service_id, appointment_date, start_time, end_time, status, payment_status, created_at, updated_at, service_name, client_name, client_phone, client_email, price, color, notes) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
                Number.class,
                created.getBusinessId(),
                created.getStaffId(),
                request.clientId(),
                created.getServiceId(),
                created.getAppointmentDate(),
                Time.valueOf(created.getStartTime()),
                Time.valueOf(created.getEndTime()),
                created.getStatus(),
                "PENDING",
                Timestamp.valueOf(now),
                Timestamp.valueOf(now),
                created.getServiceName(),
                created.getClientName(),
                request.clientPhone(),
                request.clientEmail(),
                created.getPrice() != null ? created.getPrice() : request.price(),
                request.color(),
                request.notes()
        );
        if (generatedId != null) {
            created.setId(generatedId.longValue());
        }
        publishAppointmentUpdate(created);
        notificationClient.notifyBookingConfirmed(
                created.getId(),
                request.clientEmail(),
                created.getClientName(),
                request.clientPhone(),
                created.getServiceName(),
                null,
                null,
                created.getAppointmentDate(),
                created.getStartTime(),
                created.getEndTime(),
                created.getPrice() != null ? created.getPrice() : (request.price() != null ? BigDecimal.valueOf(request.price()) : null)
        );
        return created;
    }

    @PutMapping("/{bookingId}")
    public Appointment updateBooking(@PathVariable long bookingId, @RequestBody BookingRequest request) {
        Appointment updated = toAppointment(bookingId, request);
        ServiceSnapshot serviceSnapshot = fetchServiceSnapshot(updated.getBusinessId(), updated.getServiceId());
        if (serviceSnapshot != null) {
            updated.setServiceName(serviceSnapshot.name());
            updated.setPrice(serviceSnapshot.price());
        }
        if (request.clientName() != null && !request.clientName().isBlank()) {
            updated.setClientName(request.clientName().trim());
        }
        int rows = jdbcTemplate.update(
                "UPDATE appointments SET business_id = ?, staff_id = ?, client_id = ?, service_id = ?, appointment_date = ?, start_time = ?, end_time = ?, status = ?, updated_at = ?, service_name = ?, client_name = ?, client_phone = ?, client_email = ?, price = ?, color = ?, notes = ? WHERE id = ?",
                updated.getBusinessId(),
                updated.getStaffId(),
                request.clientId(),
                updated.getServiceId(),
                updated.getAppointmentDate(),
                Time.valueOf(updated.getStartTime()),
                Time.valueOf(updated.getEndTime()),
                updated.getStatus(),
                Timestamp.valueOf(LocalDateTime.now()),
                updated.getServiceName(),
                updated.getClientName(),
                request.clientPhone(),
                request.clientEmail(),
                updated.getPrice() != null ? updated.getPrice() : request.price(),
                request.color(),
                request.notes(),
                bookingId
        );
        if (rows == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found: " + bookingId);
        }
        publishAppointmentUpdate(updated);
        return updated;
    }

    @PutMapping("/{bookingId}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelBooking(@PathVariable long bookingId) {
        Appointment existing = findById(bookingId);
        if (existing == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found: " + bookingId);
        }
        // Fetch contact details before updating status
        String[] contactDetails = fetchContactDetails(bookingId);
        String clientEmail = contactDetails[0];
        String clientPhone = contactDetails[1];

        existing.setStatus("CANCELLED");
        jdbcTemplate.update(
                "UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?",
                "CANCELLED",
                Timestamp.valueOf(LocalDateTime.now()),
                bookingId
        );
        publishAppointmentUpdate(existing);
        notificationClient.notifyBookingCancelled(
                bookingId,
                clientEmail,
                existing.getClientName(),
                clientPhone,
                existing.getServiceName(),
                null,
                null,
                existing.getAppointmentDate(),
                existing.getStartTime(),
                existing.getEndTime(),
                existing.getPrice()
        );
    }

    @DeleteMapping("/{bookingId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBooking(@PathVariable long bookingId) {
        Appointment removed = findById(bookingId);
        if (removed == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found: " + bookingId);
        }
        jdbcTemplate.update("DELETE FROM appointments WHERE id = ?", bookingId);
        removed.setStatus("CANCELLED"); // Keep websocket contract to remove from realtime UIs.
        publishAppointmentUpdate(removed);
    }

    private String[] fetchContactDetails(long bookingId) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT client_email, client_phone FROM appointments WHERE id = ?",
                    (rs, rowNum) -> new String[]{rs.getString("client_email"), rs.getString("client_phone")},
                    bookingId
            );
        } catch (EmptyResultDataAccessException e) {
            return new String[]{null, null};
        }
    }

    private Appointment findById(long bookingId) {
        List<Appointment> matches = jdbcTemplate.query(
                "SELECT id, business_id, staff_id, COALESCE(client_id, 0) AS client_id, service_id, appointment_date, start_time, end_time, status, service_name, client_name, price FROM appointments WHERE id = ?",
                appointmentRowMapper,
                bookingId
        );
        return matches.isEmpty() ? null : matches.get(0);
    }

    private ServiceSnapshot fetchServiceSnapshot(int businessId, int serviceId) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT name, price FROM services WHERE id = ? AND business_id = ?",
                    (rs, rowNum) -> new ServiceSnapshot(rs.getString("name"), rs.getBigDecimal("price")),
                    serviceId,
                    businessId
            );
        } catch (EmptyResultDataAccessException e) {
            return null;
        } catch (IncorrectResultSizeDataAccessException e) {
            return null;
        }
    }

    private void publishAppointmentUpdate(Appointment appointment) {
        if (appointment == null) return;
        messagingTemplate.convertAndSend("/topic/appointments/" + appointment.getBusinessId(), appointment);
        messagingTemplate.convertAndSend("/topic/appointments/staff/" + appointment.getStaffId(), appointment);
    }

    private Appointment toAppointment(long id, BookingRequest request) {
        LocalDate safeDate = request.appointmentDate();
        LocalTime safeStart = request.startTime();
        LocalTime safeEnd = request.endTime() != null ? request.endTime() : (safeStart != null ? safeStart.plusMinutes(30) : LocalTime.of(9, 30));
        Appointment appointment = new Appointment();
        appointment.setId(id);
        appointment.setBusinessId(request.businessId());
        appointment.setStaffId(request.staffId());
        appointment.setClientId(request.clientId() != null ? request.clientId() : 0);
        appointment.setServiceId(request.serviceId());
        appointment.setAppointmentDate(safeDate);
        appointment.setStartTime(safeStart);
        appointment.setEndTime(safeEnd);
        appointment.setStatus("CONFIRMED");
        return appointment;
    }

    public record BookingRequest(
            int businessId,
            int staffId,
            Integer clientId,
            int serviceId,
            LocalDate appointmentDate,
            LocalTime startTime,
            LocalTime endTime,
            String clientName,
            String clientPhone,
            String clientEmail,
            Double price,
            String color,
            String notes
    ) {}

    private record ServiceSnapshot(String name, BigDecimal price) {}
}
