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

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
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

    @Test
    @DisplayName("Debe devolver null cuando no se puede extraer el tipo de token de una cadena inválida")
    void extractTokenTypeOrNull_MalformedToken_ShouldReturnNull() {
        assertNull(jwtService.extractTokenTypeOrNull("jwt.malformado.invalido"));
        assertNull(jwtService.extractTokenTypeOrNull(null));
    }

    @Test
    @DisplayName("Debe rechazar un token válido cuando el usuario esperado no coincide")
    void isTokenValid_WithDifferentUserDetails_ShouldReturnFalse() {
        String token = jwtService.generateAccessToken(sampleUserDetails, 45L, "alumno.cripto@tfg.com");
        UserDetails otherUser = new User("otro_usuario", "", List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));

        assertFalse(jwtService.isTokenValid(token, otherUser));
    }

    @Test
    @DisplayName("Debe devolver null para userId cuando el token no incluye el claim")
    void extractUserId_WithoutUserIdClaim_ShouldReturnNull() {
        String token = jwtService.generateAccessToken(sampleUserDetails, null, null);

        assertNull(jwtService.extractUserId(token));
    }

    @Test
    @DisplayName("Debe respetar el clock skew configurado antes de considerar expirado un token")
    void isTokenValid_ShouldRespectClockSkewWindow() {
        Instant issuedAt = Instant.parse("2026-08-07T12:00:00Z");
        JwtService issuerService = new JwtService(jwtProperties, Clock.fixed(issuedAt, ZoneOffset.UTC));
        String token = issuerService.generateAccessToken(sampleUserDetails, 45L, "alumno.cripto@tfg.com");

        // Access TTL 15 min -> exp 12:15:00Z. Con skew 60s aún debe aceptar hasta
        // 12:15:59Z.
        JwtService withinSkewService = new JwtService(
                jwtProperties,
                Clock.fixed(Instant.parse("2026-08-07T12:15:30Z"), ZoneOffset.UTC));
        JwtService beyondSkewService = new JwtService(
                jwtProperties,
                Clock.fixed(Instant.parse("2026-08-07T12:16:01Z"), ZoneOffset.UTC));

        assertTrue(withinSkewService.isTokenValid(token),
                "El token debe seguir siendo válido dentro de la ventana de tolerancia del clock skew.");
        assertFalse(beyondSkewService.isTokenValid(token),
                "El token debe invalidarse al superar exp + clockSkew.");
    }

    @Test
    @DisplayName("Debe invalidar token justo después de expirar cuando clockSkew es 0")
    void isTokenValid_ShouldExpireImmediatelyWhenClockSkewIsZero() {
        when(jwtProperties.getClockSkewSeconds()).thenReturn(0L);

        Instant issuedAt = Instant.parse("2026-08-07T14:00:00Z");
        JwtService issuerService = new JwtService(jwtProperties, Clock.fixed(issuedAt, ZoneOffset.UTC));
        String token = issuerService.generateAccessToken(sampleUserDetails, 45L, "alumno.cripto@tfg.com");

        JwtService atExpiryService = new JwtService(
                jwtProperties,
                Clock.fixed(Instant.parse("2026-08-07T14:15:00Z"), ZoneOffset.UTC));
        JwtService afterExpiryService = new JwtService(
                jwtProperties,
                Clock.fixed(Instant.parse("2026-08-07T14:15:01Z"), ZoneOffset.UTC));

        assertTrue(atExpiryService.isTokenValid(token),
                "En el segundo exacto de expiración no debe considerarse vencido por comparación estricta isBefore.");
        assertFalse(afterExpiryService.isTokenValid(token),
                "Un segundo después de exp debe quedar inválido con skew=0.");
    }
}
