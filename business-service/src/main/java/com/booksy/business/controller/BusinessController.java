package com.booksy.business.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/businesses")
public class BusinessController {

    private final JdbcTemplate jdbc;

    public BusinessController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** POST /api/businesses — create a new business */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createBusiness(@RequestBody Map<String, Object> body) {
        Long ownerId = body.get("ownerId") != null
                ? Long.parseLong(body.get("ownerId").toString()) : null;
        String name = (String) body.getOrDefault("name", "My Business");
        String category = (String) body.getOrDefault("category", null);
        String address = (String) body.getOrDefault("address", null);
        String city = (String) body.getOrDefault("city", null);
        String country = (String) body.getOrDefault("country", null);
        String phone = (String) body.getOrDefault("phone", null);
        Double latitude = body.get("latitude") != null
                ? Double.parseDouble(body.get("latitude").toString()) : null;
        Double longitude = body.get("longitude") != null
                ? Double.parseDouble(body.get("longitude").toString()) : null;

        String fullAddress = address != null && city != null
                ? address + ", " + city + (country != null ? ", " + country : "")
                : address;

        // Use RETURNING id — PostgreSQL native, avoids KeyHolder issues
        Long businessId = jdbc.queryForObject(
                "INSERT INTO businesses (name, owner_id, category, address, latitude, longitude, phone, status) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE') RETURNING id",
                Long.class,
                name, ownerId, category, fullAddress, latitude, longitude, phone);

        log.info("Created business id={} name='{}' ownerId={}", businessId, name, ownerId);

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, name, owner_id, category, address, latitude, longitude, phone, website, description, status, created_at " +
                "FROM businesses WHERE id = ?", businessId);
        if (rows.isEmpty()) return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(rows.get(0)));
    }

    /** GET /api/businesses/{id} — get business by ID */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getBusinessById(@PathVariable Long id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, name, owner_id, category, address, latitude, longitude, phone, website, description, status, created_at " +
                "FROM businesses WHERE id = ?", id);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(toDto(rows.get(0)));
    }

    /** GET /api/businesses/owner/{ownerId} — list businesses for an owner */
    @GetMapping("/owner/{ownerId}")
    public ResponseEntity<List<Map<String, Object>>> getByOwner(@PathVariable Long ownerId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, name, owner_id, category, address, latitude, longitude, phone, website, description, status, created_at " +
                "FROM businesses WHERE owner_id = ? ORDER BY created_at DESC", ownerId);
        List<Map<String, Object>> result = rows.stream().map(this::toDto).toList();
        return ResponseEntity.ok(result);
    }

    /** PUT /api/businesses/{id} — update business */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateBusiness(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        jdbc.update(
                "UPDATE businesses SET name=COALESCE(?,name), category=COALESCE(?,category), " +
                "address=COALESCE(?,address), phone=COALESCE(?,phone), website=COALESCE(?,website), " +
                "description=COALESCE(?,description) WHERE id=?",
                body.get("name"), body.get("category"), body.get("address"),
                body.get("phone"), body.get("website"), body.get("description"), id);
        return getBusinessById(id);
    }

    private Map<String, Object> toDto(Map<String, Object> row) {
        Map<String, Object> dto = new HashMap<>(row);
        // camelCase aliases for frontend compatibility
        dto.put("ownerId", row.get("owner_id"));
        dto.put("createdAt", row.get("created_at"));
        return dto;
    }
}
