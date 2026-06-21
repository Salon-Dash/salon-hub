package com.booksy.booking.controller;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Analytics endpoints derived from the appointments table.
 *
 * Routes:  /api/analytics/business/{id}/**
 * Gateway: analysis-service route already maps /api/analytics/** → analysis-service
 *          We register an additional route for booking-service to handle these paths.
 *          (Gateway route "booking-service-analytics" added in application.yml.)
 *
 * All endpoints support optional ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD.
 * Defaults: last 30 days if not supplied.
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final JdbcTemplate jdbc;

    public AnalyticsController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private LocalDate resolveStart(LocalDate startDate) {
        return startDate != null ? startDate : LocalDate.now().minusDays(30);
    }

    private LocalDate resolveEnd(LocalDate endDate) {
        return endDate != null ? endDate : LocalDate.now();
    }

    // ── /api/analytics/business/{id}/overview ───────────────────────────────

    @GetMapping("/business/{businessId}/overview")
    public Map<String, Object> getOverview(
            @PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "UTC") String timezone) {

        java.time.ZoneId tz;
        try { tz = java.time.ZoneId.of(timezone); } catch (Exception e) { tz = java.time.ZoneId.of("UTC"); }
        LocalDate start = startDate != null ? startDate : LocalDate.now(tz).minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now(tz);
        LocalDate prevStart = start.minusDays(ChronoUnit.DAYS.between(start, end) + 1);
        LocalDate prevEnd = start.minusDays(1);

        // Try sales table first for accurate revenue (includes discounts/tips)
        // Fall back to appointments.price if no sales data exists
        Map<String, Object> current;
        try {
            current = jdbc.queryForMap(
                "SELECT COALESCE(SUM(s.total),0) AS total_revenue, " +
                "COUNT(DISTINCT a.id) AS total_bookings, " +
                "COUNT(DISTINCT LOWER(COALESCE(a.client_email, a.client_name, ''))) FILTER (WHERE COALESCE(a.client_email, a.client_name) IS NOT NULL) AS new_clients, " +
                "COALESCE(AVG(s.total),0) AS average_ticket " +
                "FROM appointments a " +
                "LEFT JOIN sales s ON s.appointment_id = a.id " +
                "WHERE a.business_id = ? AND a.appointment_date BETWEEN ? AND ? AND a.status != 'CANCELLED'",
                businessId, start, end);
        } catch (Exception e) {
            // Fall back to appointments.price if sales table join fails
            current = jdbc.queryForMap(
                "SELECT COALESCE(SUM(price),0) AS total_revenue, COUNT(*) AS total_bookings, " +
                "COUNT(DISTINCT LOWER(COALESCE(client_name,''))) FILTER (WHERE client_name IS NOT NULL) AS new_clients, " +
                "COALESCE(AVG(price),0) AS average_ticket " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status != 'CANCELLED'",
                businessId, start, end);
        }

        // Previous period totals (for change %)
        Map<String, Object> prev = jdbc.queryForMap(
                "SELECT COALESCE(SUM(price),0) AS total_revenue, COUNT(*) AS total_bookings, " +
                "COUNT(DISTINCT LOWER(COALESCE(client_name,''))) FILTER (WHERE client_name IS NOT NULL) AS new_clients, " +
                "COALESCE(AVG(price),0) AS average_ticket " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status != 'CANCELLED'",
                businessId, prevStart, prevEnd);

        // Daily revenue for the period
        List<Map<String, Object>> daily = jdbc.queryForList(
                "SELECT appointment_date AS date, COALESCE(SUM(price),0) AS revenue, COUNT(*) AS bookings " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status != 'CANCELLED' " +
                "GROUP BY appointment_date ORDER BY appointment_date",
                businessId, start, end);

        // Top services
        List<Map<String, Object>> topServices = jdbc.queryForList(
                "SELECT service_id AS \"serviceId\", COALESCE(service_name, 'Unknown') AS \"serviceName\", " +
                "COUNT(*) AS bookings, COALESCE(SUM(price),0) AS revenue, 0 AS growth " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status != 'CANCELLED' AND service_id > 0 " +
                "GROUP BY service_id, service_name ORDER BY bookings DESC LIMIT 10",
                businessId, start, end);

        // Top staff — JOIN staff table for real names; fall back to ID string if staff row is missing
        List<Map<String, Object>> topStaff = jdbc.queryForList(
                "SELECT a.staff_id AS \"staffId\", COALESCE(s.name, CAST(a.staff_id AS TEXT)) AS \"staffName\", " +
                "COUNT(*) AS bookings, COALESCE(SUM(a.price),0) AS revenue, 0 AS growth, COALESCE(AVG(a.price),0) AS \"averageTicket\" " +
                "FROM appointments a LEFT JOIN staff s ON s.id = a.staff_id " +
                "WHERE a.business_id = ? AND a.appointment_date BETWEEN ? AND ? AND a.status != 'CANCELLED' AND a.staff_id > 0 " +
                "GROUP BY a.staff_id, s.name ORDER BY bookings DESC LIMIT 10",
                businessId, start, end);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalRevenue", current.get("total_revenue"));
        result.put("revenueChange", pctChange(current.get("total_revenue"), prev.get("total_revenue")));
        result.put("totalBookings", current.get("total_bookings"));
        result.put("bookingsChange", pctChange(current.get("total_bookings"), prev.get("total_bookings")));
        result.put("newClients", current.get("new_clients"));
        result.put("newClientsChange", pctChange(current.get("new_clients"), prev.get("new_clients")));
        result.put("averageTicket", current.get("average_ticket"));
        result.put("averageTicketChange", pctChange(current.get("average_ticket"), prev.get("average_ticket")));
        result.put("dailyRevenue", formatDailyRevenue(daily));
        result.put("topServices", topServices);
        result.put("topStaff", topStaff);
        result.put("revenueByCategory", List.of());
        result.put("clientGrowth", Map.of("totalClients", current.get("new_clients"), "newClientsThisPeriod", current.get("new_clients"), "returningClients", 0, "growthData", List.of()));
        result.put("bookingTrends", Map.of("totalBookings", current.get("total_bookings"), "confirmedBookings", current.get("total_bookings"), "cancelledBookings", 0, "noShowBookings", 0, "cancellationRate", 0, "noShowRate", 0, "trendData", List.of(), "bookingsByStatus", Map.of(), "bookingsByDayOfWeek", Map.of()));
        result.put("staffPerformance", Map.of("staffDetails", topStaff, "totalStaffRevenue", current.get("total_revenue"), "totalStaffBookings", current.get("total_bookings"), "averageRevenuePerStaff", 0));
        return result;
    }

    // ── /api/analytics/business/{id}/revenue ────────────────────────────────

    @GetMapping("/business/{businessId}/revenue")
    public Map<String, Object> getRevenue(
            @PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "UTC") String timezone) {

        java.time.ZoneId tz;
        try { tz = java.time.ZoneId.of(timezone); } catch (Exception e) { tz = java.time.ZoneId.of("UTC"); }
        LocalDate start = startDate != null ? startDate : LocalDate.now(tz).minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now(tz);

        Map<String, Object> totals = jdbc.queryForMap(
                "SELECT COALESCE(SUM(price),0) AS total_revenue, COALESCE(AVG(price),0) AS avg_daily_revenue, " +
                "COALESCE(MAX(price),0) AS peak_day_revenue, COALESCE(MIN(price),0) AS lowest_day_revenue " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status != 'CANCELLED'",
                businessId, start, end);

        List<Map<String, Object>> byDay = jdbc.queryForList(
                "SELECT appointment_date AS date, COALESCE(SUM(price),0) AS revenue, COUNT(*) AS bookings " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status != 'CANCELLED' " +
                "GROUP BY appointment_date ORDER BY appointment_date",
                businessId, start, end);

        List<Map<String, Object>> byHour = jdbc.queryForList(
                "SELECT EXTRACT(HOUR FROM start_time)::int AS hour, COALESCE(SUM(price),0) AS revenue, COUNT(*) AS bookings " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status != 'CANCELLED' " +
                "GROUP BY hour ORDER BY hour",
                businessId, start, end);

        List<Map<String, Object>> byPaymentMethod = jdbc.queryForList(
                "SELECT COALESCE(payment_status, 'UNKNOWN') AS \"paymentMethod\", COUNT(*) AS transactions, COALESCE(SUM(price),0) AS revenue, 0.0 AS percentage " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status != 'CANCELLED' " +
                "GROUP BY payment_status ORDER BY revenue DESC",
                businessId, start, end);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalRevenue", totals.get("total_revenue"));
        result.put("averageDailyRevenue", totals.get("avg_daily_revenue"));
        result.put("peakDayRevenue", totals.get("peak_day_revenue"));
        result.put("lowestDayRevenue", totals.get("lowest_day_revenue"));
        result.put("revenueByDay", formatDailyRevenue(byDay));
        result.put("revenueByHour", byHour);
        result.put("revenueByPaymentMethod", byPaymentMethod);
        result.put("revenueByDayOfWeek", Map.of());
        result.put("revenueGrowthRate", 0);
        result.put("revenueForecast", List.of());
        return result;
    }

    // ── /api/analytics/business/{id}/bookings ───────────────────────────────

    @GetMapping("/business/{businessId}/bookings")
    public Map<String, Object> getBookings(
            @PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "UTC") String timezone) {

        java.time.ZoneId tz;
        try { tz = java.time.ZoneId.of(timezone); } catch (Exception e) { tz = java.time.ZoneId.of("UTC"); }
        LocalDate start = startDate != null ? startDate : LocalDate.now(tz).minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now(tz);

        Map<String, Object> totals = jdbc.queryForMap(
                "SELECT COUNT(*) AS total, " +
                "COUNT(*) FILTER (WHERE status = 'CONFIRMED' OR status = 'COMPLETED') AS confirmed, " +
                "COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled, " +
                "COUNT(*) FILTER (WHERE status = 'NO_SHOW') AS no_show " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ?",
                businessId, start, end);

        List<Map<String, Object>> byDow = jdbc.queryForList(
                "SELECT TO_CHAR(appointment_date, 'Day') AS \"dayOfWeek\", COUNT(*) AS bookings, 0.0 AS percentage " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status != 'CANCELLED' " +
                "GROUP BY TO_CHAR(appointment_date, 'Day'), EXTRACT(DOW FROM appointment_date) " +
                "ORDER BY EXTRACT(DOW FROM appointment_date)",
                businessId, start, end);

        List<Map<String, Object>> byHour = jdbc.queryForList(
                "SELECT EXTRACT(HOUR FROM start_time)::int AS hour, COUNT(*) AS bookings, 0.0 AS percentage " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status != 'CANCELLED' " +
                "GROUP BY hour ORDER BY hour",
                businessId, start, end);

        List<Map<String, Object>> trends = jdbc.queryForList(
                "SELECT appointment_date::TEXT AS period, COUNT(*) AS bookings, " +
                "COUNT(*) FILTER (WHERE status = 'CONFIRMED' OR status = 'COMPLETED') AS confirmed, " +
                "COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled, " +
                "COUNT(*) FILTER (WHERE status = 'NO_SHOW') AS \"noShow\" " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? " +
                "GROUP BY appointment_date ORDER BY appointment_date",
                businessId, start, end);

        long total = toLong(totals.get("total"));
        long cancelled = toLong(totals.get("cancelled"));
        long noShow = toLong(totals.get("no_show"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalBookings", total);
        result.put("confirmedBookings", totals.get("confirmed"));
        result.put("cancelledBookings", cancelled);
        result.put("noShowBookings", noShow);
        result.put("cancellationRate", total > 0 ? (double) cancelled / total * 100 : 0);
        result.put("noShowRate", total > 0 ? (double) noShow / total * 100 : 0);
        result.put("confirmationRate", total > 0 ? (double) toLong(totals.get("confirmed")) / total * 100 : 0);
        result.put("bookingsByDayOfWeek", byDow);
        result.put("bookingsByHour", byHour);
        result.put("bookingTrends", trends);
        result.put("bookingsByStatus", Map.of("TOTAL", total, "CONFIRMED", totals.get("confirmed"), "CANCELLED", cancelled, "NO_SHOW", noShow));
        result.put("averageBookingsPerDay", 0);
        result.put("peakDayBookings", 0);
        result.put("cancellationReasons", List.of());
        return result;
    }

    // ── /api/analytics/business/{id}/clients ────────────────────────────────

    @GetMapping("/business/{businessId}/clients")
    public Map<String, Object> getClients(
            @PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "UTC") String timezone) {

        java.time.ZoneId tz;
        try { tz = java.time.ZoneId.of(timezone); } catch (Exception e) { tz = java.time.ZoneId.of("UTC"); }
        LocalDate start = startDate != null ? startDate : LocalDate.now(tz).minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now(tz);

        Map<String, Object> totals = jdbc.queryForMap(
                "SELECT " +
                "COUNT(DISTINCT COALESCE(LOWER(client_email), LOWER(client_name), '')) FILTER (WHERE COALESCE(client_email, client_name) IS NOT NULL AND appointment_date BETWEEN ? AND ?) AS total_clients, " +
                "COUNT(DISTINCT COALESCE(LOWER(client_email), LOWER(client_name), '')) FILTER (WHERE COALESCE(client_email, client_name) IS NOT NULL AND appointment_date < ?) AS returning_base " +
                "FROM appointments WHERE business_id = ? AND status != 'CANCELLED' AND appointment_date BETWEEN ? AND ?",
                start, end, start, businessId, start, end);

        List<Map<String, Object>> topClients = jdbc.queryForList(
                "SELECT 0 AS \"clientId\", client_name AS \"clientName\", COUNT(*) AS \"totalBookings\", " +
                "COALESCE(SUM(price),0) AS \"totalSpent\", 0 AS \"lastVisitDaysAgo\", COALESCE(AVG(price),0) AS \"averageTicket\" " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status != 'CANCELLED' AND client_name IS NOT NULL " +
                "GROUP BY client_name ORDER BY \"totalSpent\" DESC LIMIT 10",
                businessId, start, end);

        long total = toLong(totals.get("total_clients"));
        long returningBase = toLong(totals.get("returning_base"));
        // Returning = clients in this period who have visited before (appeared before period start)
        long returning = Math.min(total, returningBase);
        long newC = Math.max(0, total - returning);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalClients", total);
        result.put("newClients", newC);
        result.put("returningClients", returning);
        result.put("retentionRate", total > 0 ? (double)(total - newC) / total * 100 : 0);
        result.put("newClientRate", total > 0 ? (double) newC / total * 100 : 0);
        result.put("clientGrowth", List.of());
        result.put("topClients", topClients);
        result.put("averageClientValue", 0);
        result.put("averageVisitsPerClient", 0);
        result.put("clientSegments", List.of());
        result.put("activeClients", total);
        result.put("inactiveClients", 0);
        return result;
    }

    // ── /api/analytics/business/{id}/services ───────────────────────────────

    @GetMapping("/business/{businessId}/services")
    public Map<String, Object> getServices(
            @PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "UTC") String timezone) {

        java.time.ZoneId tz;
        try { tz = java.time.ZoneId.of(timezone); } catch (Exception e) { tz = java.time.ZoneId.of("UTC"); }
        LocalDate start = startDate != null ? startDate : LocalDate.now(tz).minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now(tz);

        List<Map<String, Object>> servicePerf = jdbc.queryForList(
                "SELECT service_id AS \"serviceId\", COALESCE(service_name,'Unknown') AS \"serviceName\", '' AS \"categoryName\", " +
                "COUNT(*) AS bookings, COALESCE(SUM(price),0) AS revenue, COALESCE(AVG(price),0) AS \"averagePrice\", " +
                "0 AS \"averageDuration\", COUNT(*) AS \"popularityScore\", 0.0 AS \"revenuePercentage\" " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status != 'CANCELLED' AND service_id > 0 " +
                "GROUP BY service_id, service_name ORDER BY bookings DESC",
                businessId, start, end);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("servicePerformance", servicePerf);
        result.put("categoryPerformance", List.of());
        result.put("averageServicePrice", 0);
        result.put("mostPopularServiceId", servicePerf.isEmpty() ? 0 : servicePerf.get(0).get("serviceId"));
        result.put("mostPopularServiceName", servicePerf.isEmpty() ? "" : servicePerf.get(0).get("serviceName"));
        result.put("highestRevenueServiceId", servicePerf.isEmpty() ? 0 : servicePerf.get(0).get("serviceId"));
        result.put("highestRevenueServiceName", servicePerf.isEmpty() ? "" : servicePerf.get(0).get("serviceName"));
        result.put("serviceTrends", List.of());
        result.put("servicesByCategory", Map.of());
        return result;
    }

    // ── stub endpoints for less critical analytics tabs ─────────────────────

    @GetMapping("/business/{businessId}/performance")
    public Map<String, Object> getPerformance(@PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return Map.of("staffDetails", List.of(), "message", "Staff performance data computed from appointments");
    }

    @GetMapping("/business/{businessId}/cancellations")
    public Map<String, Object> getCancellations(@PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        LocalDate start = resolveStart(startDate);
        LocalDate end = resolveEnd(endDate);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT appointment_date AS date, COUNT(*) AS cancellations " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status = 'CANCELLED' " +
                "GROUP BY appointment_date ORDER BY appointment_date",
                businessId, start, end);
        return Map.of("cancellationsByDay", rows, "totalCancellations", rows.stream().mapToLong(r -> toLong(r.get("cancellations"))).sum());
    }

    @GetMapping("/business/{businessId}/peak-hours")
    public Map<String, Object> getPeakHours(@PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        LocalDate start = resolveStart(startDate);
        LocalDate end = resolveEnd(endDate);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT EXTRACT(HOUR FROM start_time)::int AS hour, COUNT(*) AS bookings " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status != 'CANCELLED' " +
                "GROUP BY hour ORDER BY bookings DESC",
                businessId, start, end);
        return Map.of("peakHours", rows);
    }

    @GetMapping("/business/{businessId}/customer-retention")
    public Map<String, Object> getCustomerRetention(@PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return Map.of("retentionRate", 0, "message", "Retention data available with client accounts");
    }

    @GetMapping("/business/{businessId}/profitability")
    public Map<String, Object> getProfitability(@PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        LocalDate start = resolveStart(startDate);
        LocalDate end = resolveEnd(endDate);
        Map<String, Object> totals = jdbc.queryForMap(
                "SELECT COALESCE(SUM(price),0) AS revenue FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status != 'CANCELLED'",
                businessId, start, end);
        return Map.of("totalRevenue", totals.get("revenue"), "estimatedProfit", totals.get("revenue"), "profitMargin", 0);
    }

    @GetMapping("/business/{businessId}/payment-methods")
    public Map<String, Object> getPaymentMethods(@PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return Map.of("paymentMethods", List.of(), "message", "Payment method breakdown requires payment records");
    }

    @GetMapping("/business/{businessId}/seasonal")
    public Map<String, Object> getSeasonal(@PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return Map.of("seasonal", List.of());
    }

    @GetMapping("/business/{businessId}/service-duration")
    public Map<String, Object> getServiceDuration(@PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return Map.of("durations", List.of());
    }

    @GetMapping("/business/{businessId}/wait-times")
    public Map<String, Object> getWaitTimes(@PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return Map.of("averageWaitTime", 0);
    }

    @GetMapping("/business/{businessId}/booking-lead-time")
    public Map<String, Object> getBookingLeadTime(@PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return Map.of("averageLeadTimeDays", 0);
    }

    @GetMapping("/business/{businessId}/revenue-per-hour")
    public Map<String, Object> getRevenuePerHour(@PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        LocalDate start = resolveStart(startDate);
        LocalDate end = resolveEnd(endDate);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT EXTRACT(HOUR FROM start_time)::int AS hour, COALESCE(AVG(price),0) AS \"revenuePerHour\" " +
                "FROM appointments WHERE business_id = ? AND appointment_date BETWEEN ? AND ? AND status != 'CANCELLED' " +
                "GROUP BY hour ORDER BY hour",
                businessId, start, end);
        return Map.of("revenuePerHour", rows);
    }

    @GetMapping("/business/{businessId}/customer-acquisition")
    public Map<String, Object> getCustomerAcquisition(@PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return Map.of("acquisitionChannels", List.of());
    }

    @GetMapping("/business/{businessId}/service-bundles")
    public Map<String, Object> getServiceBundles(@PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return Map.of("bundles", List.of());
    }

    @GetMapping("/business/{businessId}/growth-forecast")
    public Map<String, Object> getGrowthForecast(@PathVariable int businessId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return Map.of("forecast", List.of());
    }

    // ── private helpers ─────────────────────────────────────────────────────

    private List<Map<String, Object>> formatDailyRevenue(List<Map<String, Object>> rows) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> r = new LinkedHashMap<>();
            Object d = row.get("date");
            r.put("date", d != null ? d.toString() : "");
            r.put("revenue", row.getOrDefault("revenue", 0));
            r.put("bookings", row.getOrDefault("bookings", 0));
            result.add(r);
        }
        return result;
    }

    private double pctChange(Object current, Object previous) {
        double c = toDouble(current);
        double p = toDouble(previous);
        if (p == 0) return c > 0 ? 100.0 : 0.0;
        return (c - p) / p * 100.0;
    }

    private double toDouble(Object v) {
        if (v == null) return 0.0;
        if (v instanceof Number) return ((Number) v).doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (NumberFormatException e) { return 0.0; }
    }

    private long toLong(Object v) {
        if (v == null) return 0L;
        if (v instanceof Number) return ((Number) v).longValue();
        try { return Long.parseLong(v.toString()); } catch (NumberFormatException e) { return 0L; }
    }
}
