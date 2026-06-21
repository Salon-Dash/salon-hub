package com.booksy.invitation;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.util.*;

@RestController
@RequestMapping("/api/invitations")
public class InvitationController {

    private final JdbcTemplate jdbc;

    public InvitationController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** GET /api/invitations/business/{businessId} */
    @GetMapping("/business/{businessId}")
    public List<Map<String, Object>> getByBusiness(@PathVariable Long businessId) {
        return jdbc.queryForList(
            "SELECT * FROM invitations WHERE business_id = ? ORDER BY created_at DESC", businessId);
    }

    /** GET /api/invitations/code/{referralCode} */
    @GetMapping("/code/{referralCode}")
    public Map<String, Object> getByCode(@PathVariable String referralCode) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT * FROM invitations WHERE referral_code = ?", referralCode);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found");
        return rows.get(0);
    }

    /** GET /api/invitations/{id} */
    @GetMapping("/{id}")
    public Map<String, Object> getById(@PathVariable Long id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT * FROM invitations WHERE id = ?", id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found");
        return rows.get(0);
    }

    /** POST /api/invitations */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        String code = body.getOrDefault("referralCode", UUID.randomUUID().toString().substring(0, 8).toUpperCase()).toString();
        Long id = jdbc.queryForObject(
            "INSERT INTO invitations (business_id, client_email, client_name, referral_code, status, invited_by, message, expires_at) " +
            "VALUES (?,?,?,?,'PENDING',?,?,?) RETURNING id",
            Long.class,
            toLong(body.get("businessId")),
            body.get("clientEmail"),
            body.get("clientName"),
            code,
            toLong(body.get("invitedBy")),
            body.get("message"),
            body.get("expiresAt") != null ? Timestamp.valueOf(body.get("expiresAt").toString()) : null
        );
        return getById(id);
    }

    /** PUT /api/invitations/{id}/cancel */
    @PutMapping("/{id}/cancel")
    public Map<String, Object> cancel(@PathVariable Long id) {
        int rows = jdbc.update("UPDATE invitations SET status = 'CANCELLED', updated_at = NOW() WHERE id = ?", id);
        if (rows == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found");
        return getById(id);
    }

    /** PUT /api/invitations/{id}/sent */
    @PutMapping("/{id}/sent")
    public Map<String, Object> markSent(@PathVariable Long id) {
        int rows = jdbc.update(
            "UPDATE invitations SET status = 'SENT', sent_at = NOW() WHERE id = ?", id);
        if (rows == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found");
        return getById(id);
    }

    /** PUT /api/invitations/{id}/accept */
    @PutMapping("/{id}/accept")
    public Map<String, Object> accept(@PathVariable Long id) {
        int rows = jdbc.update(
            "UPDATE invitations SET status = 'ACCEPTED', accepted_at = NOW() WHERE id = ?", id);
        if (rows == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found");
        return getById(id);
    }

    /** DELETE /api/invitations/{id} */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        jdbc.update("DELETE FROM invitations WHERE id = ?", id);
    }

    private Long toLong(Object v) {
        if (v == null) return null;
        try { return Long.parseLong(v.toString()); } catch (Exception e) { return null; }
    }
}
