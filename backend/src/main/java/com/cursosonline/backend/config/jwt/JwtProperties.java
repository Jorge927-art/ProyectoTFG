package com.cursosonline.backend.config.jwt;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

/**
 * Propiedades externas para la infraestructura JWT.
 *
 * La clase se mantiene como bean de Spring para poder enlazarla desde
 * application.properties o variables de entorno sin acoplar secretos al código.
 */
@Component
@Validated
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {

    /** Clave secreta usada para firmar y verificar tokens HS256. */
    @NotBlank
    private String secret;

    /** Emisor lógico del token. */
    @NotBlank
    private String issuer = "cursosonline-backend";

    /**
     * Tiempo de vida del access token en minutos.
     * Debe ser corto para reducir la ventana de exposición.
     */
    @Positive
    private long accessTokenExpirationMinutes = 15;

    /** Tiempo de vida del refresh token en días. */
    @Positive
    private long refreshTokenExpirationDays = 30;

    /** Margen de tolerancia para diferencias de reloj, en segundos. */
    @PositiveOrZero
    private long clockSkewSeconds = 0;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public long getAccessTokenExpirationMinutes() {
        return accessTokenExpirationMinutes;
    }

    public void setAccessTokenExpirationMinutes(long accessTokenExpirationMinutes) {
        this.accessTokenExpirationMinutes = accessTokenExpirationMinutes;
    }

    public long getRefreshTokenExpirationDays() {
        return refreshTokenExpirationDays;
    }

    public void setRefreshTokenExpirationDays(long refreshTokenExpirationDays) {
        this.refreshTokenExpirationDays = refreshTokenExpirationDays;
    }

    public long getClockSkewSeconds() {
        return clockSkewSeconds;
    }

    public void setClockSkewSeconds(long clockSkewSeconds) {
        this.clockSkewSeconds = clockSkewSeconds;
    }
}