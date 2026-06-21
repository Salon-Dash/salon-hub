package com.booksy.payment;

import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.*;

/**
 * Commission Rules — define what % or flat fee each staff member earns per category.
 * Commissions     — calculated earnings per sale/appointment.
 *
 * Routes:
 *   /api/commission-rules/**  → commission rule CRUD
 *   /api/commissions/**       → calculated commissions per staff
 */
@RestController
public class CommissionController {

    private final JdbcTemplate jdbc;

    public CommissionController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostConstruct
    void ensureSchema() {
        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS commission_rules (
                id           BIGSERIAL PRIMARY KEY,
                business_id  BIGINT        NOT NULL,
                staff_id     BIGINT,
                service_id   BIGINT,
                category_id  BIGINT,
                category     VARCHAR(50)   NOT NULL DEFAULT 'DEFAULT',
                type         VARCHAR(20)   NOT NULL DEFAULT 'PERCENTAGE',
                value        DECIMAL(10,2) NOT NULL DEFAULT 0,
                description  VARCHAR(255),
                is_active    BOOLEAN       DEFAULT true,
                created_at   TIMESTAMP     DEFAULT NOW(),
                updated_at   TIMESTAMP     DEFAULT NOW()
            )
            """);
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_commission_rules_business_id ON commission_rules(business_id)");
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_commission_rules_staff_id    ON commission_rules(staff_id)");

        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS commissions (
                id                BIGSERIAL PRIMARY KEY,
                business_id       BIGINT        NOT NULL,
                staff_id          BIGINT        NOT NULL,
                appointment_id    BIGINT,
                service_id        BIGINT,
                sale_id           BIGINT,
                category          VARCHAR(50)   NOT NULL DEFAULT 'SERVICES',
                sale_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
                commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                status            VARCHAR(20)   DEFAULT 'PENDING',
                commission_date   DATE,
                payment_id        BIGINT,
                notes             TEXT,
                created_at        TIMESTAMP     DEFAULT NOW(),
                updated_at        TIMESTAMP     DEFAULT NOW()
            )
            """);
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_commissions_business_staff ON commissions(business_id, staff_id)");
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_commissions_appointment_id ON commissions(appointment_id)");
    }

    // ── COMMISSION RULES ─────────────────────────────────────────────────────

    @GetMapping("/api/commission-rules/business/{businessId}")
    public List<Map<String, Object>> getRulesByBusiness(@PathVariable Long businessId) {
        return jdbc.queryForList(
            "SELECT * FROM commission_rules WHERE business_id = ? AND is_active = true ORDER BY category, staff_id NULLS LAST",
            businessId);
    }

    @GetMapping("/api/commission-rules/business/{businessId}/category/{category}")
    public List<Map<String, Object>> getRulesByCategory(@PathVariable Long businessId,
                                                         @PathVariable String category) {
        return jdbc.queryForList(
            "SELECT * FROM commission_rules WHERE business_id = ? AND category = ? AND is_active = true",
            businessId, category.toUpperCase());
    }

    @GetMapping("/api/commission-rules/business/{businessId}/staff/{staffId}")
    public List<Map<String, Object>> getRulesByStaff(@PathVariable Long businessId,
                                                      @PathVariable Long staffId) {
        return jdbc.queryForList(
            "SELECT * FROM commission_rules WHERE business_id = ? AND (staff_id = ? OR staff_id IS NULL) AND is_active = true ORDER BY staff_id NULLS LAST",
            businessId, staffId);
    }

    @PostMapping("/api/commission-rules")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createRule(@RequestBody Map<String, Object> body) {
        Long id = jdbc.queryForObject(
            "INSERT INTO commission_rules (business_id, staff_id, service_id, category_id, category, type, value, description, is_active) " +
            "VALUES (?,?,?,?,?,?,?,?,?) RETURNING id",
            Long.class,
            toLong(body.get("businessId")), toLong(body.get("staffId")),
            toLong(body.get("serviceId")), toLong(body.get("categoryId")),
            str(body.getOrDefault("category", "DEFAULT")),
            str(body.getOrDefault("type", "PERCENTAGE")),
            toDecimal(body.getOrDefault("value", 0)),
            body.get("description"),
            body.getOrDefault("isActive", true)
        );
        return getRuleById(id);
    }

    @PutMapping("/api/commission-rules/{id}")
    public Map<String, Object> updateRule(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        jdbc.update(
            "UPDATE commission_rules SET category = COALESCE(?, category), type = COALESCE(?, type), " +
            "value = COALESCE(?, value), description = COALESCE(?, description), " +
            "is_active = COALESCE(?, is_active), staff_id = COALESCE(?, staff_id), " +
            "service_id = COALESCE(?, service_id), updated_at = NOW() WHERE id = ?",
            body.get("category") != null ? str(body.get("category")) : null,
            body.get("type") != null ? str(body.get("type")) : null,
            body.get("value") != null ? toDecimal(body.get("value")) : null,
            body.get("description"),
            body.get("isActive"),
            toLong(body.get("staffId")),
            toLong(body.get("serviceId")),
            id
        );
        return getRuleById(id);
    }

    @PutMapping("/api/commission-rules/{id}/deactivate")
    public Map<String, Object> deactivateRule(@PathVariable Long id) {
        jdbc.update("UPDATE commission_rules SET is_active = false, updated_at = NOW() WHERE id = ?", id);
        return getRuleById(id);
    }

    @DeleteMapping("/api/commission-rules/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRule(@PathVariable Long id) {
        jdbc.update("DELETE FROM commission_rules WHERE id = ?", id);
    }

    @DeleteMapping("/api/commission-rules/business/{businessId}/all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAllRulesForBusiness(@PathVariable Long businessId) {
        jdbc.update("DELETE FROM commission_rules WHERE business_id = ?", businessId);
    }

    private Map<String, Object> getRuleById(Long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM commission_rules WHERE id = ?", id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Commission rule not found");
        return rows.get(0);
    }

    // ── COMMISSIONS ──────────────────────────────────────────────────────────

    @GetMapping("/api/commissions/business/{businessId}/staff/{staffId}")
    public List<Map<String, Object>> getCommissions(@PathVariable Long businessId,
                                                     @PathVariable Long staffId) {
        return jdbc.queryForList(
            "SELECT * FROM commissions WHERE business_id = ? AND staff_id = ? ORDER BY commission_date DESC, created_at DESC",
            businessId, staffId);
    }

    @GetMapping("/api/commissions/business/{businessId}/staff/{staffId}/pending")
    public List<Map<String, Object>> getPendingCommissions(@PathVariable Long businessId,
                                                            @PathVariable Long staffId) {
        return jdbc.queryForList(
            "SELECT * FROM commissions WHERE business_id = ? AND staff_id = ? AND status = 'PENDING' ORDER BY commission_date DESC",
            businessId, staffId);
    }

    @GetMapping("/api/commissions/business/{businessId}/staff/{staffId}/total-pending")
    public Map<String, Object> getTotalPending(@PathVariable Long businessId,
                                                @PathVariable Long staffId) {
        Map<String, Object> row = jdbc.queryForMap(
            "SELECT COALESCE(SUM(commission_amount), 0) AS total FROM commissions " +
            "WHERE business_id = ? AND staff_id = ? AND status = 'PENDING'",
            businessId, staffId);
        return Map.of("totalPending", row.get("total"));
    }

    @PutMapping("/api/commissions/{id}/cancel")
    public Map<String, Object> cancelCommission(@PathVariable Long id) {
        int rows = jdbc.update(
            "UPDATE commissions SET status = 'CANCELLED', updated_at = NOW() WHERE id = ?", id);
        if (rows == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Commission not found");
        List<Map<String, Object>> result = jdbc.queryForList("SELECT * FROM commissions WHERE id = ?", id);
        return result.get(0);
    }

    @PutMapping("/api/commissions/appointment/{appointmentId}/cancel")
    public void cancelCommissionByAppointment(@PathVariable Long appointmentId) {
        jdbc.update(
            "UPDATE commissions SET status = 'CANCELLED', updated_at = NOW() WHERE appointment_id = ?",
            appointmentId);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Long toLong(Object v) {
        if (v == null) return null;
        try { return Long.parseLong(v.toString()); } catch (Exception e) { return null; }
    }

    private BigDecimal toDecimal(Object v) {
        if (v == null) return BigDecimal.ZERO;
        try { return new BigDecimal(v.toString()); } catch (Exception e) { return BigDecimal.ZERO; }
    }

    private String str(Object v) {
        return v == null ? null : v.toString();
    }
}
