package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.AuthRefreshToken;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test-ci")
@Transactional
@DisplayName("Suite de persistencia para refresh tokens de autenticación")
class AuthRefreshTokenRepositoryTest {

    @Autowired
    private AuthRefreshTokenRepository tokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("findByTokenHash debe recuperar el token exacto entre usuarios y estados distintos")
    void findByTokenHash_ShouldReturnExactPersistedToken() {
        Users firstUser = saveUser("refresh_user_one");
        Users secondUser = saveUser("refresh_user_two");
        AuthRefreshToken activeToken = saveToken(firstUser, "hash-active", "jti-active", false);
        saveToken(secondUser, "hash-revoked", "jti-revoked", true);

        Optional<AuthRefreshToken> result = tokenRepository.findByTokenHash("hash-active");

        assertTrue(result.isPresent());
        assertEquals(activeToken.getTokenId(), result.get().getTokenId());
        assertEquals(firstUser.getUser_id(), result.get().getUser().getUser_id());
        assertEquals("hash-active", result.get().getTokenHash());
        assertTrue(!result.get().isRevoked());
    }

    @Test
    @DisplayName("findByTokenHash debe devolver vacío para un hash inexistente")
    void findByTokenHash_ShouldReturnEmptyWhenHashDoesNotExist() {
        Users user = saveUser("refresh_user_missing");
        saveToken(user, "hash-existing", "jti-existing", false);

        assertTrue(tokenRepository.findByTokenHash("hash-missing").isEmpty());
    }

    private Users saveUser(String username) {
        Users user = new Users();
        user.setUsername(username);
        user.setPassword("secret-pass");
        user.setRole(Role.STUDENT);
        user.setEmail(username + "@uni.es");
        user.setEnabled(true);
        return userRepository.saveAndFlush(user);
    }

    private AuthRefreshToken saveToken(Users user, String hash, String jti, boolean revoked) {
        AuthRefreshToken token = new AuthRefreshToken();
        token.setUser(user);
        token.setTokenHash(hash);
        token.setJti(jti);
        token.setExpiresAt(LocalDateTime.now().plusDays(7));
        token.setRevoked(revoked);
        token.setCreatedAt(LocalDateTime.now());
        return tokenRepository.saveAndFlush(token);
    }
}