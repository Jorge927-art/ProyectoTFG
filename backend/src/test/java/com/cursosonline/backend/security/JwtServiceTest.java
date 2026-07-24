package com.cursosonline.backend.security;

import com.cursosonline.backend.config.jwt.JwtProperties;
import com.cursosonline.backend.security.jwt.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Base64;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@DisplayName("Suite de Pruebas Unitarias Criptográficas para JwtService")
class JwtServiceTest {

    private JwtProperties jwtProperties;
    private JwtService jwtService;
    private UserDetails sampleUserDetails;

    private final String testSecret = "super-secure-key-for-test-purposes-123456789-abcdefghijklmnop";

    @BeforeEach
    void setUp() {
        jwtProperties = Mockito.mock(JwtProperties.class);

        when(jwtProperties.getSecret()).thenReturn(testSecret);
        when(jwtProperties.getIssuer()).thenReturn("cursosonline-backend");
        when(jwtProperties.getAccessTokenExpirationMinutes()).thenReturn(15L);
        when(jwtProperties.getRefreshTokenExpirationDays()).thenReturn(30L);
        when(jwtProperties.getClockSkewSeconds()).thenReturn(60L);

        jwtService = new JwtService(jwtProperties);

        sampleUserDetails = new User(
                "alumno_criptografia",
                "",
                List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));
    }

    /*
     * =========================================================================
     * 1. VERIFICACIÓN: GENERACIÓN Y ANÁLISIS DE ACCESS TOKEN
     * =========================================================================
     */
    @Test
    @DisplayName("Debe generar un Access Token válido e inyectar correctamente los claims de identidad")
    void generateAccessToken_ShouldCreateValidTokenWithClaims() {
        String token = jwtService.generateAccessToken(sampleUserDetails, 45L, "alumno.cripto@tfg.com");

        assertNotNull(token, "El token generado no debe ser nulo");
        assertEquals(3, token.split("\\.").length, "Un JWT firmado por HS256 debe poseer exactamente 3 partes");

        assertEquals("alumno_criptografia", jwtService.extractUsername(token));
        assertEquals("access", jwtService.extractTokenType(token));
        assertEquals("access", jwtService.extractTokenTypeOrNull(token));
        assertEquals("ROLE_STUDENT", jwtService.extractRole(token));

        assertTrue(jwtService.isTokenValid(token));
        assertTrue(jwtService.isTokenValid(token, sampleUserDetails));
    }

    /*
     * =========================================================================
     * 2. VERIFICACIÓN: GENERACIÓN DE REFRESH TOKEN
     * =========================================================================
     */
    @Test
    @DisplayName("Debe generar un Refresh Token estructurado con el TTL de larga duración configurado")
    void generateRefreshToken_ShouldCreateValidToken() {
        String token = jwtService.generateRefreshToken(sampleUserDetails, 45L, "alumno.cripto@tfg.com");

        assertNotNull(token);
        assertEquals("refresh", jwtService.extractTokenType(token));
        assertTrue(jwtService.isTokenValid(token));

        Instant expiration = jwtService.extractExpiration(token);
        assertNotNull(expiration);
        assertTrue(expiration.isAfter(Instant.now()));
    }

    /*
     * =========================================================================
     * 3. SALVAGUARDA ANTE ALTERACIÓN DE FIRMAS CRIPTOGRÁFICAS
     * =========================================================================
     */
    @Test
    @DisplayName("Debe invalidar el token y retornar false si la firma criptográfica ha sido alterada")
    void isTokenValid_AlteredSignature_ShouldReturnFalse() {
        String token = jwtService.generateAccessToken(sampleUserDetails, 45L, "alumno.cripto@tfg.com");

        String[] parts = token.split("\\.");
        assertEquals(3, parts.length, "El token JWT debe tener 3 segmentos");

        byte[] signatureBytes = Base64.getUrlDecoder().decode(parts[2]);
        // Alteramos un byte real de la firma para invalidarla de forma determinista.
        signatureBytes[0] = (byte) (signatureBytes[0] ^ 0x01);

        String alteredSignature = Base64.getUrlEncoder().withoutPadding().encodeToString(signatureBytes);
        String alteredToken = parts[0] + "." + parts[1] + "." + alteredSignature;

        assertFalse(jwtService.isTokenValid(alteredToken), "El validador debe rechazar tokens con firmas mutadas");
        assertFalse(jwtService.isTokenValid(alteredToken, sampleUserDetails));
    }

    /*
     * =========================================================================
     * 4. CONTROL DE FORMATO Y EXCEPCIONES EN EL PARSER
     * =========================================================================
     */
    @Test
    @DisplayName("Debe gestionar de forma segura los errores de formato y retornar falso")
    void isTokenValid_MalformedJwt_ShouldReturnFalse() {
        assertFalse(jwtService.isTokenValid("cabecera.payload-sin-firma"), "Debe rechazar estructuras incompletas");
        assertFalse(jwtService.isTokenValid("token-totalmente-invalido"), "Debe mitigar cadenas de texto planas");
        assertFalse(jwtService.isTokenValid(null), "Debe tolerar y rechazar punteros nulos de entrada");
    }

    @Test
    @DisplayName("Debe lanzar una excepción controlada si se intentan extraer claims de un token corrupto")
    void extractUsername_MalformedToken_ShouldThrowRuntimeException() {
        assertThrows(RuntimeException.class, () -> {
            jwtService.extractUsername("jwt.malformado.invalido");
        }, "La extracción de claims en tokens corruptos debe propagar un fallo de ejecución controlado");
    }
}
