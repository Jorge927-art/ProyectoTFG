package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.AuthResponse;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ServicesException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SessionAuthenticationService {

        private final AuthenticationManager authenticationManager;
        private final UserService userService;

        public AuthResponse login(String username, String rawPassword) {
                // 1. Autentica contra PostgreSQL de forma limpia
                Authentication authentication = authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(username, rawPassword));

                // 2. Establece la autenticación en el hilo actual de Spring Security
                SecurityContextHolder.getContext().setAuthentication(authentication);

                // 3. Forzamos a buscar el usuario actualizado directamente en PostgreSQL
                Users user = userService.findByUsername(username)
                                .orElseThrow(() -> new ServicesException("Usuario no encontrado"));

                // 4. Retornamos el DTO fresco para el frontend
                return AuthResponse.from(user);
        }

}