package com.cursosonline.backend.dto;

import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;

/**
 * Record que extiende el contrato de autenticación para dar soporte a JWT.
 * Mantiene la compatibilidad semántica con los datos requeridos por el cliente
 * e incorpora el token de acceso junto a sus metadatos de expiración.
 */
public record AuthTokenResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        Long userId,
        String username,
        Role role,
        String email) {
    // Método estático de factoría idéntico al que ya usas, facilitando la
    // transición
    public static AuthTokenResponse from(Users user, String token, long expirationTime) {
        return new AuthTokenResponse(
                token,
                "Bearer",
                expirationTime,
                user.getUser_id(),
                user.getUsername(),
                user.getRole(),
                user.getEmail());
    }
}
