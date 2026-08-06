package com.cursosonline.backend.config.jwt;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Suite de Pruebas Unitarias para JwtProperties")
class JwtPropertiesTest {

    private JwtProperties jwtProperties;

    @BeforeEach
    void setUp() {
        // Instanciamos el componente de propiedades de forma limpia y directa
        jwtProperties = new JwtProperties(null);
    }

    /*
     * =========================================================================
     * 1. VERIFICACIÓN DE VALORES POR DEFECTO OPERATIVOS
     * =========================================================================
     */
    @Test
    @DisplayName("Debe asegurar los valores iniciales y por defecto de la infraestructura JWT")
    void checkDefaultPropertiesValues() {
        assertNull(jwtProperties.getSecret(), "El secreto inicial debe arrancar nulo");
        assertEquals("cursosonline-backend", jwtProperties.getIssuer(),
                "El emisor canónico debe ser cursosonline-backend");
        assertEquals(15, jwtProperties.getAccessTokenExpirationMinutes(),
                "El Access Token por defecto debe durar 15 minutos");
        assertEquals(30, jwtProperties.getRefreshTokenExpirationDays(),
                "El Refresh Token por defecto debe durar 30 días");
        assertEquals(60, jwtProperties.getClockSkewSeconds(), "La tolerancia de reloj inicial debe ser de 60 segundos");
    }

    /*
     * =========================================================================
     * 2. VERIFICACIÓN DE MUTABILIDAD MEDIANTE SETTERS
     * =========================================================================
     */
    @Test
    @DisplayName("Debe permitir la mutación y asignación correcta de todas las propiedades de entorno")
    void testSettersAndGettersBehavior() {
        // Ejecución de mutaciones de estado de prueba
        jwtProperties.setSecret("super-secret-key-for-test-purposes-123456789");
        jwtProperties.setIssuer("custom-issuer");
        jwtProperties.setAccessTokenExpirationMinutes(30);
        jwtProperties.setRefreshTokenExpirationDays(60);
        jwtProperties.setClockSkewSeconds(120);

        // Aserciones estrictas de verificación
        assertEquals("super-secret-key-for-test-purposes-123456789", jwtProperties.getSecret());
        assertEquals("custom-issuer", jwtProperties.getIssuer());
        assertEquals(30, jwtProperties.getAccessTokenExpirationMinutes());
        assertEquals(60, jwtProperties.getRefreshTokenExpirationDays());
        assertEquals(120, jwtProperties.getClockSkewSeconds());
    }

    @Test
    @DisplayName("No debe exigir secreto estricto cuando no estamos en perfil productivo")
    void validateSecretForProfiles_ShouldSkipValidationOutsideProduction() {
        jwtProperties.setSecret("short-secret");

        assertDoesNotThrow(() -> jwtProperties.validateSecretForProfiles(new String[] { "dev" }));
        assertDoesNotThrow(() -> jwtProperties.validateSecretForProfiles(new String[] { "test-ci" }));
    }

    @Test
    @DisplayName("Debe rechazar secreto por defecto cuando el perfil es prod")
    void validateSecretForProfiles_ShouldRejectDefaultSecretInProduction() {
        jwtProperties.setSecret("change-me-in-local-and-tests-please");

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> jwtProperties.validateSecretForProfiles(new String[] { "prod" }));

        assertTrue(exception.getMessage().contains("valor por defecto"));
    }

    @Test
    @DisplayName("Debe rechazar secreto demasiado corto en producción")
    void validateSecretForProfiles_ShouldRejectShortSecretInProduction() {
        jwtProperties.setSecret("short-secret");

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> jwtProperties.validateSecretForProfiles(new String[] { "production" }));

        assertTrue(exception.getMessage().contains("al menos 32"));
    }

    @Test
    @DisplayName("Debe aceptar secreto robusto en producción")
    void validateSecretForProfiles_ShouldAcceptStrongSecretInProduction() {
        jwtProperties.setSecret("prod-super-secret-at-least-32-characters-long");

        assertDoesNotThrow(() -> jwtProperties.validateSecretForProfiles(new String[] { "prod" }));
    }
}
