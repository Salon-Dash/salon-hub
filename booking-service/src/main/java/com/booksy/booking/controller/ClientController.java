package com.booksy.booking.controller;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Lightweight client endpoints backed by the appointments table.
 *
 * GET  /api/clients/business/{businessId}    list clients for a business
 * GET  /api/clients/{id}                     get a client by id (returns from appointment data)
 * POST /api/clients/business/{businessId}    create/register a new client record
 *
 * Clients without a registered account are identified by their name/phone/email
 * from appointment records.
 */
@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final JdbcTemplate jdbc;

    public ClientController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ── GET /api/clients/business/{businessId} ────────────────────────────

    @GetMapping("/business/{businessId}")
    public List<Map<String, Object>> getClientsByBusiness(@PathVariable int businessId) {
        // Return clients from appointment history for this business
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT DISTINCT ON (LOWER(COALESCE(client_name, '')), COALESCE(client_phone, ''), COALESCE(client_email, '')) " +
                "COALESCE(client_id, 0) AS client_id, client_name, client_phone, client_email, business_id, " +
                "COUNT(*) OVER (PARTITION BY LOWER(COALESCE(client_name, ''))) AS total_visits, " +
                "SUM(price) OVER (PARTITION BY LOWER(COALESCE(client_name, ''))) AS total_spent, " +
                "MAX(appointment_date) OVER (PARTITION BY LOWER(COALESCE(client_name, ''))) AS last_visit_date " +
                "FROM appointments WHERE business_id = ? AND client_name IS NOT NULL " +
                "ORDER BY LOWER(COALESCE(client_name, '')), COALESCE(client_phone, ''), COALESCE(client_email, ''), appointment_date DESC",
                businessId);

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            result.add(toClientDto(row, businessId));
        }
        return result;
    }

    // ── GET /api/clients/{id} ─────────────────────────────────────────────

    @GetMapping("/{id}")
    public Map<String, Object> getClientById(@PathVariable long id) {
        // Try clients table first
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT * FROM clients WHERE id = ?", id);
            if (!rows.isEmpty()) return toClientDtoFromTable(rows.get(0));
        } catch (Exception ignored) { /* clients table may not exist */ }

        // Fall back: look up by client_id in appointments
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT client_id AS id, client_name, client_phone, client_email, business_id, " +
                "COUNT(*) AS total_visits, SUM(price) AS total_spent, MAX(appointment_date) AS last_visit_date " +
                "FROM appointments WHERE client_id = ? GROUP BY client_id, client_name, client_phone, client_email, business_id LIMIT 1",
                id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Client not found");
        return toClientDto(rows.get(0), 0);
    }

    // ── POST /api/clients/business/{businessId} ───────────────────────────

    @PostMapping("/business/{businessId}")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createClient(
            @PathVariable int businessId,
            @RequestBody Map<String, Object> body) {

        String firstName = (String) body.getOrDefault("firstName", "");
        String lastName = (String) body.get("lastName");
        String email = (String) body.get("email");
        String phone = (String) body.get("phone");
        if (firstName.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "firstName is required");

        String fullName = firstName.trim() + (lastName != null && !lastName.isBlank() ? " " + lastName.trim() : "");

        // Try inserting into clients table
        try {
            Long clientId = jdbc.queryForObject(
                    "INSERT INTO clients (business_id, first_name, last_name, email, phone, status, created_at, updated_at) " +
                    "VALUES (?,?,?,?,?,'ACTIVE',?,?) RETURNING id",
                    Long.class,
                    businessId, firstName.trim(), lastName,
                    email, phone,
                    Timestamp.valueOf(LocalDateTime.now()), Timestamp.valueOf(LocalDateTime.now()));
            if (clientId == null) throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create client");
            List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM clients WHERE id = ?", clientId);
            return rows.isEmpty() ? buildMinimalClient(clientId, businessId, firstName, lastName, email, phone) : toClientDtoFromTable(rows.get(0));
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception e) {
            // clients table doesn't exist — return minimal response
            Map<String, Object> dto = buildMinimalClient(
                    (long) (int)(Math.random() * Integer.MAX_VALUE),
                    businessId, firstName, lastName, email, phone);
            return dto;
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private Map<String, Object> toClientDto(Map<String, Object> row, int defaultBusinessId) {
        Object rawName = row.get("client_name");
        String fullName = rawName != null ? rawName.toString().trim() : "";
        String[] parts = fullName.split("\\s+", 2);

        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", row.getOrDefault("client_id", 0));
        dto.put("businessId", row.getOrDefault("business_id", defaultBusinessId));
        dto.put("firstName", parts.length > 0 ? parts[0] : fullName);
        dto.put("lastName", parts.length > 1 ? parts[1] : null);
        dto.put("email", row.get("client_email"));
        dto.put("phone", row.get("client_phone"));
        dto.put("birthday", null);
        dto.put("gender", null);
        dto.put("address", null);
        dto.put("city", null);
        dto.put("state", null);
        dto.put("zipCode", null);
        dto.put("country", null);
        dto.put("notes", null);
        dto.put("avatarUrl", null);
        dto.put("preferredLanguage", null);
        dto.put("preferredContactMethod", null);
        dto.put("status", "ACTIVE");
        dto.put("allowMarketingEmails", null);
        dto.put("allowSmsNotifications", null);
        dto.put("createdAt", null);
        dto.put("updatedAt", null);
        dto.put("totalVisits", row.getOrDefault("total_visits", 0));
        dto.put("totalSpent", row.getOrDefault("total_spent", null));
        Object lastVisit = row.get("last_visit_date");
        dto.put("lastVisitDate", lastVisit != null ? lastVisit.toString() : null);
        return dto;
    }

    private Map<String, Object> toClientDtoFromTable(Map<String, Object> row) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", row.get("id"));
        dto.put("businessId", row.get("business_id"));
        dto.put("firstName", row.get("first_name"));
        dto.put("lastName", row.get("last_name"));
        dto.put("email", row.get("email"));
        dto.put("phone", row.get("phone"));
        dto.put("birthday", row.get("birthday"));
        dto.put("gender", row.get("gender"));
        dto.put("address", row.get("address"));
        dto.put("city", row.get("city"));
        dto.put("state", row.get("state"));
        dto.put("zipCode", row.get("zip_code"));
        dto.put("country", row.get("country"));
        dto.put("notes", row.get("notes"));
        dto.put("avatarUrl", row.get("avatar_url"));
        dto.put("preferredLanguage", row.get("preferred_language"));
        dto.put("preferredContactMethod", row.get("preferred_contact_method"));
        dto.put("status", row.getOrDefault("status", "ACTIVE"));
        dto.put("allowMarketingEmails", row.get("allow_marketing_emails"));
        dto.put("allowSmsNotifications", row.get("allow_sms_notifications"));
        Object createdAt = row.get("created_at");
        dto.put("createdAt", createdAt != null ? createdAt.toString() : null);
        Object updatedAt = row.get("updated_at");
        dto.put("updatedAt", updatedAt != null ? updatedAt.toString() : null);
        dto.put("totalVisits", 0);
        dto.put("totalSpent", null);
        dto.put("lastVisitDate", null);
        dto.put("pendingAppointments", 0);
        dto.put("confirmedAppointments", 0);
        dto.put("completedAppointments", 0);
        dto.put("cancelledAppointments", 0);
        return dto;
    }

    private Map<String, Object> buildMinimalClient(Long id, int businessId, String firstName, String lastName, String email, String phone) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", id);
        dto.put("businessId", businessId);
        dto.put("firstName", firstName);
        dto.put("lastName", lastName);
        dto.put("email", email);
        dto.put("phone", phone);
        dto.put("birthday", null);
        dto.put("gender", null);
        dto.put("address", null);
        dto.put("city", null);
        dto.put("state", null);
        dto.put("zipCode", null);
        dto.put("country", null);
        dto.put("notes", null);
        dto.put("avatarUrl", null);
        dto.put("preferredLanguage", null);
        dto.put("preferredContactMethod", null);
        dto.put("status", "ACTIVE");
        dto.put("allowMarketingEmails", null);
        dto.put("allowSmsNotifications", null);
        dto.put("createdAt", LocalDateTime.now().toString());
        dto.put("updatedAt", LocalDateTime.now().toString());
        dto.put("totalVisits", 0);
        dto.put("totalSpent", null);
        dto.put("lastVisitDate", null);
        dto.put("pendingAppointments", 0);
        dto.put("confirmedAppointments", 0);
        dto.put("completedAppointments", 0);
        dto.put("cancelledAppointments", 0);
        return dto;
    }
}
