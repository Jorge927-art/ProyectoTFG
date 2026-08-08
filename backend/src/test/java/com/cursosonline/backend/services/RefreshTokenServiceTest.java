package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.RefreshTokenResponse;
import com.cursosonline.backend.entities.AuthRefreshToken;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.repository.AuthRefreshTokenRepository;
import com.cursosonline.backend.security.jwt.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Suite unitaria RefreshTokenService")
class RefreshTokenServiceTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthRefreshTokenRepository authRefreshTokenRepository;

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    private Users enabledUser() {
        Users user = new Users(99L, "alumno_refresh", "enc", Role.STUDENT, "a@cursosonline.es", true,
                new ArrayList<>());
        user.setEnabled(true);
        return user;
    }

    @Test
    @DisplayName("issueRefreshToken debe emitir y persistir token de refresh")
    void issueRefreshToken_ShouldPersistToken() {
        Users user = enabledUser();
        String rawRefreshToken = "refresh-token-raw";
        Instant refreshExpiry = Instant.now().plusSeconds(7L * 24 * 60 * 60);

        when(jwtService.generateRefreshToken(user, 99L, "a@cursosonline.es")).thenReturn(rawRefreshToken);
        when(jwtService.extractJti(rawRefreshToken)).thenReturn("jti-refresh-1");
        when(jwtService.extractExpiration(rawRefreshToken)).thenReturn(refreshExpiry);
        when(authRefreshTokenRepository.save(any(AuthRefreshToken.class))).thenAnswer(invocation -> {
            AuthRefreshToken token = invocation.getArgument(0);
            token.setTokenId(1L);
            return token;
        });

        String issuedToken = refreshTokenService.issueRefreshToken(user);

        assertEquals(rawRefreshToken, issuedToken);
        verify(authRefreshTokenRepository).save(any(AuthRefreshToken.class));
    }

    @Test
    @DisplayName("issueRefreshToken debe rechazar un usuario sin identificador válido")
    void issueRefreshToken_WithInvalidUser_ShouldThrow() {
        ServicesException ex = assertThrows(ServicesException.class,
                () -> refreshTokenService.issueRefreshToken(new Users()));

        assertEquals("No se puede emitir refresh token sin usuario válido.", ex.getMessage());
        verify(authRefreshTokenRepository, never()).save(any(AuthRefreshToken.class));
    }

    @Test
    @DisplayName("rotate debe rechazar un token con tipo incorrecto antes de consultar la base")
    void rotate_WithWrongTokenType_ShouldThrowBeforeLookup() {
        String token = "refresh-wrong-type";

        when(jwtService.isTokenValid(token)).thenReturn(true);
        when(jwtService.extractTokenTypeOrNull(token)).thenReturn("access");

        ServicesException ex = assertThrows(ServicesException.class, () -> refreshTokenService.rotate(token));

        assertEquals("El token recibido no es de tipo refresh.", ex.getMessage());
        verify(authRefreshTokenRepository, never()).findByTokenHash(any());
    }

    @Test
    @DisplayName("rotate debe revocar token antiguo y devolver nueva pareja access/refresh")
    void rotate_ShouldRevokeCurrentAndReturnNewTokens() {
        Users user = enabledUser();
        String oldRefresh = "refresh-old";
        String newRefresh = "refresh-new";
        String newAccess = "access-new";

        AuthRefreshToken current = new AuthRefreshToken();
        current.setTokenId(10L);
        current.setUser(user);
        current.setRevoked(false);
        current.setJti("jti-old");
        current.setExpiresAt(LocalDateTime.now().plusDays(1));

        when(jwtService.isTokenValid(oldRefresh)).thenReturn(true);
        when(jwtService.extractTokenTypeOrNull(oldRefresh)).thenReturn("refresh");
        when(authRefreshTokenRepository.findByTokenHash(eq(sha256(oldRefresh)))).thenReturn(Optional.of(current));
        when(jwtService.extractJti(oldRefresh)).thenReturn("jti-old");

        when(jwtService.generateRefreshToken(user, 99L, "a@cursosonline.es")).thenReturn(newRefresh);
        when(jwtService.extractJti(newRefresh)).thenReturn("jti-new");
        when(jwtService.extractExpiration(newRefresh)).thenReturn(Instant.now().plusSeconds(7L * 24 * 60 * 60));

        when(jwtService.generateAccessToken(user, 99L, "a@cursosonline.es")).thenReturn(newAccess);
        when(jwtService.extractExpiration(newAccess)).thenReturn(Instant.now().plusSeconds(900));

        AtomicLong ids = new AtomicLong(100L);
        when(authRefreshTokenRepository.save(any(AuthRefreshToken.class))).thenAnswer(invocation -> {
            AuthRefreshToken token = invocation.getArgument(0);
            if (token.getTokenId() == null) {
                token.setTokenId(ids.getAndIncrement());
            }
            return token;
        });

        RefreshTokenResponse response = refreshTokenService.rotate(oldRefresh);

        assertEquals(newAccess, response.accessToken());
        assertEquals(newRefresh, response.refreshToken());
        assertEquals("Bearer", response.tokenType());
        assertTrue(response.expiresIn() > 0);
        assertTrue(current.isRevoked());
        assertNotNull(current.getRevokedAt());
        assertNotNull(current.getLastUsedAt());
        assertNotNull(current.getReplacedByTokenId());
    }

    @Test
    @DisplayName("rotate debe rechazar token revocado sin persistir cambios")
    void rotate_WithRevokedToken_ShouldThrow() {
        String revokedRefresh = "refresh-revoked";
        AuthRefreshToken revoked = new AuthRefreshToken();
        revoked.setRevoked(true);

        when(jwtService.isTokenValid(revokedRefresh)).thenReturn(true);
        when(jwtService.extractTokenTypeOrNull(revokedRefresh)).thenReturn("refresh");
        when(authRefreshTokenRepository.findByTokenHash(eq(sha256(revokedRefresh)))).thenReturn(Optional.of(revoked));

        ServicesException ex = assertThrows(ServicesException.class, () -> refreshTokenService.rotate(revokedRefresh));

        assertEquals("Refresh token inválido o revocado.", ex.getMessage());
        verify(authRefreshTokenRepository, never()).save(any(AuthRefreshToken.class));
    }

    @Test
    @DisplayName("rotate debe revocar token expirado y lanzar error")
    void rotate_WithExpiredToken_ShouldRevokeAndThrow() {
        Users user = enabledUser();
        String expiredRefresh = "refresh-expired";

        AuthRefreshToken expired = new AuthRefreshToken();
        expired.setTokenId(55L);
        expired.setUser(user);
        expired.setRevoked(false);
        expired.setJti("jti-expired");
        expired.setExpiresAt(LocalDateTime.now().minusMinutes(1));

        when(jwtService.isTokenValid(expiredRefresh)).thenReturn(true);
        when(jwtService.extractTokenTypeOrNull(expiredRefresh)).thenReturn("refresh");
        when(authRefreshTokenRepository.findByTokenHash(eq(sha256(expiredRefresh)))).thenReturn(Optional.of(expired));
        when(authRefreshTokenRepository.save(any(AuthRefreshToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ServicesException ex = assertThrows(ServicesException.class, () -> refreshTokenService.rotate(expiredRefresh));

        assertEquals("Refresh token expirado.", ex.getMessage());
        assertTrue(expired.isRevoked());
        assertNotNull(expired.getRevokedAt());
        verify(authRefreshTokenRepository).save(expired);
    }

    @Test
    @DisplayName("rotate debe revocar y rechazar si el jti no coincide (detección de reuso/robo)")
    void rotate_WithJtiMismatch_ShouldRevokeAndThrow() {
        Users user = enabledUser();
        String refreshToken = "refresh-jti-mismatch";

        AuthRefreshToken persisted = new AuthRefreshToken();
        persisted.setTokenId(501L);
        persisted.setUser(user);
        persisted.setRevoked(false);
        persisted.setJti("jti-persistido");
        persisted.setExpiresAt(LocalDateTime.now().plusHours(2));

        when(jwtService.isTokenValid(refreshToken)).thenReturn(true);
        when(jwtService.extractTokenTypeOrNull(refreshToken)).thenReturn("refresh");
        when(authRefreshTokenRepository.findByTokenHash(eq(sha256(refreshToken)))).thenReturn(Optional.of(persisted));
        when(jwtService.extractJti(refreshToken)).thenReturn("jti-robado");
        when(authRefreshTokenRepository.save(any(AuthRefreshToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ServicesException ex = assertThrows(ServicesException.class, () -> refreshTokenService.rotate(refreshToken));

        assertEquals("Refresh token inválido o revocado.", ex.getMessage());
        assertTrue(persisted.isRevoked());
        assertNotNull(persisted.getRevokedAt());
        assertNotNull(persisted.getLastUsedAt());
        verify(authRefreshTokenRepository).save(persisted);
        verify(jwtService, never()).generateAccessToken(any(), any(), any());
        verify(jwtService, never()).generateRefreshToken(any(), any(), any());
    }

    @Test
    @DisplayName("rotate debe revocar y rechazar cuando el usuario está deshabilitado")
    void rotate_WithDisabledUser_ShouldRevokeAndThrow() {
        Users disabledUser = enabledUser();
        disabledUser.setEnabled(false);
        String refreshToken = "refresh-disabled-user";

        AuthRefreshToken persisted = new AuthRefreshToken();
        persisted.setTokenId(777L);
        persisted.setUser(disabledUser);
        persisted.setRevoked(false);
        persisted.setJti("jti-disabled");
        persisted.setExpiresAt(LocalDateTime.now().plusHours(2));

        when(jwtService.isTokenValid(refreshToken)).thenReturn(true);
        when(jwtService.extractTokenTypeOrNull(refreshToken)).thenReturn("refresh");
        when(authRefreshTokenRepository.findByTokenHash(eq(sha256(refreshToken)))).thenReturn(Optional.of(persisted));
        when(jwtService.extractJti(refreshToken)).thenReturn("jti-disabled");
        when(authRefreshTokenRepository.save(any(AuthRefreshToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ServicesException ex = assertThrows(ServicesException.class, () -> refreshTokenService.rotate(refreshToken));

        assertEquals("No se puede renovar la sesión de este usuario.", ex.getMessage());
        assertTrue(persisted.isRevoked());
        assertNotNull(persisted.getRevokedAt());
        assertNotNull(persisted.getLastUsedAt());
        verify(authRefreshTokenRepository).save(persisted);
        verify(jwtService, never()).generateAccessToken(any(), any(), any());
        verify(jwtService, never()).generateRefreshToken(any(), any(), any());
    }

    @Test
    @DisplayName("rotate debe rechazar refresh token en blanco antes de validar la estructura")
    void rotate_WithBlankToken_ShouldThrowBeforeValidation() {
        ServicesException ex = assertThrows(ServicesException.class, () -> refreshTokenService.rotate("   "));

        assertEquals("Refresh token requerido.", ex.getMessage());
        verify(authRefreshTokenRepository, never()).findByTokenHash(any());
    }

    @Test
    @DisplayName("rotate debe rechazar un token inválido cuando la estructura falla")
    void rotate_WithInvalidStructure_ShouldThrow() {
        when(jwtService.isTokenValid("bad-token")).thenReturn(false);

        ServicesException ex = assertThrows(ServicesException.class, () -> refreshTokenService.rotate("bad-token"));

        assertEquals("Refresh token inválido o expirado.", ex.getMessage());
        verify(authRefreshTokenRepository, never()).findByTokenHash(any());
    }

    @Test
    @DisplayName("rotate debe traducir errores inesperados de parseo a mensaje controlado")
    void rotate_WithUnexpectedValidationException_ShouldThrowControlledError() {
        when(jwtService.isTokenValid("token-runtime")).thenThrow(new RuntimeException("jwt-parser-failed"));

        ServicesException ex = assertThrows(ServicesException.class,
                () -> refreshTokenService.rotate("token-runtime"));

        assertEquals("Refresh token inválido o expirado.", ex.getMessage());
        verify(authRefreshTokenRepository, never()).findByTokenHash(any());
    }

    @Test
    @DisplayName("rotate debe rechazar cuando el token válido no existe en persistencia")
    void rotate_WithMissingPersistedToken_ShouldThrow() {
        String refreshToken = "refresh-not-stored";

        when(jwtService.isTokenValid(refreshToken)).thenReturn(true);
        when(jwtService.extractTokenTypeOrNull(refreshToken)).thenReturn("refresh");
        when(authRefreshTokenRepository.findByTokenHash(eq(sha256(refreshToken)))).thenReturn(Optional.empty());

        ServicesException ex = assertThrows(ServicesException.class, () -> refreshTokenService.rotate(refreshToken));

        assertEquals("Refresh token inválido o revocado.", ex.getMessage());
        verify(authRefreshTokenRepository, never()).save(any(AuthRefreshToken.class));
    }

    @Test
    @DisplayName("persistToken debe fallar de forma controlada si falta el JTI o la expiración")
    void issueRefreshToken_WithMissingJtiOrExpiration_ShouldThrow() {
        Users user = enabledUser();
        when(jwtService.generateRefreshToken(user, 99L, "a@cursosonline.es")).thenReturn("refresh-no-jti");
        when(jwtService.extractJti("refresh-no-jti")).thenReturn(null);
        when(jwtService.extractExpiration("refresh-no-jti")).thenReturn(null);

        ServicesException ex = assertThrows(ServicesException.class, () -> refreshTokenService.issueRefreshToken(user));

        assertEquals("No se pudo persistir el refresh token emitido.", ex.getMessage());
        verify(authRefreshTokenRepository, never()).save(any(AuthRefreshToken.class));
    }

    @Test
    @DisplayName("revokeIfPresent debe marcar como revocado cuando existe token")
    void revokeIfPresent_ShouldRevokeStoredToken() {
        String activeRefresh = "refresh-active";
        AuthRefreshToken stored = new AuthRefreshToken();
        stored.setTokenId(88L);
        stored.setRevoked(false);

        when(authRefreshTokenRepository.findByTokenHash(eq(sha256(activeRefresh)))).thenReturn(Optional.of(stored));
        when(authRefreshTokenRepository.save(any(AuthRefreshToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        refreshTokenService.revokeIfPresent(activeRefresh);

        assertTrue(stored.isRevoked());
        assertNotNull(stored.getRevokedAt());
        assertNotNull(stored.getLastUsedAt());
        verify(authRefreshTokenRepository).save(stored);
    }

    @Test
    @DisplayName("revokeIfPresent no debe hacer nada si el token llega en blanco")
    void revokeIfPresent_WithBlankToken_ShouldDoNothing() {
        refreshTokenService.revokeIfPresent("   ");

        verify(authRefreshTokenRepository, never()).findByTokenHash(any());
        verify(authRefreshTokenRepository, never()).save(any(AuthRefreshToken.class));
    }

    @Test
    @DisplayName("revokeIfPresent no debe persistir cuando el token ya estaba revocado")
    void revokeIfPresent_WithAlreadyRevokedToken_ShouldNotSave() {
        String refreshToken = "refresh-already-revoked";
        AuthRefreshToken revoked = new AuthRefreshToken();
        revoked.setTokenId(89L);
        revoked.setRevoked(true);

        when(authRefreshTokenRepository.findByTokenHash(eq(sha256(refreshToken)))).thenReturn(Optional.of(revoked));

        refreshTokenService.revokeIfPresent(refreshToken);

        verify(authRefreshTokenRepository, never()).save(any(AuthRefreshToken.class));
    }

    private String sha256(String value) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}