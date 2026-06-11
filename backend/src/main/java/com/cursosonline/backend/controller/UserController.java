package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.AuthResponse;
import com.cursosonline.backend.dto.AuthTokenResponse;
import com.cursosonline.backend.dto.LoginRequest;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.security.jwt.JwtService;
import com.cursosonline.backend.services.SessionAuthenticationService;
import com.cursosonline.backend.services.UserService;
import lombok.RequiredArgsConstructor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")

/**
 * Controlador REST que maneja las solicitudes relacionadas con la autenticación
 * y gestión de usuarios, soportando de forma híbrida sesiones HTTP
 * tradicionales y tokens JWT.
 */
public class UserController {
    private final UserService userService;
    private final SessionAuthenticationService sessionAuthenticationService;
    private final JwtService jwtService;

    /**
     * Endpoint para el registro de nuevos usuarios.
     */
    @PostMapping("/register")
    public ResponseEntity<Users> register(@RequestBody Users user) {
        return ResponseEntity.ok(userService.registerUser(user));
    }

    /**
     * Endpoint híbrido para el login de usuarios.
     * Genera la sesión tradicional en el servidor y emite un token JWT en la
     * respuesta HTTP.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthTokenResponse> login(@RequestBody LoginRequest loginRequest, HttpServletRequest request,
            HttpServletResponse response) {
        try {
            // 1. Ejecutar el login tradicional por sesión (mantiene compatibilidad con el
            // frontend actual)
            sessionAuthenticationService.login(loginRequest.username(), loginRequest.password(), request, response);

            // 2. Buscar al usuario autenticado para extraer sus datos y pasárselos al token
            Users user = userService.findByUsername(loginRequest.username())
                    .orElseThrow(() -> new ServicesException("Usuario no encontrado tras autenticación"));

            // 3. Generar el token JWT de forma aislada a través del método nativo de tu
            // JwtService
            // Dado que la entidad Users implementa o puede adaptarse a UserDetails (o
            // Spring la reconoce), se pasa el objeto.
            String jwtToken = jwtService.generateAccessToken(user);

            // 4. Extraer el tiempo de expiración del token generado y calcular los segundos
            // restantes
            Instant expirationInstant = jwtService.extractExpiration(jwtToken);
            long expiresInSeconds = expirationInstant != null
                    ? (expirationInstant.getEpochSecond() - Instant.now().getEpochSecond())
                    : 0;

            // 5. Construir la nueva respuesta enriquecida con el Bearer Token para el
            // cliente
            AuthTokenResponse tokenResponse = AuthTokenResponse.from(user, jwtToken, expiresInSeconds);

            return ResponseEntity.ok(tokenResponse);

        } catch (org.springframework.security.core.AuthenticationException | ServicesException e) {
            // Si las credenciales están mal o el usuario no existe, devolvemos 401
            return ResponseEntity.status(401).build();
        } catch (Exception e) {
            // Cualquier otro error inesperado
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Endpoint para obtener el perfil de un usuario.
     */
    @GetMapping("/{username}")
    public ResponseEntity<Users> getUserProfile(@PathVariable String username) {
        return userService.findByUsername(username)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Endpoint polimórfico para obtener el usuario autenticado.
     * Funciona de forma transparente tanto si la identidad proviene de una sesión
     * HTTP como de un token JWT.
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
     */
    @GetMapping
    public ResponseEntity<List<Users>> listAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }
}
