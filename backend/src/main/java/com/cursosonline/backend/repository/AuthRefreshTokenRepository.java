package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.AuthRefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Repositorio para la entidad AuthRefreshToken, proporcionando métodos de
 * CRUD y consultas personalizadas relacionadas con los tokens de actualización
 * de
 * autenticación.
 */
public interface AuthRefreshTokenRepository extends JpaRepository<AuthRefreshToken, Long> {

    Optional<AuthRefreshToken> findByTokenHash(String tokenHash);
}
