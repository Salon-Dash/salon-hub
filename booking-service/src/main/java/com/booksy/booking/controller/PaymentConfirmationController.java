package com.booksy.booking.controller;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
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
 * Payment confirmation endpoint — processes a payment and creates a sale record.
 *
 * POST /api/payment-confirmation
 *
 * This replaces the payment-service for the core "confirm payment" flow in the
 * admin dashboard (SalesPage). It creates a sale, and optionally updates the
 * related appointment's payment_status to PAID.
 */
@RestController
@RequestMapping("/api/payment-confirmation")
public class PaymentConfirmationController {

    private final JdbcTemplate jdbc;

    public PaymentConfirmationController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> confirmPayment(@RequestBody Map<String, Object> body) {
        int businessId = toInt(body.get("businessId"));
        if (businessId <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "businessId is required");

        // Compute total from items
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) body.getOrDefault("items", List.of());
        double subtotal = items.stream().mapToDouble(i -> toDouble(i.get("unitPrice")) * Math.max(1, toInt(i.get("quantity")))).sum();
        double discountAmount = toDouble(body.get("discountAmount"));
        double tipAmount = toDouble(body.get("tipAmount"));
        double total = subtotal - discountAmount + tipAmount;

        LocalDateTime now = LocalDateTime.now();
        String saleDate = LocalDate.now().toString();
        String saleTime = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"));

        // Try to insert into sales table; create it if missing
        Long saleId = null;
        for (int attempt = 0; attempt < 2; attempt++) {
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
                break;
            } catch (Exception e) {
                if (attempt == 0) {
                    createSalesTable();
                } else {
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create sale: " + e.getMessage());
                }
            }
        }

        if (saleId == null) throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create sale");

        // Insert line items
        for (Map<String, Object> item : items) {
            double unitPrice = toDouble(item.get("unitPrice"));
            int qty = Math.max(1, toInt(item.get("quantity")));
            try {
                jdbc.update(
                        "INSERT INTO sale_items (sale_id, service_id, service_name, service_type, quantity, unit_price, total_price, duration, notes) " +
                        "VALUES (?,?,?,?,?,?,?,?,?)",
                        saleId, toIntOrNull(item.get("serviceId")),
                        item.get("serviceName"), item.getOrDefault("serviceType", "SERVICE"),
                        qty, unitPrice, unitPrice * qty,
                        item.get("duration"), item.get("notes"));
            } catch (Exception ignored) { /* non-fatal */ }
        }

        // If appointmentId provided, update appointment payment_status to PAID
        boolean appointmentUpdated = false;
        Object aptIdRaw = body.get("appointmentId");
        if (aptIdRaw != null) {
            int appointmentId = toInt(aptIdRaw);
            if (appointmentId > 0) {
                try {
                    int rows = jdbc.update(
                            "UPDATE appointments SET payment_status = 'PAID', status = 'COMPLETED', updated_at = ? WHERE id = ?",
                            Timestamp.valueOf(now), appointmentId);
                    appointmentUpdated = rows > 0;
                } catch (Exception ignored) { /* non-fatal */ }
            }
        }

        // Build response matching PaymentConfirmationResponse interface
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("saleId", saleId);
        response.put("businessId", businessId);
        response.put("totalAmount", total);
        response.put("commissions", List.of()); // No commission calculation without payment-service
        response.put("appointmentUpdated", appointmentUpdated);
        response.put("message", "Payment processed successfully");
        return response;
    }

    private void createSalesTable() {
        jdbc.execute(
                "CREATE TABLE IF NOT EXISTS sales (" +
                "  id BIGSERIAL PRIMARY KEY, business_id INT NOT NULL, staff_id INT, client_id INT," +
                "  client_name VARCHAR(255), client_phone VARCHAR(50), client_email VARCHAR(255)," +
                "  sale_date DATE NOT NULL DEFAULT CURRENT_DATE, sale_time TIME NOT NULL DEFAULT CURRENT_TIME," +
                "  subtotal DECIMAL(10,2) DEFAULT 0, discount_amount DECIMAL(10,2) DEFAULT 0," +
                "  discount_percent DECIMAL(5,2) DEFAULT 0, tip_amount DECIMAL(10,2) DEFAULT 0," +
                "  tip_percent DECIMAL(5,2) DEFAULT 0, total DECIMAL(10,2) DEFAULT 0," +
                "  payment_method VARCHAR(50) DEFAULT 'CASH', payment_amount DECIMAL(10,2) DEFAULT 0," +
                "  change_amount DECIMAL(10,2) DEFAULT 0, split_cash_amount DECIMAL(10,2)," +
                "  split_card_amount DECIMAL(10,2), status VARCHAR(20) DEFAULT 'COMPLETED'," +
                "  notes TEXT, bill_number VARCHAR(50), bill_id VARCHAR(100)," +
                "  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())");
        jdbc.execute(
                "CREATE TABLE IF NOT EXISTS sale_items (" +
                "  id BIGSERIAL PRIMARY KEY, sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE," +
                "  service_id INT, service_name VARCHAR(255), service_type VARCHAR(50)," +
                "  quantity INT DEFAULT 1, unit_price DECIMAL(10,2), total_price DECIMAL(10,2)," +
                "  duration VARCHAR(50), notes TEXT)");
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
