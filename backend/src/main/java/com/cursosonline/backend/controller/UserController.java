package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.AuthTokenResponse;
import com.cursosonline.backend.dto.LoginRequest;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.security.jwt.JwtService;
import com.cursosonline.backend.services.UserService;
import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.time.Instant;
import java.util.List;
import java.security.Principal;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {

    private final UserService userService;
    private final JwtService jwtService;

    /**
     * Endpoint para el registro de nuevos usuarios.
     */
    @PostMapping("/register")
    public ResponseEntity<Users> register(@RequestBody Users user) {
        return ResponseEntity.ok(userService.registerUser(user));
    }

    /**
     * Endpoint para el login de usuarios (JWT Stateless).
     * Centraliza la validación de credenciales y el estado de borrado lógico
     * (enabled).
     */
    @PostMapping("/login")
    public ResponseEntity<AuthTokenResponse> login(@RequestBody LoginRequest loginRequest) {
        // 1. CORRECCIÓN AUDITORÍA: Validar credenciales Y estado 'enabled' en una sola
        // llamada de negocio
        Users user = userService.login(loginRequest.username(), loginRequest.password());

        // 2. Generar el token inyectando las propiedades en los Custom Claims
        String jwtToken = jwtService.generateAccessToken(
                (org.springframework.security.core.userdetails.UserDetails) user,
                user.getUser_id(),
                user.getEmail());

        // 3. Calcular expiración
        Instant expirationInstant = jwtService.extractExpiration(jwtToken);
        long expiresInSeconds = expirationInstant != null
                ? (expirationInstant.getEpochSecond() - Instant.now().getEpochSecond())
                : 0;

        return ResponseEntity.ok(AuthTokenResponse.from(user, jwtToken, expiresInSeconds));
    }

    /**
     * Endpoint para obtener el perfil de un usuario específico.
     */
    @GetMapping("/{username}")
    public ResponseEntity<Users> getUserProfile(@PathVariable String username) {
        Users user = userService.findByUsername(username)
                .orElseThrow(() -> new ServicesException("Perfil de usuario no encontrado"));
        return ResponseEntity.ok(user);
    }

    /**
     * Endpoint para obtener la lista de todos los usuarios.
     * Restringido mediante anotación declarativa a nivel de método.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Users>> listAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    /**
     * Endpoint exclusivo para que el Administrador cambie el rol de cualquier
     * usuario.
     * Delega la seguridad y la validación de errores semánticos al framework.
     */
    @PatchMapping("/users/{username}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> changeUserRoleByAdmin(
            @PathVariable String username,
            @RequestBody Map<String, String> requestBody) {

        // 1. Validar precondición del cuerpo de la solicitud
        String roleStr = requestBody.get("role");
        if (roleStr == null || roleStr.trim().isEmpty()) {
            throw new IllegalArgumentException("El campo 'role' es requerido");
        }

        // 2. Mapear de forma segura al ENUM Role
        Role newRole;
        try {
            newRole = Role.valueOf(roleStr.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Rol inválido. Opciones válidas: STUDENT, PROFESSOR, ADMIN");
        }

        // 3. Modificar el rol del usuario en PostgreSQL de forma transaccional
        Users updatedUser = userService.updateUserRole(username, newRole);

        return ResponseEntity.ok(Map.of(
                "username", updatedUser.getUsername(),
                "role", updatedUser.getRole().name(),
                "message", "El rol del usuario " + username + " fue actualizado a " + newRole.name() + " con éxito."));
    }

    /**
     * Endpoint para alternar el estado de acceso de un usuario (Borrado lógico /
     * Reactivación).
     * Restringido estrictamente a administradores. Evita el autoborrado.
     */
    @DeleteMapping("/users/{username}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUserByAdmin(@PathVariable String username, Principal principal) {
        // Protección absoluta: Bloquear autoborrado en el servidor
        if (principal.getName().equalsIgnoreCase(username)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Acción denegada: No puedes modificar tu propia cuenta de administrador."));
        }

        // Ejecutamos la mutación en el servicio y capturamos la entidad actualizada
        Users updatedUser = userService.deleteByUsername(username);

        String accion = updatedUser.isEnabled() ? "reactivado y dado de alta" : "eliminado (baja lógica)";

        // CRÍTICO PARA EL FRONTEND: Devolvemos el booleano exacto escrito en PostgreSQL
        return ResponseEntity.ok(Map.of(
                "enabled", updatedUser.isEnabled(),
                "message", "El usuario '" + username + "' ha sido " + accion + " en PostgreSQL con éxito."));
    }

}
