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

import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import com.cursosonline.backend.entities.Role;

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

    // Inyección correcta del contexto de persistencia JPA para limpiar la caché de
    // consultas
    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

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
    public ResponseEntity<AuthTokenResponse> login(@RequestBody LoginRequest loginRequest) {
        try {
            // 1. Autenticar credenciales
            sessionAuthenticationService.login(loginRequest.username(), loginRequest.password());

            // 🔥 TRUCO CLAVE: Forzamos la limpieza de la caché de Hibernate del hilo actual
            // para obligar al servidor a leer los cambios físicos que hiciste en pgAdmin 4.
            if (entityManager != null) {
                entityManager.clear();
            }

            // 2. Buscar al usuario REAL y FRESCO desde el disco de PostgreSQL
            Users user = userService.findByUsername(loginRequest.username())
                    .orElseThrow(() -> new ServicesException("Usuario no encontrado tras autenticación"));

            // 3. Generar el token con los datos reales
            String jwtToken = jwtService.generateAccessToken(user);

            // 4. Calcular expiración
            Instant expirationInstant = jwtService.extractExpiration(jwtToken);
            long expiresInSeconds = expirationInstant != null
                    ? (expirationInstant.getEpochSecond() - Instant.now().getEpochSecond())
                    : 0;

            // 5. Construir respuesta
            AuthTokenResponse tokenResponse = AuthTokenResponse.from(user, jwtToken, expiresInSeconds);

            return ResponseEntity.ok(tokenResponse);

        } catch (org.springframework.security.core.AuthenticationException | ServicesException e) {
            return ResponseEntity.status(401).build();
        } catch (Exception e) {
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

    /**
     * Endpoint exclusivo para que el Administrador cambie el rol de cualquier
     * usuario.
     * Ruta: PATCH http://localhost:8080/api/auth/users/{username}/role
     * Cuerpo JSON: { "role": "PROFESSOR" }
     */
    @PatchMapping("/users/{username}/role")
    public ResponseEntity<?> changeUserRoleByAdmin(
            Authentication authentication,
            @PathVariable String username,
            @RequestBody Map<String, String> requestBody) {

        // 1. Verificación básica de sesión
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Usuario no autenticado"));
        }

        try {
            // 2. Control de acceso: Verificar que quien hace la petición sea realmente un
            // ADMIN
            // Nota: Si usas anotaciones como @PreAuthorize("hasRole('ADMIN')") en tu
            // proyecto,
            // puedes omitir este bloque if y delegarlo a Spring Security.
            Users adminUser = userService.findByUsername(authentication.getName())
                    .orElseThrow(() -> new ServicesException("Administrador no encontrado"));

            if (!"ADMIN".equals(adminUser.getRole().name())) {
                return ResponseEntity.status(403)
                        .body(Map.of("message", "Acceso denegado: Se requieren permisos de Administrador"));
            }

            // 3. Validar el campo 'role' recibido del desplegable del frontend
            String roleStr = requestBody.get("role");
            if (roleStr == null || roleStr.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El campo 'role' es requerido"));
            }

            // 4. Mapear la cadena al ENUM Role de forma segura
            Role newRole;
            try {
                newRole = Role.valueOf(roleStr.toUpperCase().trim());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Rol inválido. Opciones válidas: STUDENT, PROFESSOR, ADMIN"));
            }

            // 5. Modificar el rol del usuario destino en PostgreSQL
            Users updatedUser = userService.updateUserRole(username, newRole);

            // 🔥 Sincronizamos la caché de Hibernate para que los listados del admin
            // reflejen el cambio de inmediato
            if (entityManager != null) {
                entityManager.clear();
            }

            // 6. Retornar el usuario modificado con su nuevo rol reflejado
            return ResponseEntity.ok(Map.of(
                    "username", updatedUser.getUsername(),
                    "role", updatedUser.getRole().name(),
                    "message",
                    "El rol del usuario " + username + " fue actualizado a " + newRole.name() + " con éxito."));

        } catch (ServicesException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("message", "Error interno al procesar el cambio de rol: " + e.getMessage()));
        }
    }

}
