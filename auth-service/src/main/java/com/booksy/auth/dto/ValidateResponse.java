package com.booksy.auth.dto;

public record ValidateResponse(
        boolean valid,
        UserInfo user
) {
    public record UserInfo(
            Long id,
            String email,
            String fullName,
            String role
    ) {}
}
