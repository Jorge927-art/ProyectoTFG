package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.RefreshTokenResponse;
import com.cursosonline.backend.entities.AuthRefreshToken;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.repository.AuthRefreshTokenRepository;
import com.cursosonline.backend.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final String REFRESH_TOKEN_TYPE = "refresh";

    private final JwtService jwtService;
    private final AuthRefreshTokenRepository authRefreshTokenRepository;

    @Transactional
    public String issueRefreshToken(Users user) {
        if (user == null || user.getUser_id() == null) {
            throw new ServicesException("No se puede emitir refresh token sin usuario válido.");
        }

        String refreshToken = jwtService.generateRefreshToken(user, user.getUser_id(), user.getEmail());
        persistToken(user, refreshToken);
        return refreshToken;
    }

    @Transactional
    public RefreshTokenResponse rotate(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new ServicesException("Refresh token requerido.");
        }

        validateRefreshTokenStructure(rawRefreshToken);

        String tokenHash = hashToken(rawRefreshToken);
        AuthRefreshToken currentToken = authRefreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ServicesException("Refresh token inválido o revocado."));

        if (currentToken.isRevoked()) {
            throw new ServicesException("Refresh token inválido o revocado.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (currentToken.getExpiresAt().isBefore(now)) {
            currentToken.setRevoked(true);
            currentToken.setRevokedAt(now);
            currentToken.setLastUsedAt(now);
            authRefreshTokenRepository.save(currentToken);
            throw new ServicesException("Refresh token expirado.");
        }

        String tokenJti = jwtService.extractJti(rawRefreshToken);
        if (tokenJti == null || !tokenJti.equals(currentToken.getJti())) {
            currentToken.setRevoked(true);
            currentToken.setRevokedAt(now);
            currentToken.setLastUsedAt(now);
            authRefreshTokenRepository.save(currentToken);
            throw new ServicesException("Refresh token inválido o revocado.");
        }

        Users user = currentToken.getUser();
        if (user == null || user.getUser_id() == null || !Boolean.TRUE.equals(user.getEnabled())) {
            currentToken.setRevoked(true);
            currentToken.setRevokedAt(now);
            currentToken.setLastUsedAt(now);
            authRefreshTokenRepository.save(currentToken);
            throw new ServicesException("No se puede renovar la sesión de este usuario.");
        }

        currentToken.setRevoked(true);
        currentToken.setRevokedAt(now);
        currentToken.setLastUsedAt(now);

        String newRefreshToken = jwtService.generateRefreshToken(user, user.getUser_id(), user.getEmail());
        AuthRefreshToken newPersistedToken = persistToken(user, newRefreshToken);

        currentToken.setReplacedByTokenId(newPersistedToken.getTokenId());
        authRefreshTokenRepository.save(currentToken);

        String newAccessToken = jwtService.generateAccessToken(user, user.getUser_id(), user.getEmail());
        Instant expirationInstant = jwtService.extractExpiration(newAccessToken);
        long expiresInSeconds = expirationInstant != null
                ? Math.max(0, expirationInstant.getEpochSecond() - Instant.now().getEpochSecond())
                : 0;

        return new RefreshTokenResponse(newAccessToken, newRefreshToken, "Bearer", expiresInSeconds);
    }

    @Transactional
    public void revokeIfPresent(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }

        String tokenHash = hashToken(rawRefreshToken);
        authRefreshTokenRepository.findByTokenHash(tokenHash).ifPresent(stored -> {
            if (!stored.isRevoked()) {
                LocalDateTime now = LocalDateTime.now();
                stored.setRevoked(true);
                stored.setRevokedAt(now);
                stored.setLastUsedAt(now);
                authRefreshTokenRepository.save(stored);
            }
        });
    }

    private void validateRefreshTokenStructure(String rawRefreshToken) {
        try {
            if (!jwtService.isTokenValid(rawRefreshToken)) {
                throw new ServicesException("Refresh token inválido o expirado.");
            }

            String tokenType = jwtService.extractTokenTypeOrNull(rawRefreshToken);
            if (!REFRESH_TOKEN_TYPE.equals(tokenType)) {
                throw new ServicesException("El token recibido no es de tipo refresh.");
            }
        } catch (ServicesException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new ServicesException("Refresh token inválido o expirado.");
        }
    }

    private AuthRefreshToken persistToken(Users user, String rawRefreshToken) {
        String jti = jwtService.extractJti(rawRefreshToken);
        Instant expiresAt = jwtService.extractExpiration(rawRefreshToken);

        if (jti == null || expiresAt == null) {
            throw new ServicesException("No se pudo persistir el refresh token emitido.");
        }

        AuthRefreshToken token = new AuthRefreshToken();
        token.setUser(user);
        token.setTokenHash(hashToken(rawRefreshToken));
        token.setJti(jti);
        token.setExpiresAt(LocalDateTime.ofInstant(expiresAt, ZoneOffset.UTC));
        token.setRevoked(false);
        token.setCreatedAt(LocalDateTime.now());
        return authRefreshTokenRepository.save(token);
    }

    private String hashToken(String rawRefreshToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawRefreshToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo calcular hash del refresh token", ex);
        }
    }
}
