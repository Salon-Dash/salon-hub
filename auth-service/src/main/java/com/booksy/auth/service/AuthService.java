package com.booksy.auth.service;

import com.booksy.auth.dto.*;
import com.booksy.auth.model.RefreshToken;
import com.booksy.auth.model.User;
import com.booksy.auth.repository.RefreshTokenRepository;
import com.booksy.auth.repository.UserRepository;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    /**
     * Registers a new user. Returns access + refresh tokens.
     * Throws 409 if the email is already taken.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        log.info("Registration attempt for email [{}]", request.email());

        if (userRepository.existsByEmail(request.email())) {
            log.warn("Registration rejected — email already in use: [{}]", request.email());
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }

        // Validate role — only CUSTOMER and BUSINESS_OWNER are permitted
        String role;
        if (request.role() == null || request.role().isBlank()) {
            role = "BUSINESS_OWNER";
        } else if (request.role().equals("CUSTOMER") || request.role().equals("BUSINESS_OWNER")) {
            role = request.role();
        } else {
            log.warn("Registration rejected — invalid role [{}] for email [{}]", request.role(), request.email());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role. Allowed values: CUSTOMER, BUSINESS_OWNER");
        }

        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .firstName(request.firstName())
                .lastName(request.lastName())
                .phone(request.phone())
                .role(role)
                .isActive(true)
                .emailVerified(false)
                .build();

        user = userRepository.save(user);
        log.info("New user created with id [{}] and email [{}]", user.getId(), user.getEmail());

        return buildAuthResponse(user);
    }

    /**
     * Authenticates an existing user by email (or phone treated as email for now).
     * Throws 401 for any credential mismatch to avoid user enumeration.
     */
    @Transactional
    public AuthResponse login(LoginRequest request) {
        log.info("Login attempt for [{}]", request.emailOrPhone());

        User user = userRepository.findByEmail(request.emailOrPhone())
                .or(() -> userRepository.findByPhone(request.emailOrPhone()))
                .orElseThrow(() -> {
                    log.warn("Login failed — no account for [{}]", request.emailOrPhone());
                    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
                });

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            log.warn("Login failed — account inactive for [{}]", request.emailOrPhone());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            log.warn("Login failed — wrong password for [{}]", request.emailOrPhone());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        log.info("Login successful for user [{}]", user.getId());
        return buildAuthResponse(user);
    }

    /**
     * Exchanges a valid DB refresh token for a fresh access token.
     * Issues a new refresh token (rotation) and deletes the old one.
     */
    @Transactional
    public AuthResponse refresh(String refreshTokenValue) {
        log.info("Refresh token exchange requested");

        RefreshToken storedToken = refreshTokenRepository.findByToken(refreshTokenValue)
                .orElseThrow(() -> {
                    log.warn("Refresh token not found in DB");
                    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
                });

        if (storedToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            log.warn("Refresh token expired for userId [{}]", storedToken.getUserId());
            refreshTokenRepository.delete(storedToken);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token has expired");
        }

        User user = userRepository.findById(storedToken.getUserId())
                .orElseThrow(() -> {
                    log.warn("User not found for refresh token userId [{}]", storedToken.getUserId());
                    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
                });

        // Token rotation: delete the used refresh token and issue a new one
        refreshTokenRepository.delete(storedToken);
        log.info("Refresh token rotated for user [{}]", user.getId());

        return buildAuthResponse(user);
    }

    /**
     * Validates a Bearer access token and returns the associated user info.
     * Returns valid=false (200 OK) rather than throwing, so callers can check the flag.
     */
    public ValidateResponse validate(String bearerToken) {
        String rawToken = jwtService.extractRawToken(bearerToken);

        if (rawToken == null || rawToken.isBlank()) {
            log.warn("Validate called with empty token");
            return new ValidateResponse(false, null);
        }

        if (!jwtService.isTokenValid(rawToken)) {
            return new ValidateResponse(false, null);
        }

        Claims claims = jwtService.parseToken(rawToken);
        String email = claims.getSubject();
        String role = claims.get("role", String.class);
        Long userId = claims.get("userId", Long.class);

        // Optionally fetch fresh user data to ensure account is still active
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || !Boolean.TRUE.equals(user.getIsActive())) {
            log.warn("Validate: user not found or inactive for email [{}]", email);
            return new ValidateResponse(false, null);
        }

        String fullName = user.getFirstName() + " " + user.getLastName();
        ValidateResponse.UserInfo userInfo = new ValidateResponse.UserInfo(userId, email, fullName, role);
        log.info("Token validated for user [{}]", email);
        return new ValidateResponse(true, userInfo);
    }

    /**
     * Deletes the given refresh token from the DB (logout).
     */
    @Transactional
    public void logout(String refreshTokenValue) {
        log.info("Logout — revoking refresh token");
        refreshTokenRepository.findByToken(refreshTokenValue)
                .ifPresentOrElse(
                        token -> {
                            refreshTokenRepository.delete(token);
                            log.info("Refresh token revoked for userId [{}]", token.getUserId());
                        },
                        () -> log.warn("Logout called with unknown refresh token (already expired or deleted)")
                );
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user.getEmail(), user.getRole(), user.getId());
        String refreshTokenValue = issueRefreshToken(user.getId());
        String fullName = user.getFirstName() + " " + user.getLastName();

        return new AuthResponse(
                accessToken,
                refreshTokenValue,
                user.getId(),
                fullName,
                user.getEmail(),
                user.getRole()
        );
    }

    private String issueRefreshToken(Long userId) {
        String tokenValue = jwtService.generateRefreshTokenValue();
        long expiryMs = jwtService.getRefreshExpirationMs();
        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(expiryMs / 1000);

        RefreshToken refreshToken = RefreshToken.builder()
                .userId(userId)
                .token(tokenValue)
                .expiresAt(expiresAt)
                .build();

        refreshTokenRepository.save(refreshToken);
        log.info("Issued new refresh token for userId [{}], expires at [{}]", userId, expiresAt);
        return tokenValue;
    }
}
