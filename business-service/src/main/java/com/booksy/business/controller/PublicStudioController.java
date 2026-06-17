package com.booksy.business.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/public/studios")
public class PublicStudioController {

    private final JdbcTemplate jdbcTemplate;

    public PublicStudioController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // -------------------------------------------------------------------------
    // List endpoint — batch-fetch services and staff to avoid N+1 queries.
    // For N businesses this used to fire 1 + N + N queries; now it fires 3.
    // -------------------------------------------------------------------------
    @GetMapping
    public List<PublicStudioDto> listStudios(
            @RequestParam(required = false, defaultValue = "") String query,
            @RequestParam(required = false) Double minLat,
            @RequestParam(required = false) Double maxLat,
            @RequestParam(required = false) Double minLng,
            @RequestParam(required = false) Double maxLng,
            @RequestParam(required = false) Integer limit) {

        StringBuilder sql = new StringBuilder(
                "SELECT id, name, address, latitude, longitude, status FROM businesses WHERE 1=1"
        );
        List<Object> args = new ArrayList<>();

        if (query != null && !query.isBlank()) {
            String likeValue = "%" + query.trim().toLowerCase() + "%";
            sql.append(" AND (LOWER(name) LIKE ? OR LOWER(COALESCE(address, '')) LIKE ?)");
            args.add(likeValue);
            args.add(likeValue);
        }
        if (minLat != null) {
            sql.append(" AND latitude >= ?");
            args.add(minLat);
        }
        if (maxLat != null) {
            sql.append(" AND latitude <= ?");
            args.add(maxLat);
        }
        if (minLng != null) {
            sql.append(" AND longitude >= ?");
            args.add(minLng);
        }
        if (maxLng != null) {
            sql.append(" AND longitude <= ?");
            args.add(maxLng);
        }

        sql.append(" ORDER BY id DESC");
        int safeLimit = (limit != null && limit > 0 && limit <= 200) ? limit : 100;
        sql.append(" LIMIT ?");
        args.add(safeLimit);

        // Step 1: Fetch businesses (fields only — no nested queries).
        List<StudioRow> rows = jdbcTemplate.query(sql.toString(), this::mapStudioRow, args.toArray());

        if (rows.isEmpty()) {
            return List.of();
        }

        // Step 2: Collect IDs for batch fetch.
        // IDs originate from our own DB query result, not from user input,
        // so building the IN clause via string interpolation is safe here.
        String inClause = rows.stream()
                .map(r -> String.valueOf(r.id()))
                .collect(Collectors.joining(","));

        // Step 3: Batch fetch all active services for these businesses (1 query).
        List<Map<String, Object>> allServices = jdbcTemplate.queryForList(
                "SELECT s.id, s.business_id, s.price " +
                "FROM services s " +
                "WHERE s.business_id IN (" + inClause + ") " +
                "  AND COALESCE(s.is_active, true) = true " +
                "  AND COALESCE(s.is_visible, true) = true");

        // Step 4: Batch fetch all active staff for these businesses (1 query).
        List<Map<String, Object>> allStaff = jdbcTemplate.queryForList(
                "SELECT id, business_id " +
                "FROM staff " +
                "WHERE business_id IN (" + inClause + ") " +
                "  AND COALESCE(is_active, true) = true");

        log.debug("Fetched {} businesses with {} services and {} staff in 3 queries",
                rows.size(), allServices.size(), allStaff.size());

        // Step 5: Group by businessId for O(1) lookup.
        Map<Long, List<Map<String, Object>>> servicesByBusiness = allServices.stream()
                .collect(Collectors.groupingBy(r -> ((Number) r.get("business_id")).longValue()));

        Map<Long, List<Map<String, Object>>> staffByBusiness = allStaff.stream()
                .collect(Collectors.groupingBy(r -> ((Number) r.get("business_id")).longValue()));

        // Step 6: Enrich each studio row into the final DTO.
        return rows.stream().map(row -> {
            List<Map<String, Object>> bizServices = servicesByBusiness.getOrDefault(row.id(), List.of());
            boolean hasTeam = !staffByBusiness.getOrDefault(row.id(), List.of()).isEmpty();
            double minPrice = bizServices.stream()
                    .mapToDouble(s -> {
                        Number p = (Number) s.get("price");
                        return p == null ? 0d : p.doubleValue();
                    })
                    .filter(p -> p > 0)
                    .min()
                    .orElse(0d);

            return new PublicStudioDto(
                    row.id(),
                    row.name(),
                    row.address(),
                    row.latitude(),
                    row.longitude(),
                    minPrice == 0d ? null : minPrice,
                    hasTeam,
                    false   // reviews not yet implemented
            );
        }).toList();
    }

    // -------------------------------------------------------------------------
    // Single-studio detail endpoint.
    // Runs the main query first, then fetches services and staff separately —
    // keeping queries outside the RowMapper so they don't run inside the
    // ResultSet iteration loop.
    // -------------------------------------------------------------------------
    @GetMapping("/{studioId}")
    public PublicStudioDetailDto getStudio(@PathVariable long studioId) {
        String sql =
                "SELECT id, name, address, latitude, longitude, description, phone, website, category " +
                "FROM businesses WHERE id = ? LIMIT 1";

        // Step 1: Map the business row only (no nested queries inside the mapper).
        List<StudioDetailRow> rows = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new StudioDetailRow(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getString("address"),
                        getNullableDouble(rs, "latitude"),
                        getNullableDouble(rs, "longitude"),
                        rs.getString("description"),
                        rs.getString("phone"),
                        rs.getString("website"),
                        rs.getString("category")
                ),
                studioId
        );

        if (rows.isEmpty()) {
            throw new StudioNotFoundException();
        }

        StudioDetailRow row = rows.get(0);

        // Step 2 & 3: Fetch services and staff after the ResultSet is closed.
        List<PublicServiceDto> services = fetchServices(studioId);
        List<PublicStaffDto> staff = fetchStaff(studioId);

        log.debug("Fetched studio {} with {} services and {} staff in 3 queries",
                studioId, services.size(), staff.size());

        return new PublicStudioDetailDto(
                row.id(),
                row.name(),
                row.address(),
                row.latitude(),
                row.longitude(),
                row.description(),
                row.phone(),
                row.website(),
                row.category(),
                services,
                staff,
                List.of()
        );
    }

    // -------------------------------------------------------------------------
    // RowMapper helpers — extract fields only, no secondary queries.
    // -------------------------------------------------------------------------

    private StudioRow mapStudioRow(ResultSet rs, int rowNum) throws SQLException {
        return new StudioRow(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("address"),
                getNullableDouble(rs, "latitude"),
                getNullableDouble(rs, "longitude")
        );
    }

    private Double getNullableDouble(ResultSet rs, String column) throws SQLException {
        double value = rs.getDouble(column);
        return rs.wasNull() ? null : value;
    }

    // -------------------------------------------------------------------------
    // Per-studio service/staff fetchers (used only by the single-detail
    // endpoint which by definition fetches one business at a time).
    // -------------------------------------------------------------------------

    private List<PublicServiceDto> fetchServices(long studioId) {
        String sql =
                "SELECT s.id, s.name, s.duration, s.price, s.description, s.service_type, c.name AS category_name " +
                "FROM services s LEFT JOIN categories c ON c.id = s.category_id " +
                "WHERE s.business_id = ? AND COALESCE(s.is_active, true) = true " +
                "AND COALESCE(s.is_visible, true) = true ORDER BY s.id ASC";
        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new PublicServiceDto(
                        rs.getLong("id"),
                        rs.getString("name"),
                        getDurationMinutes(rs),
                        getNullablePrice(rs, "price"),
                        rs.getString("description"),
                        rs.getString("service_type"),
                        rs.getString("category_name")
                ),
                studioId
        );
    }

    private List<PublicStaffDto> fetchStaff(long studioId) {
        String sql =
                "SELECT id, name, position FROM staff " +
                "WHERE business_id = ? AND COALESCE(is_active, true) = true ORDER BY id ASC";
        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new PublicStaffDto(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getString("position")
                ),
                studioId
        );
    }

    private int getDurationMinutes(ResultSet rs) throws SQLException {
        Number value = (Number) rs.getObject("duration");
        return value == null ? 0 : value.intValue();
    }

    private double getNullablePrice(ResultSet rs, String column) throws SQLException {
        Number value = (Number) rs.getObject(column);
        return value == null ? 0d : value.doubleValue();
    }

    // -------------------------------------------------------------------------
    // Internal intermediate records (not exposed in the API).
    // -------------------------------------------------------------------------

    private record StudioRow(
            long id,
            String name,
            String address,
            Double latitude,
            Double longitude
    ) {}

    private record StudioDetailRow(
            long id,
            String name,
            String address,
            Double latitude,
            Double longitude,
            String description,
            String phone,
            String website,
            String category
    ) {}

    // -------------------------------------------------------------------------
    // Public API DTOs.
    // -------------------------------------------------------------------------

    public record PublicStudioDto(
            long id,
            String name,
            String businessAddress,
            Double latitude,
            Double longitude,
            Double minPrice,
            boolean hasTeam,
            boolean hasReviews
    ) {}

    public record PublicStudioDetailDto(
            long id,
            String name,
            String businessAddress,
            Double latitude,
            Double longitude,
            String about,
            String phone,
            String website,
            String category,
            List<PublicServiceDto> services,
            List<PublicStaffDto> staff,
            List<Object> reviews
    ) {}

    public record PublicServiceDto(
            long id,
            String name,
            int durationMinutes,
            double price,
            String description,
            String serviceType,
            String category
    ) {}

    public record PublicStaffDto(
            long id,
            String fullName,
            String role
    ) {}

    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NOT_FOUND)
    private static class StudioNotFoundException extends RuntimeException {}
}
