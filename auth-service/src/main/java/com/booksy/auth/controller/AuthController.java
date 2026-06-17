package com.booksy.auth.controller;

import com.booksy.auth.dto.*;
import com.booksy.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // -------------------------------------------------------------------------
    // Public endpoints — no auth required
    // -------------------------------------------------------------------------

    /**
     * POST /api/public/auth/register
     * Registers a new user account (defaults to BUSINESS_OWNER if role is omitted).
     * Returns 201 Created on success, 409 Conflict if email is taken.
     */
    @PostMapping("/api/public/auth/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        log.info("POST /api/public/auth/register — email [{}]", request.email());
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * POST /api/public/auth/register/customer
     * Dedicated customer registration endpoint for the mobile app.
     * Forces role to CUSTOMER regardless of what is in the request body.
     * Returns 201 Created on success, 409 Conflict if email is taken.
     */
    @PostMapping("/api/public/auth/register/customer")
    public ResponseEntity<AuthResponse> registerCustomer(@Valid @RequestBody RegisterRequest request) {
        log.info("POST /api/public/auth/register/customer — email [{}]", request.email());
        // Force role to CUSTOMER regardless of what the body contains
        RegisterRequest customerRequest = new RegisterRequest(
                request.firstName(),
                request.lastName(),
                request.email(),
                request.password(),
                request.phone(),
                "CUSTOMER"
        );
        AuthResponse response = authService.register(customerRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * POST /api/public/auth/login
     * Authenticates a user and returns access + refresh tokens.
     * Returns 200 OK, 401 Unauthorized on bad credentials.
     */
    @PostMapping("/api/public/auth/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("POST /api/public/auth/login — [{}]", request.emailOrPhone());
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    // -------------------------------------------------------------------------
    // Protected endpoints — require valid JWT
    // -------------------------------------------------------------------------

    /**
     * POST /api/auth/register/business
     * Business owner registration — called by the admin dashboard on the sign-up page.
     * Permitted without a JWT (whitelisted in SecurityConfig).
     * Forces role to BUSINESS_OWNER regardless of request body.
     */
    @PostMapping("/api/auth/register/business")
    public ResponseEntity<AuthResponse> registerBusiness(@Valid @RequestBody RegisterRequest request) {
        log.info("POST /api/auth/register/business — email [{}]", request.email());
        RegisterRequest ownerRequest = new RegisterRequest(
                request.firstName(),
                request.lastName(),
                request.email(),
                request.password(),
                request.phone(),
                "BUSINESS_OWNER"
        );
        AuthResponse response = authService.register(ownerRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * POST /api/auth/refresh
     * Exchanges a valid refresh token for a new access token (with refresh token rotation).
     * Returns 200 OK, 401 Unauthorized if the refresh token is unknown or expired.
     */
    @PostMapping("/api/auth/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        log.info("POST /api/auth/refresh");
        AuthResponse response = authService.refresh(request.refreshToken());
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/auth/validate
     * Validates the Bearer token in the Authorization header.
     * Returns {valid: true, user: {...}} or {valid: false, user: null}.
     */
    @GetMapping("/api/auth/validate")
    public ResponseEntity<ValidateResponse> validate(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        log.info("GET /api/auth/validate");
        ValidateResponse response = authService.validate(authHeader);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/auth/logout
     * Revokes the given refresh token.
     * Body: {"refreshToken": "..."}
     * Returns 204 No Content.
     */
    @PostMapping("/api/auth/logout")
    public ResponseEntity<Void> logout(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        log.info("POST /api/auth/logout");
        authService.logout(refreshToken);
        return ResponseEntity.noContent().build();
    }
}
