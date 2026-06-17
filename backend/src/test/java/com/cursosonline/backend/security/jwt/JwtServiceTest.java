package com.cursosonline.backend.security.jwt;

import com.cursosonline.backend.config.jwt.JwtProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

class JwtServiceTest {

    private JwtService jwtService;
    private JwtProperties jwtProperties;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        // Aislar el entorno simulando el componente de propiedades (Mocking)
        jwtProperties = Mockito.mock(JwtProperties.class);

        // Configurar un contrato de propiedades seguro para el entorno de pruebas
        when(jwtProperties.getSecret()).thenReturn("ClaveUltraSecretaDeMasDe256BitsParaPruebasUnitariasDeHS256");
        when(jwtProperties.getIssuer()).thenReturn("cursosonline-test");
        when(jwtProperties.getAccessTokenExpirationMinutes()).thenReturn(15L);
        when(jwtProperties.getRefreshTokenExpirationDays()).thenReturn(30L);
        when(jwtProperties.getClockSkewSeconds()).thenReturn(60L);

        jwtService = new JwtService(jwtProperties);

        // Crear un usuario de prueba sintético
        userDetails = new User("johndoe", "password", List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));
    }

    @Test
    void shouldGenerateAndExtractClaimsCorrectly() {
        // Ejecución: Generar el token inyectando identificadores reales
        String token = jwtService.generateAccessToken(userDetails, 42L, "john@example.com");

        // Verificaciones asertivas de integridad semántica
        assertNotNull(token);
        assertEquals("johndoe", jwtService.extractUsername(token));
        assertEquals("ROLE_STUDENT", jwtService.extractRole(token));
        assertTrue(jwtService.isTokenValid(token, userDetails));
    }

    @Test
    void shouldValidateExpirationConsideringClockSkew() {
        String token = jwtService.generateAccessToken(userDetails, 42L, "john@example.com");

        // Comprobar que el token recién creado es plenamente vigente
        assertTrue(jwtService.isTokenValid(token, userDetails));

        // Comprobar la extracción síncrona del instante de expiración
        Instant expiration = jwtService.extractExpiration(token);
        assertNotNull(expiration);
        assertTrue(expiration.isAfter(Instant.now()));
    }

    @Test
    void shouldFailWhenTokenIsAltered() {
        String token = jwtService.generateAccessToken(userDetails, 42L, "john@example.com");

        // Simular un ataque de alteración del payload rompiendo el formato del string
        String alteredToken = token + "maliciousData";

        // La validación criptográfica debe reaccionar de forma reactiva e invalidar el
        // acceso
        assertFalse(jwtService.isTokenValid(alteredToken, userDetails));
    }
}
