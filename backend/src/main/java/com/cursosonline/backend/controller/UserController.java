package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.AuthResponse;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.services.SessionAuthenticationService;
import com.cursosonline.backend.services.UserService;
import lombok.RequiredArgsConstructor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")

/**
 * Controlador REST que maneja las solicitudes relacionadas con la autenticación
 * y gestión de usuarios.
 * Proporciona endpoints para el registro de nuevos usuarios, login y obtención
 * del perfil de usuario. Utiliza UserService para delegar la lógica de negocio
 * y ResponseEntity para construir las respuestas HTTP adecuadas.
 */
public class UserController {
    private final UserService userService;
    private final SessionAuthenticationService sessionAuthenticationService;

    /**
     * Endpoint para el registro de nuevos usuarios.
     * 
     * @param user
     * @return
     */
    @PostMapping("/register")
    public ResponseEntity<Users> register(@RequestBody Users user) {
        return ResponseEntity.ok(userService.registerUser(user));
    }

    /**
     * Endpoint para el login de usuarios.
     * 
     * @param loginRequest
     * @return
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody Users loginRequest, HttpServletRequest request,
            HttpServletResponse response) {
        try {
            AuthResponse authResponse = sessionAuthenticationService.login(loginRequest.getUsername(),
                    loginRequest.getPassword(), request, response);
            return ResponseEntity.ok(authResponse);
        } catch (org.springframework.security.core.AuthenticationException e) {
            return ResponseEntity.status(401).build();
        } catch (ServicesException e) {
            // Si el usuario no existe o la contraseña está mal, devolvemos 401
            return ResponseEntity.status(401).build();
        } catch (Exception e) {
            // Cualquier otro error inesperado
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Endpoint para obtener el perfil de un usuario.
     * 
     * @param username
     * @return
     */
    @GetMapping("/{username}")
    public ResponseEntity<Users> getUserProfile(@PathVariable String username) {
        return userService.findByUsername(username)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Endpoint para obtener el usuario autenticado de la sesión actual.
     *
     * @param authentication
     * @return
     */
    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).build();
        }

        return userService.findByUsername(authentication.getName())
                .map(AuthResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(404).build());
    }

    /**
     * Endpoint para obtener la lista de todos los usuarios (solo para
     * Administrador).
     * 
     * @return
     */
    @GetMapping
    public ResponseEntity<List<Users>> listAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

}
