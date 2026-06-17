package com.booksy.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Email or phone is required")
        String emailOrPhone,

        @NotBlank(message = "Password is required")
        String password
) {}
