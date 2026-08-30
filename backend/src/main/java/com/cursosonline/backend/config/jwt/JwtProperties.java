package com.cursosonline.backend.config.jwt;

import jakarta.annotation.PostConstruct;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.core.env.Environment;
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

    private static final String INSECURE_LOCAL_DEFAULT_SECRET = "change-me-in-local-and-tests-please";
    private static final int MIN_SECRET_LENGTH = 32;

    /** Clave secreta usada para firmar y verificar tokens HS256. */
    @NotBlank
    private String secret;

    private final Environment environment;

    public JwtProperties(Environment environment) {
        this.environment = environment;
    }

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
    private long refreshTokenExpirationDays = 7;

    /** Margen de tolerancia para diferencias de reloj, en segundos. */
    @PositiveOrZero
    private long clockSkewSeconds = 60;

    /**
     * Obtiene la clave secreta para JWT.
     * 
     * @return La clave secreta configurada.
     */
    public String getSecret() {
        return secret;
    }

    /**
     * Establece la clave secreta para JWT.
     * 
     * @param secret La clave secreta a configurar.
     */
    public void setSecret(String secret) {
        this.secret = secret;
    }

    /**
     * Obtiene el emisor configurado para los tokens JWT.
     * 
     * @return El emisor configurado.
     */
    public String getIssuer() {
        return issuer;
    }

    /**
     * Establece el emisor para los tokens JWT.
     * 
     * @param issuer El emisor a configurar.
     */
    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    /**
     * Obtiene el tiempo de expiración del access token en minutos.
     * 
     * @return El tiempo de expiración configurado para el access token.
     */
    public long getAccessTokenExpirationMinutes() {
        return accessTokenExpirationMinutes;
    }

    /**
     * Establece el tiempo de expiración del access token en minutos.
     * 
     * @param accessTokenExpirationMinutes El tiempo de expiración a configurar.
     */
    public void setAccessTokenExpirationMinutes(long accessTokenExpirationMinutes) {
        this.accessTokenExpirationMinutes = accessTokenExpirationMinutes;
    }

    /**
     * Obtiene el tiempo de expiración del refresh token en días.
     * 
     * @return El tiempo de expiración configurado para el refresh token.
     */
    public long getRefreshTokenExpirationDays() {
        return refreshTokenExpirationDays;
    }

    /**
     * Establece el tiempo de expiración del refresh token en días.
     * 
     * @param refreshTokenExpirationDays El tiempo de expiración a configurar para
     *                                   el refresh token.
     */
    public void setRefreshTokenExpirationDays(long refreshTokenExpirationDays) {
        this.refreshTokenExpirationDays = refreshTokenExpirationDays;
    }

    /**
     * Obtiene el margen de tolerancia para diferencias de reloj en segundos.
     * 
     * @return El margen de tolerancia configurado.
     */
    public long getClockSkewSeconds() {
        return clockSkewSeconds;
    }

    /**
     * Establece el margen de tolerancia para diferencias de reloj en segundos.
     * 
     * @param clockSkewSeconds El margen de tolerancia a configurar.
     */
    public void setClockSkewSeconds(long clockSkewSeconds) {
        this.clockSkewSeconds = clockSkewSeconds;
    }

    @PostConstruct
    void validateOnStartup() {
        String[] activeProfiles = environment != null ? environment.getActiveProfiles() : new String[0];
        validateSecretForProfiles(activeProfiles);
    }

    void validateSecretForProfiles(String[] activeProfiles) {
        if (!isProductionProfile(activeProfiles)) {
            return;
        }

        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("app.jwt.secret es obligatorio en producción.");
        }

        String trimmedSecret = secret.trim();
        if (INSECURE_LOCAL_DEFAULT_SECRET.equals(trimmedSecret)) {
            throw new IllegalStateException(
                    "app.jwt.secret no puede usar el valor por defecto en producción. Configure APP_JWT_SECRET.");
        }

        if (trimmedSecret.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException("app.jwt.secret debe tener al menos 32 caracteres en producción.");
        }
    }

    boolean isProductionProfile(String[] activeProfiles) {
        if (activeProfiles == null || activeProfiles.length == 0) {
            return false;
        }

        for (String profile : activeProfiles) {
            if (profile == null) {
                continue;
            }

            String normalized = profile.trim().toLowerCase();
            if ("prod".equals(normalized) || "production".equals(normalized)) {
                return true;
            }
        }
        return false;
    }
}