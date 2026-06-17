package com.booksy.auth.dto;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        Long userId,
        String fullName,
        String email,
        String role
) {}
