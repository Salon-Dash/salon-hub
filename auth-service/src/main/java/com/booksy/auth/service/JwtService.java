package com.booksy.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Service
public class JwtService {

    @Value("${jwt.secret:local-dev-only-secret-change-in-prod!!}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpirationMs;

    @Value("${jwt.refresh-expiration:2592000000}")
    private long refreshExpirationMs;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generates a signed JWT access token.
     * Subject is the user's email (matching booking-service's claims.getSubject() usage).
     * Claims include "role" and "userId" as expected by all downstream services.
     */
    public String generateAccessToken(String email, String role, Long userId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtExpirationMs);

        String token = Jwts.builder()
                .subject(email)
                .claim("role", role)
                .claim("userId", userId)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(getSigningKey())
                .compact();

        log.info("Generated access token for user [{}] with role [{}], expires at [{}]", email, role, expiry);
        return token;
    }

    /**
     * Generates a random UUID to be stored as a refresh token in the DB.
     */
    public String generateRefreshTokenValue() {
        return UUID.randomUUID().toString();
    }

    /**
     * Returns how many milliseconds a refresh token is valid.
     */
    public long getRefreshExpirationMs() {
        return refreshExpirationMs;
    }

    /**
     * Parses and validates a JWT. Returns the Claims payload.
     * Throws JwtException (or subclass) if invalid or expired.
     */
    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Returns true if the token can be parsed and is not expired.
     */
    public boolean isTokenValid(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("JWT validation failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Strips "Bearer " prefix if present and returns the raw token string.
     */
    public String extractRawToken(String bearerToken) {
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return bearerToken;
    }
}
