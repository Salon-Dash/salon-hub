package com.booksy.auth.dto;

public record AuthResponse(
        String token,
        String refreshToken,
        Long userId,
        String fullName,
        String email,
        String role
) {}
