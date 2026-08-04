package com.cursosonline.backend.dto;

public record RefreshTokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn) {

    public RefreshTokenResponse {
        tokenType = (tokenType == null || tokenType.isBlank()) ? "Bearer" : tokenType;
    }
}
