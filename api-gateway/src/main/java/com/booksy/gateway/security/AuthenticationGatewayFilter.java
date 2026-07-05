package com.booksy.gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Edge authentication: the gateway is the only ingress (all other services are on
 * the internal Docker network), so it validates the JWT once here and hands
 * downstream services a trusted identity via headers.
 *
 * For every request it:
 *   1. Strips any client-supplied X-User-* headers (anti-spoofing — a caller must
 *      never be able to assert their own identity).
 *   2. Lets public routes through unauthenticated (auth, public customer API, ws).
 *   3. Requires a valid JWT on every other route, returning 401 otherwise.
 *   4. Injects X-User-Id / X-User-Role / X-User-Email from the verified claims so
 *      downstream services can authorize without re-parsing the token.
 */
@Component
public class AuthenticationGatewayFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(AuthenticationGatewayFilter.class);

    public static final String USER_ID_HEADER = "X-User-Id";
    public static final String USER_ROLE_HEADER = "X-User-Role";
    public static final String USER_EMAIL_HEADER = "X-User-Email";

    @Value("${jwt.secret:local-dev-only-secret-change-in-prod!!}")
    private String jwtSecret;

    private SecretKey key;

    private SecretKey signingKey() {
        if (key == null) {
            key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        }
        return key;
    }

    /** Routes reachable without authentication. */
    private boolean isPublic(String method, String path) {
        boolean alwaysPublic = path.startsWith("/api/auth/")
                || path.startsWith("/api/public/")
                || path.equals("/ws") || path.startsWith("/ws/")
                || path.startsWith("/actuator/")
                || path.equals("/actuator/health");
        if (alwaysPublic) return true;
        // Business hours are public salon info that the customer app displays while
        // browsing; only reads are open — writes stay owner-authenticated.
        if ("GET".equalsIgnoreCase(method) && path.startsWith("/api/business-hours/")) return true;
        // Stripe payment webhook: called server-to-server by Stripe with no JWT, so it
        // must be reachable without auth. It is protected by Stripe signature
        // verification (PaymentService.verifyWebhookEvent, which fails closed).
        if ("POST".equalsIgnoreCase(method) && path.equals("/api/payments/webhook")) return true;
        return false;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest incoming = exchange.getRequest();
        String path = incoming.getPath().value();

        // Always drop client-supplied identity headers so they can never be spoofed.
        ServerHttpRequest.Builder builder = incoming.mutate().headers(h -> {
            h.remove(USER_ID_HEADER);
            h.remove(USER_ROLE_HEADER);
            h.remove(USER_EMAIL_HEADER);
        });

        if (isPublic(incoming.getMethod().name(), path)) {
            return chain.filter(exchange.mutate().request(builder.build()).build());
        }

        String authHeader = incoming.getHeaders().getFirst("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return unauthorized(exchange, "Missing bearer token");
        }

        final Claims claims;
        try {
            claims = Jwts.parser()
                    .verifyWith(signingKey())
                    .build()
                    .parseSignedClaims(authHeader.substring(7))
                    .getPayload();
        } catch (Exception e) {
            return unauthorized(exchange, "Invalid or expired token");
        }

        Object userId = claims.get("userId");
        String role = claims.get("role", String.class);
        String email = claims.getSubject();

        builder.headers(h -> {
            if (userId != null) h.set(USER_ID_HEADER, String.valueOf(userId));
            if (role != null) h.set(USER_ROLE_HEADER, role);
            if (email != null) h.set(USER_EMAIL_HEADER, email);
        });

        return chain.filter(exchange.mutate().request(builder.build()).build());
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String reason) {
        log.debug("401 {} — {}", exchange.getRequest().getPath().value(), reason);
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }

    @Override
    public int getOrder() {
        // Run before routing but after Spring Cloud Gateway's built-in security setup.
        return -100;
    }
}
