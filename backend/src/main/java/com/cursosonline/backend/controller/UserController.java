package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.AuthTokenResponse;
import com.cursosonline.backend.dto.LoginRequest;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.security.jwt.JwtService;
import com.cursosonline.backend.services.UserService;
import com.cursosonline.backend.repository.EnrollmentRepository;
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
    private final EnrollmentRepository enrollmentRepository;

    /**
     * Endpoint para el registro de nuevos usuarios.
     */
    @PostMapping("/register")
    public ResponseEntity<Users> register(@RequestBody Users user) {
        return ResponseEntity.ok(userService.registerUser(user));
    }

    /**
     * Endpoint para el login de usuarios (JWT Stateless).
     */
    @PostMapping("/login")
    public ResponseEntity<AuthTokenResponse> login(@RequestBody LoginRequest loginRequest) {
        Users user = userService.login(loginRequest.username(), loginRequest.password());
        List<Long> enrolledCourseIds = enrollmentRepository.findEnrolledCourseIdsByUserId(user.getUser_id());

        String jwtToken = jwtService.generateAccessToken(
                (org.springframework.security.core.userdetails.UserDetails) user,
                user.getUser_id(),
                user.getEmail());

        Instant expirationInstant = jwtService.extractExpiration(jwtToken);
        long expiresInSeconds = expirationInstant != null
                ? (expirationInstant.getEpochSecond() - Instant.now().getEpochSecond())
                : 0;

        return ResponseEntity.ok(AuthTokenResponse.from(user, jwtToken, expiresInSeconds, enrolledCourseIds));
    }

    /**
     * Endpoint para recuperar los intereses y criterios de filtrado guardados del
     * alumno en sesión.
     */
    @GetMapping("/my-interests")
    public ResponseEntity<?> getStudentInterests(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }
        com.cursosonline.backend.dto.InterestDTO interestDTO = userService.getUserInterests(principal.getName());
        return ResponseEntity.ok(interestDTO);
    }

    /**
     * Endpoint para obtener la lista de todos los usuarios.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Users>> listAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    /**
     * Endpoint exclusivo para que el Administrador cambie el rol de cualquier
     * usuario.
     */
    @PatchMapping("/users/{username}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> changeUserRoleByAdmin(
            @PathVariable String username,
            @RequestBody Map<String, String> requestBody) {

        String roleStr = requestBody.get("role");
        if (roleStr == null || roleStr.trim().isEmpty()) {
            throw new IllegalArgumentException("El campo 'role' es requerido");
        }

        Role newRole;
        try {
            newRole = Role.valueOf(roleStr.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Rol inválido. Opciones válidas: STUDENT, PROFESSOR, ADMIN");
        }

        Users updatedUser = userService.updateUserRole(username, newRole);

        return ResponseEntity.ok(Map.of(
                "username", updatedUser.getUsername(),
                "role", updatedUser.getRole().name(),
                "message", "El rol del usuario " + username + " fue actualizado a " + newRole.name() + " con éxito."));
    }

    /**
     * Endpoint para alternar el estado de acceso de un usuario (Borrado lógico /
     * Reactivación).
     */
    @DeleteMapping("/users/{username}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUserByAdmin(@PathVariable String username, Principal principal) {
        if (principal.getName().equalsIgnoreCase(username)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Acción denegada: No puedes modificar tu propia cuenta de administrador."));
        }

        Users updatedUser = userService.deleteByUsername(username);
        String accion = updatedUser.isEnabled() ? "reactivado y dado de alta" : "eliminado (baja lógica)";

        return ResponseEntity.ok(Map.of(
                "enabled", updatedUser.isEnabled(),
                "message", "El usuario '" + username + "' ha sido " + accion + " en PostgreSQL con éxito."));
    }

    /**
     * Endpoint unificado para guardar o actualizar los intereses y criterios de
     * filtrado del alumno en sesión.
     * Soporta POST y PUT de forma segura para evitar fallos de parpadeo (405 Method
     * Not Allowed) en el frontend.
     */
    @RequestMapping(value = "/my-interests", method = { RequestMethod.POST, RequestMethod.PUT })
    public ResponseEntity<?> saveStudentInterests(@RequestBody com.cursosonline.backend.dto.InterestDTO interestDTO,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        // Invocación a tu servicio (que ya tiene la corrección de sincronización de ID)
        userService.saveUserInterests(principal.getName(), interestDTO);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Tus preferencias de recomendación han sido guardadas con éxito en PostgreSQL."));
    }

    /**
     * Endpoint especializado para la hidratación del bloque de asignaturas en
     * progreso.
     * Recibe el username de forma explícita para evitar fallos de inyección (HTTP
     * 400) con el filtro JWT.
     */
    @GetMapping("/my-active-courses")
    public ResponseEntity<List<Enrollment>> getMyActiveCourses(@RequestParam("username") String username) {
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // 1. Conservamos el username exacto almacenado en sesión para respetar el
        // contrato del repositorio
        String normalizedUsername = username.trim();

        // 2. Resolución de identidad transaccional mediante el servicio
        Users user = userService.findByUsername(normalizedUsername)
                .orElseThrow(
                        () -> new ServicesException("Usuario no encontrado para el nombre: " + normalizedUsername));

        // 3. Consulta indexada por clave primaria sobre la relación JOIN FETCH
        List<Enrollment> enrollments = userService.getStudentActiveCoursesWithCalculatedProgress(user.getUser_id());
        return ResponseEntity.ok(enrollments);
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
     * Endpoint blindado para iniciar el contador de tiempo de un curso [ADR-34].
     * Valida la identidad física del alumno antes de alterar el estado en
     * PostgreSQL.
     */
    @PostMapping("/enrollment/{id}/start")
    public ResponseEntity<?> startCourse(@PathVariable Long id, Principal principal) {
        // 1. Recuperamos el nombre de usuario (email/username) del token JWT activo
        String authenticatedUsername = principal.getName();

        // 2. Delegamos en el servicio la validación de propiedad y activación del
        // cronómetro
        userService.startCourseSecure(id, authenticatedUsername);

        return ResponseEntity.ok().build();
    }
}
