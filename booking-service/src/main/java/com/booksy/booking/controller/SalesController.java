package com.booksy.booking.controller;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Sales endpoints — converts appointments into "sales" view.
 *
 * GET  /api/sales/business/{businessId}              list sales (by date or range)
 * GET  /api/sales/{id}                               get single sale
 * POST /api/sales                                    create a manual sale (walks-in)
 * DELETE /api/sales/{id}                             cancel a sale
 *
 * A "sale" is a completed/confirmed appointment or a manual walk-in transaction
 * recorded directly.  The backend stores sales in a separate sales table that
 * is created by a new Flyway migration.
 */
@RestController
@RequestMapping("/api/sales")
public class SalesController {

    private final JdbcTemplate jdbc;

    public SalesController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ── GET /api/sales/business/{businessId} ──────────────────────────────

    @GetMapping("/business/{businessId}")
    public List<Map<String, Object>> getSalesByBusiness(
            @PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        // Try the sales table first; fall back to appointments-as-sales
        try {
            return getSalesFromSalesTable(businessId, date, startDate, endDate);
        } catch (Exception e) {
            // sales table might not exist yet — fall back to appointment view
            return getSalesFromAppointments(businessId, date, startDate, endDate);
        }
    }

    private List<Map<String, Object>> getSalesFromSalesTable(int businessId, LocalDate date, LocalDate startDate, LocalDate endDate) {
        LocalDate rangeStart = date != null ? date : (startDate != null ? startDate : null);
        LocalDate rangeEnd = date != null ? date : (endDate != null ? endDate : null);

        String sql = "SELECT s.id, s.business_id, s.staff_id, s.client_id, s.client_name, " +
                "s.client_phone, s.client_email, s.sale_date, s.sale_time, s.subtotal, " +
                "s.discount_amount, s.discount_percent, s.tip_amount, s.tip_percent, s.total, " +
                "s.payment_method, s.payment_amount, s.change_amount, " +
                "s.split_cash_amount, s.split_card_amount, s.status, s.notes, " +
                "s.bill_number, s.bill_id, s.created_at " +
                "FROM sales s WHERE s.business_id = ?";

        List<Object> params = new ArrayList<>();
        params.add(businessId);

        if (rangeStart != null && rangeEnd != null) {
            sql += " AND s.sale_date BETWEEN ? AND ?";
            params.add(rangeStart);
            params.add(rangeEnd);
        } else if (rangeStart != null) {
            sql += " AND s.sale_date >= ?";
            params.add(rangeStart);
        }

        sql += " ORDER BY s.sale_date DESC, s.sale_time DESC";

        List<Map<String, Object>> sales = jdbc.queryForList(sql, params.toArray());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> s : sales) {
            result.add(buildSaleResponse(s));
        }
        return result;
    }

    private List<Map<String, Object>> getSalesFromAppointments(int businessId, LocalDate date, LocalDate startDate, LocalDate endDate) {
        LocalDate rangeStart = date != null ? date : startDate;
        LocalDate rangeEnd = date != null ? date : endDate;

        StringBuilder sql = new StringBuilder(
                "SELECT id, business_id, staff_id, client_id, client_name, client_phone, client_email, " +
                "appointment_date AS sale_date, start_time AS sale_time, price AS total, " +
                "payment_status, status, service_name, notes, created_at " +
                "FROM appointments WHERE business_id = ? AND status != 'CANCELLED'");

        List<Object> params = new ArrayList<>();
        params.add(businessId);

        if (rangeStart != null && rangeEnd != null) {
            sql.append(" AND appointment_date BETWEEN ? AND ?");
            params.add(rangeStart);
            params.add(rangeEnd);
        } else if (rangeStart != null) {
            sql.append(" AND appointment_date >= ?");
            params.add(rangeStart);
        }
        sql.append(" ORDER BY appointment_date DESC, start_time DESC");

        List<Map<String, Object>> rows = jdbc.queryForList(sql.toString(), params.toArray());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            result.add(buildSaleFromAppointment(row));
        }
        return result;
    }

    // ── GET /api/sales/{id} ───────────────────────────────────────────────

    @GetMapping("/{id}")
    public Map<String, Object> getSaleById(@PathVariable long id) {
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT s.*, si.id AS item_id, si.service_id, si.service_name AS item_service_name, " +
                    "si.service_type, si.quantity, si.unit_price, si.total_price, si.duration, si.notes AS item_notes " +
                    "FROM sales s LEFT JOIN sale_items si ON si.sale_id = s.id WHERE s.id = ?", id);
            if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found");
            return buildSaleResponse(rows.get(0));
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception e) {
            // fall back to appointment
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT id, business_id, staff_id, client_id, client_name, client_phone, client_email, " +
                    "appointment_date AS sale_date, start_time AS sale_time, price AS total, " +
                    "payment_status, status, service_name, notes, created_at " +
                    "FROM appointments WHERE id = ?", id);
            if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found");
            return buildSaleFromAppointment(rows.get(0));
        }
    }

    // ── POST /api/sales ───────────────────────────────────────────────────

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Map<String, Object> createSale(@RequestBody Map<String, Object> body) {
        int businessId = toInt(body.get("businessId"));
        if (businessId <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "businessId is required");

        LocalDateTime now = LocalDateTime.now();
        String saleDate = body.getOrDefault("saleDate", LocalDate.now().toString()).toString();
        String saleTime = body.getOrDefault("saleTime", LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))).toString();

        // Compute totals from items
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) body.getOrDefault("items", List.of());
        double subtotal = items.stream().mapToDouble(i -> toDouble(i.get("unitPrice")) * toInt(i.get("quantity"))).sum();
        double discountAmount = toDouble(body.get("discountAmount"));
        double tipAmount = toDouble(body.get("tipAmount"));
        double total = subtotal - discountAmount + tipAmount;

        Long saleId;
        try {
            saleId = jdbc.queryForObject(
                    "INSERT INTO sales (business_id, staff_id, client_id, client_name, client_phone, client_email, " +
                    "sale_date, sale_time, subtotal, discount_amount, discount_percent, tip_amount, tip_percent, " +
                    "total, payment_method, payment_amount, change_amount, split_cash_amount, split_card_amount, " +
                    "status, notes, bill_number, bill_id, created_at, updated_at) " +
                    "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'COMPLETED',?,?,?,?,?) RETURNING id",
                    Long.class,
                    businessId, toIntOrNull(body.get("staffId")), toIntOrNull(body.get("clientId")),
                    body.get("clientName"), body.get("clientPhone"), body.get("clientEmail"),
                    saleDate, saleTime, subtotal, discountAmount,
                    toDouble(body.get("discountPercent")), tipAmount,
                    toDouble(body.get("tipPercent")), total,
                    body.getOrDefault("paymentMethod", "CASH").toString(),
                    toDouble(body.get("paymentAmount")), toDouble(body.get("changeAmount")),
                    toDoubleOrNull(body.get("splitCashAmount")), toDoubleOrNull(body.get("splitCardAmount")),
                    body.get("notes"),
                    "BILL-" + System.currentTimeMillis(), UUID.randomUUID().toString(),
                    Timestamp.valueOf(now), Timestamp.valueOf(now));
        } catch (Exception e) {
            // sales table may not exist — create one and retry
            createSalesTableIfNeeded();
            saleId = jdbc.queryForObject(
                    "INSERT INTO sales (business_id, staff_id, client_id, client_name, client_phone, client_email, " +
                    "sale_date, sale_time, subtotal, discount_amount, discount_percent, tip_amount, tip_percent, " +
                    "total, payment_method, payment_amount, change_amount, split_cash_amount, split_card_amount, " +
                    "status, notes, bill_number, bill_id, created_at, updated_at) " +
                    "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'COMPLETED',?,?,?,?,?) RETURNING id",
                    Long.class,
                    businessId, toIntOrNull(body.get("staffId")), toIntOrNull(body.get("clientId")),
                    body.get("clientName"), body.get("clientPhone"), body.get("clientEmail"),
                    saleDate, saleTime, subtotal, discountAmount,
                    toDouble(body.get("discountPercent")), tipAmount,
                    toDouble(body.get("tipPercent")), total,
                    body.getOrDefault("paymentMethod", "CASH").toString(),
                    toDouble(body.get("paymentAmount")), toDouble(body.get("changeAmount")),
                    toDoubleOrNull(body.get("splitCashAmount")), toDoubleOrNull(body.get("splitCardAmount")),
                    body.get("notes"),
                    "BILL-" + System.currentTimeMillis(), UUID.randomUUID().toString(),
                    Timestamp.valueOf(now), Timestamp.valueOf(now));
        }

        if (saleId == null) throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create sale");

        // Insert items
        if (!items.isEmpty()) {
            for (Map<String, Object> item : items) {
                double unitPrice = toDouble(item.get("unitPrice"));
                int qty = Math.max(1, toInt(item.get("quantity")));
                jdbc.update(
                        "INSERT INTO sale_items (sale_id, service_id, service_name, service_type, quantity, unit_price, total_price, duration, notes) " +
                        "VALUES (?,?,?,?,?,?,?,?,?)",
                        saleId, toIntOrNull(item.get("serviceId")),
                        item.get("serviceName"), item.getOrDefault("serviceType", "SERVICE"),
                        qty, unitPrice, unitPrice * qty,
                        item.get("duration"), item.get("notes"));
            }
        }

        return getSaleById(saleId);
    }

    // ── DELETE /api/sales/{id} ────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelSale(@PathVariable long id) {
        try {
            int rows = jdbc.update("UPDATE sales SET status = 'CANCELLED', updated_at = ? WHERE id = ?",
                    Timestamp.valueOf(LocalDateTime.now()), id);
            if (rows == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found");
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception e) {
            // fall back to appointments
            int rows = jdbc.update("UPDATE appointments SET status = 'CANCELLED', updated_at = ? WHERE id = ?",
                    Timestamp.valueOf(LocalDateTime.now()), id);
            if (rows == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found");
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────

    private Map<String, Object> buildSaleResponse(Map<String, Object> row) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("id", row.get("id"));
        r.put("businessId", row.get("business_id"));
        r.put("staffId", row.get("staff_id"));
        r.put("clientId", row.get("client_id"));
        r.put("clientName", row.get("client_name"));
        r.put("clientPhone", row.get("client_phone"));
        r.put("clientEmail", row.get("client_email"));

        Object saleDate = row.get("sale_date");
        Object saleTime = row.get("sale_time");
        r.put("saleDate", saleDate != null ? saleDate.toString() : "");
        r.put("saleTime", saleTime != null ? saleTime.toString() : "");

        r.put("subtotal", row.getOrDefault("subtotal", row.getOrDefault("total", BigDecimal.ZERO)));
        r.put("discountAmount", row.getOrDefault("discount_amount", BigDecimal.ZERO));
        r.put("discountPercent", row.getOrDefault("discount_percent", BigDecimal.ZERO));
        r.put("tipAmount", row.getOrDefault("tip_amount", BigDecimal.ZERO));
        r.put("tipPercent", row.getOrDefault("tip_percent", BigDecimal.ZERO));
        r.put("total", row.getOrDefault("total", BigDecimal.ZERO));
        r.put("paymentMethod", row.getOrDefault("payment_method", "CASH"));
        r.put("paymentAmount", row.getOrDefault("payment_amount", row.getOrDefault("total", BigDecimal.ZERO)));
        r.put("changeAmount", row.getOrDefault("change_amount", BigDecimal.ZERO));
        r.put("splitCashAmount", row.get("split_cash_amount"));
        r.put("splitCardAmount", row.get("split_card_amount"));
        r.put("status", row.getOrDefault("status", "COMPLETED"));
        r.put("notes", row.get("notes"));
        r.put("billNumber", row.get("bill_number"));
        r.put("billId", row.get("bill_id"));

        // Build items list (may be empty)
        List<Map<String, Object>> items = new ArrayList<>();
        if (row.containsKey("item_id") && row.get("item_id") != null) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("item_id"));
            item.put("serviceId", row.get("service_id"));
            item.put("serviceName", row.getOrDefault("item_service_name", row.get("service_name")));
            item.put("serviceType", row.getOrDefault("service_type", "SERVICE"));
            item.put("quantity", row.getOrDefault("quantity", 1));
            item.put("unitPrice", row.getOrDefault("unit_price", row.getOrDefault("total", BigDecimal.ZERO)));
            item.put("totalPrice", row.getOrDefault("total_price", row.getOrDefault("total", BigDecimal.ZERO)));
            item.put("duration", row.get("duration"));
            items.add(item);
        }
        r.put("items", items);
        return r;
    }

    private Map<String, Object> buildSaleFromAppointment(Map<String, Object> row) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("id", row.get("id"));
        r.put("businessId", row.get("business_id"));
        r.put("staffId", row.get("staff_id"));
        r.put("clientId", row.get("client_id"));
        r.put("clientName", row.get("client_name"));
        r.put("clientPhone", row.get("client_phone"));
        r.put("clientEmail", row.get("client_email"));

        Object saleDate = row.get("sale_date");
        Object saleTime = row.get("sale_time");
        r.put("saleDate", saleDate != null ? saleDate.toString() : "");
        r.put("saleTime", saleTime != null ? saleTime.toString() : "");

        BigDecimal total = row.get("total") instanceof BigDecimal ? (BigDecimal) row.get("total") : BigDecimal.ZERO;
        r.put("subtotal", total);
        r.put("discountAmount", BigDecimal.ZERO);
        r.put("discountPercent", BigDecimal.ZERO);
        r.put("tipAmount", BigDecimal.ZERO);
        r.put("tipPercent", BigDecimal.ZERO);
        r.put("total", total);
        r.put("paymentMethod", "CASH");
        r.put("paymentAmount", total);
        r.put("changeAmount", BigDecimal.ZERO);
        r.put("splitCashAmount", null);
        r.put("splitCardAmount", null);
        r.put("status", "COMPLETED");
        r.put("notes", row.get("notes"));
        r.put("billNumber", "APT-" + row.get("id"));
        r.put("billId", row.get("id").toString());

        // Single service item from appointment
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", row.get("id"));
        item.put("serviceId", null);
        item.put("serviceName", row.getOrDefault("service_name", "Service"));
        item.put("serviceType", "SERVICE");
        item.put("quantity", 1);
        item.put("unitPrice", total);
        item.put("totalPrice", total);
        item.put("duration", null);
        r.put("items", List.of(item));
        return r;
    }

    private void createSalesTableIfNeeded() {
        jdbc.execute(
                "CREATE TABLE IF NOT EXISTS sales (" +
                "  id BIGSERIAL PRIMARY KEY," +
                "  business_id INT NOT NULL," +
                "  staff_id INT," +
                "  client_id INT," +
                "  client_name VARCHAR(255)," +
                "  client_phone VARCHAR(50)," +
                "  client_email VARCHAR(255)," +
                "  sale_date DATE NOT NULL DEFAULT CURRENT_DATE," +
                "  sale_time TIME NOT NULL DEFAULT CURRENT_TIME," +
                "  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0," +
                "  discount_amount DECIMAL(10,2) DEFAULT 0," +
                "  discount_percent DECIMAL(5,2) DEFAULT 0," +
                "  tip_amount DECIMAL(10,2) DEFAULT 0," +
                "  tip_percent DECIMAL(5,2) DEFAULT 0," +
                "  total DECIMAL(10,2) NOT NULL DEFAULT 0," +
                "  payment_method VARCHAR(50) DEFAULT 'CASH'," +
                "  payment_amount DECIMAL(10,2) DEFAULT 0," +
                "  change_amount DECIMAL(10,2) DEFAULT 0," +
                "  split_cash_amount DECIMAL(10,2)," +
                "  split_card_amount DECIMAL(10,2)," +
                "  status VARCHAR(20) DEFAULT 'COMPLETED'," +
                "  notes TEXT," +
                "  bill_number VARCHAR(50)," +
                "  bill_id VARCHAR(100)," +
                "  created_at TIMESTAMP DEFAULT NOW()," +
                "  updated_at TIMESTAMP DEFAULT NOW()" +
                ")");
        jdbc.execute(
                "CREATE TABLE IF NOT EXISTS sale_items (" +
                "  id BIGSERIAL PRIMARY KEY," +
                "  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE," +
                "  service_id INT," +
                "  service_name VARCHAR(255)," +
                "  service_type VARCHAR(50)," +
                "  quantity INT DEFAULT 1," +
                "  unit_price DECIMAL(10,2)," +
                "  total_price DECIMAL(10,2)," +
                "  duration VARCHAR(50)," +
                "  notes TEXT" +
                ")");
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_sales_business_id ON sales(business_id)");
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date)");
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)");
    }

    private int toInt(Object v) {
        if (v == null) return 0;
        if (v instanceof Number) return ((Number) v).intValue();
        try { return Integer.parseInt(v.toString()); } catch (NumberFormatException e) { return 0; }
    }

    private Integer toIntOrNull(Object v) {
        if (v == null) return null;
        int i = toInt(v);
        return i == 0 ? null : i;
    }

    private double toDouble(Object v) {
        if (v == null) return 0.0;
        if (v instanceof Number) return ((Number) v).doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (NumberFormatException e) { return 0.0; }
    }

    private Double toDoubleOrNull(Object v) {
        if (v == null) return null;
        double d = toDouble(v);
        return d == 0.0 ? null : d;
    }
}
