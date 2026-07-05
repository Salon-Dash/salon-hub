package com.booksy.booking.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Realtime broker for calendar/sales/time-off updates.
 *
 * The SockJS HTTP handshake at {@code /ws} is public (the gateway lets it through),
 * but that only opens a pipe — it carries no identity. Authentication and per-tenant
 * authorization happen at the STOMP layer via {@link #configureClientInboundChannel}:
 *
 *   - CONNECT: the client sends {@code Authorization: Bearer <jwt>}; we verify it with
 *     the shared secret and stash the caller's userId/role on the WS session.
 *   - SUBSCRIBE: appointment/sales/time-off topics are keyed by businessId (or staffId,
 *     which resolves to a business). We only let a caller subscribe to a business they
 *     own — otherwise any anonymous client could stream every tenant's live
 *     appointments (client name/email/phone/price). ADMINs bypass.
 *
 * Ownership is a single cheap query against the shared database.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger log = LoggerFactory.getLogger(WebSocketConfig.class);

    // /topic/appointments/staff/{staffId} — resolve the staff's business, then check ownership.
    private static final Pattern STAFF_TOPIC = Pattern.compile("^/topic/appointments/staff/(\\d+)$");
    // /topic/{appointments|sales|time-off}/{businessId}
    private static final Pattern BIZ_TOPIC = Pattern.compile("^/topic/(?:appointments|sales|time-off)/(\\d+)$");

    private final JdbcTemplate jdbc;

    @Value("${jwt.secret:local-dev-only-secret-change-in-prod!!}")
    private String jwtSecret;

    private SecretKey key;

    public WebSocketConfig(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private SecretKey signingKey() {
        if (key == null) {
            key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        }
        return key;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(
                    "http://localhost:5173",
                    "http://localhost:3000",
                    // Named production origin only — the broad "https://*.vercel.app"
                    // wildcard let any Vercel-hosted site open a handshake.
                    "https://salon-hub-omega.vercel.app",
                    // Dashboard served directly from the VPS (nginx) — same origin as /ws.
                    // Without this the browser SockJS handshake is rejected and realtime
                    // calendar updates silently stop working on the VPS deployment.
                    "http://187.124.190.92",
                    "http://187.124.190.92:*"
                )
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor acc = StompHeaderAccessor.wrap(message);
                StompCommand cmd = acc.getCommand();
                if (StompCommand.CONNECT.equals(cmd)) {
                    authenticate(acc);
                } else if (StompCommand.SUBSCRIBE.equals(cmd)) {
                    authorizeSubscription(acc);
                }
                return message;
            }
        });
    }

    /** Validate the JWT on CONNECT and stash identity on the session for later frames. */
    private void authenticate(StompHeaderAccessor acc) {
        Map<String, Object> attrs = acc.getSessionAttributes();
        if (attrs == null) return;
        String auth = acc.getFirstNativeHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) return; // stays unauthenticated
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey())
                    .build()
                    .parseSignedClaims(auth.substring(7))
                    .getPayload();
            Object userId = claims.get("userId");
            String role = claims.get("role", String.class);
            if (userId != null) attrs.put("userId", Long.valueOf(String.valueOf(userId)));
            if (role != null) attrs.put("role", role);
        } catch (Exception e) {
            // Leave the session unauthenticated — SUBSCRIBE to tenant topics will be denied.
            log.debug("WS CONNECT with invalid token: {}", e.getMessage());
        }
    }

    /** Only allow subscribing to a business topic the caller owns (ADMIN bypasses). */
    private void authorizeSubscription(StompHeaderAccessor acc) {
        String dest = acc.getDestination();
        if (dest == null) return;
        Long businessId = businessIdForDestination(dest);
        if (businessId == null) return; // not a tenant-scoped topic — allow

        Map<String, Object> attrs = acc.getSessionAttributes();
        Object role = attrs == null ? null : attrs.get("role");
        if ("ADMIN".equalsIgnoreCase(String.valueOf(role))) return;

        Object uid = attrs == null ? null : attrs.get("userId");
        if (!(uid instanceof Long) || !ownsBusiness((Long) uid, businessId)) {
            log.debug("WS SUBSCRIBE denied: user={} not owner of business for {}", uid, dest);
            throw new MessagingException("Not authorized to subscribe to " + dest);
        }
    }

    private Long businessIdForDestination(String dest) {
        Matcher sm = STAFF_TOPIC.matcher(dest);
        if (sm.matches()) {
            long staffId = Long.parseLong(sm.group(1));
            return jdbc.query("SELECT business_id FROM staff WHERE id = ?",
                    rs -> rs.next() ? rs.getLong(1) : null, staffId);
        }
        Matcher bm = BIZ_TOPIC.matcher(dest);
        if (bm.matches()) return Long.parseLong(bm.group(1));
        return null;
    }

    /** Fails closed: an unknown or ownerless business is not owned by anyone over WS. */
    private boolean ownsBusiness(long userId, long businessId) {
        Long owner = jdbc.query("SELECT owner_id FROM businesses WHERE id = ?",
                rs -> rs.next() ? (Long) rs.getObject(1, Long.class) : null, businessId);
        return owner != null && owner == userId;
    }
}
