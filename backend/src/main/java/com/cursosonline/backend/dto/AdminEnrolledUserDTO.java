package com.cursosonline.backend.dto;

/**
 * DTO para representar un usuario inscrito en un curso en el panel de
 * administración.
 * AdminEnrolledUserDTO
 * 
 * @param userId   El ID del usuario.
 * @param username El nombre de usuario.
 * @param role     El rol del usuario ("STUDENT" o "PROFESSOR").
 * @param enabled  Indica si el usuario está habilitado.
 */
public record AdminEnrolledUserDTO(
        Long userId,
        String username,
        String role, // "STUDENT" o "PROFESSOR"
        boolean enabled) {
}
