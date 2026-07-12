package com.cursosonline.backend.dto;

import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import java.util.List;

// Definición canónica del Record con sus campos correctamente separados por comas
public record AuthTokenResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        Long userId,
        String username,
        Role role,
        String email,
        List<Long> enrolledCourseIds,
        String avatarPath,
        InterestDTO interests) {

    public AuthTokenResponse {
        tokenType = (tokenType == null || tokenType.isBlank()) ? "Bearer" : tokenType;
        enrolledCourseIds = enrolledCourseIds != null ? List.copyOf(enrolledCourseIds) : List.of();
        avatarPath = avatarPath != null ? avatarPath : "";
        interests = interests != null ? interests : InterestDTO.empty();
    }

    /**
     * Método estático de factoría corregido.
     * Se añade 'List<Long> enrolledCourseIds' en los parámetros de entrada
     * para mapear la hidratación de matrículas.
     */
    public static AuthTokenResponse from(Users user, String token, long expirationTime, List<Long> enrolledCourseIds,
            String avatarPath, InterestDTO interests) {
        return new AuthTokenResponse(
                token,
                "Bearer",
                expirationTime,
                user.getUser_id(),
                user.getUsername(),
                user.getRole(),
                user.getEmail(),
                enrolledCourseIds,
                avatarPath,
                interests);
    }
}
