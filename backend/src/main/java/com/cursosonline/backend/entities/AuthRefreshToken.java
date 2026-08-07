package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Entidad que representa un token de actualización (refresh token) utilizado
 * para la autenticación y autorización de usuarios en el sistema.
 * Contiene información sobre el token, su estado de revocación, fechas de
 * expiración y uso, así como referencias al usuario asociado.
 * AuthRefreshToken
 */
@Entity
@Table(name = "auth_refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
public class AuthRefreshToken {

    // Identificador único del token de actualización
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long tokenId;

    // Relación con la entidad Users para asociar el token de actualización con un
    // usuario específico
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    // Hash del token de actualización, utilizado para verificar la validez del
    // token sin almacenar el token en texto plano
    @Column(name = "token_hash", nullable = false, unique = true, length = 128)
    private String tokenHash;

    // Identificador único del token (JWT ID), utilizado para identificar de manera
    // única el token en el sistema
    @Column(name = "jti", nullable = false, unique = true, length = 64)
    private String jti;

    // Fecha y hora de expiración del token de actualización, utilizada para
    // determinar si el token sigue siendo válido
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    // Indica si el token de actualización ha sido revocado, lo que significa que ya
    // no es válido para su uso
    @Column(name = "is_revoked", nullable = false)
    private boolean revoked;

    // Identificador del token de actualización que reemplazó a este token, si es
    // aplicable. Se utiliza para rastrear la cadena de tokens de actualización.
    @Column(name = "replaced_by_token_id")
    private Long replacedByTokenId;

    // Fecha y hora del último uso del token de actualización, utilizada para
    // auditoría y seguimiento del uso del token
    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    // Fecha y hora en que el token de actualización fue revocado, si es aplicable.
    // Se utiliza para auditoría y seguimiento del estado del token
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    // Fecha y hora en que el token de actualización fue creado, utilizada para
    // auditoría y seguimiento del ciclo de vida del token
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * Establece la fecha de creación del token de actualización antes de
     * persistirlo en la base de datos.
     * Si la fecha de creación no se ha establecido previamente, se asigna la fecha
     * y hora actual.
     * Esto asegura que todos los tokens de actualización tengan una fecha de
     * creación válida.
     */
    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
