package com.booksy.catalog.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Enforces tenant (business) ownership on every incoming request, using the
 * trusted identity headers injected by the gateway (X-User-Id / X-User-Role).
 *
 * The gateway is the only ingress and has already authenticated the caller; this
 * filter answers the second question — "may THIS user touch THIS business's data?"
 * It resolves the businessId a request targets (from the path, query, a resource-id
 * lookup, or the JSON body) and rejects with 403 when it does not belong to the
 * caller. Platform ADMINs bypass. Requests with no identity header (internal
 * service-to-service calls, or public routes the gateway let through) pass.
 *
 * All business-scoped services share one database, so ownership is a single cheap
 * query against the businesses table — no cross-service call needed.
 */
@Component
public class TenantAuthorizationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(TenantAuthorizationFilter.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final Pattern BUSINESS_IN_PATH = Pattern.compile("/business/(\\d+)");
    private static final Pattern OWNER_IN_PATH = Pattern.compile("/owner/(\\d+)");

    private final JdbcTemplate jdbc;

    /**
     * Comma-separated "pathPrefix:table" pairs. For a request to
     * {pathPrefix}/{numericId} the businessId is resolved via
     * SELECT business_id FROM {table} WHERE id = ?. The special table "@self"
     * means the path id IS the businessId (business-service).
     * Example: "/api/staff:staff" or "/api/businesses:@self,/api/salons:@self".
     */
    @Value("${tenant.mappings:}")
    private String mappingsRaw;

    /**
     * Comma-separated path prefixes that are customer-scoped rather than tenant-owned
     * (e.g. "/api/customer"). Requests to these are authorized by the controller using
     * the caller's own identity — a customer legitimately books at a business they do
     * NOT own, so the businessId in the request must not be treated as a tenant they
     * must own. Ownership checks are skipped for these prefixes.
     */
    @Value("${tenant.exempt-prefixes:}")
    private String exemptRaw;

    private final List<String[]> mappings = new ArrayList<>();

    public TenantAuthorizationFilter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private boolean isExempt(String path) {
        if (exemptRaw == null || exemptRaw.isBlank()) return false;
        for (String prefix : exemptRaw.split(",")) {
            String p = prefix.trim();
            if (!p.isEmpty() && path.startsWith(p)) return true;
        }
        return false;
    }

    private List<String[]> mappings() {
        if (mappings.isEmpty() && mappingsRaw != null && !mappingsRaw.isBlank()) {
            for (String pair : mappingsRaw.split(",")) {
                String[] kv = pair.trim().split(":", 2);
                if (kv.length == 2) mappings.add(new String[]{kv[0].trim(), kv[1].trim()});
            }
        }
        return mappings;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String userIdHeader = request.getHeader("X-User-Id");
        String role = request.getHeader("X-User-Role");

        // No identity → gateway let it through as public, or an internal call. Not ours to gate.
        if (userIdHeader == null || userIdHeader.isBlank()) {
            chain.doFilter(request, response);
            return;
        }
        // Customer-scoped endpoints authorize by the caller's own identity in the
        // controller (a customer books at a business they do not own), so tenant
        // ownership does not apply here.
        if (isExempt(request.getRequestURI())) {
            chain.doFilter(request, response);
            return;
        }
        if ("ADMIN".equalsIgnoreCase(role)) {
            chain.doFilter(request, response);
            return;
        }

        long userId;
        try {
            userId = Long.parseLong(userIdHeader.trim());
        } catch (NumberFormatException e) {
            forbid(response, "Bad user identity");
            return;
        }

        // We may need to read the JSON body; wrap so the controller can re-read it.
        HttpServletRequest req = request;
        byte[] body = null;
        String method = request.getMethod();
        String ct = request.getContentType();
        boolean bodyMethod = "POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method)
                || "PATCH".equalsIgnoreCase(method);
        if (bodyMethod && ct != null && ct.toLowerCase().contains("json")) {
            body = StreamUtils.copyToByteArray(request.getInputStream());
            req = new CachedBodyHttpServletRequest(request, body);
        }

        try {
            // 1. /owner/{ownerId}: the caller must be that owner.
            Matcher om = OWNER_IN_PATH.matcher(request.getRequestURI());
            if (om.find()) {
                long ownerId = Long.parseLong(om.group(1));
                if (ownerId != userId) { forbid(response, "Not your account"); return; }
            }

            // 2. Body ownerId (e.g. creating a business): must be the caller.
            if (body != null) {
                Long bodyOwner = jsonLong(body, "ownerId");
                if (bodyOwner != null && bodyOwner != userId) { forbid(response, "ownerId mismatch"); return; }
            }

            Long businessId = resolveBusinessId(request, body);
            if (businessId != null && !ownsBusiness(userId, businessId)) {
                forbid(response, "Business " + businessId + " does not belong to user " + userId);
                return;
            }
        } catch (NumberFormatException ignored) {
            // Unparseable id — let the controller return its own 400/404.
        }

        chain.doFilter(req, response);
    }

    @Nullable
    private Long resolveBusinessId(HttpServletRequest request, @Nullable byte[] body) {
        String path = request.getRequestURI();

        Matcher bm = BUSINESS_IN_PATH.matcher(path);
        if (bm.find()) return Long.parseLong(bm.group(1));

        String q = request.getParameter("businessId");
        if (q != null && !q.isBlank()) return Long.parseLong(q.trim());

        for (String[] m : mappings()) {
            String prefix = m[0], table = m[1];
            Matcher rm = Pattern.compile("^" + Pattern.quote(prefix) + "/(\\d+)(/.*)?$").matcher(path);
            if (rm.matches()) {
                long id = Long.parseLong(rm.group(1));
                if ("@self".equals(table)) return id;
                return jdbc.query(
                        "SELECT business_id FROM " + table + " WHERE id = ?",
                        rs -> rs.next() ? rs.getLong(1) : null, id);
            }
        }

        if (body != null) return jsonLong(body, "businessId");
        return null;
    }

    private boolean ownsBusiness(long userId, long businessId) {
        Long owner = jdbc.query(
                "SELECT owner_id FROM businesses WHERE id = ?",
                rs -> rs.next() ? (Long) rs.getObject(1, Long.class) : null, businessId);
        // Unknown business → let the controller return 404 rather than masking as 403.
        return owner == null || owner == userId;
    }

    @Nullable
    private Long jsonLong(byte[] body, String field) {
        try {
            JsonNode n = MAPPER.readTree(body);
            JsonNode v = n.get(field);
            return (v != null && v.canConvertToLong()) ? v.asLong() : null;
        } catch (IOException e) {
            return null;
        }
    }

    private void forbid(HttpServletResponse response, String reason) throws IOException {
        log.debug("403 tenant authorization — {}", reason);
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.getWriter().write("{\"status\":403,\"error\":\"Forbidden\",\"message\":\"Access to this resource is not allowed\"}");
    }
}
