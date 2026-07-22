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
        jwtProperties = new JwtProperties();
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
}
