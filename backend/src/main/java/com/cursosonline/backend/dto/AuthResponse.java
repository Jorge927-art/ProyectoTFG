package com.cursosonline.backend.dto;

import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;

public record AuthResponse(Long userId, String username, Role role, String email) {

    public static AuthResponse from(Users user) {
        return new AuthResponse(user.getUser_id(), user.getUsername(), user.getRole(), user.getEmail());
    }
}