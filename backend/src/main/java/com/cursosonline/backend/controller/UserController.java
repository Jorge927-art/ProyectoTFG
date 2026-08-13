package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.AuthTokenResponse;
import com.cursosonline.backend.dto.InterestDTO;
import com.cursosonline.backend.dto.LoginRequest;
import com.cursosonline.backend.dto.RefreshTokenRequest;
import com.cursosonline.backend.dto.RefreshTokenResponse;
import com.cursosonline.backend.dto.DismissSingleNotificationRequestDTO;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.security.jwt.JwtService;
import com.cursosonline.backend.services.RefreshTokenService;
import com.cursosonline.backend.services.UserService;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;
import java.time.Instant;
import java.util.List;
import java.security.Principal;
import java.util.LinkedHashMap;

/**
 * UserController
 *
 * Controlador REST para la gestión de usuarios, incluyendo registro, inicio de
 * sesión,
 * intereses, notificaciones y eliminación de usuarios por parte del
 * administrador.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final EnrollmentRepository enrollmentRepository;
    private final UserProfileRepository userProfileRepository;

    /**
     * Endpoint para registrar un nuevo usuario (alumno) en la plataforma.
     * Asigna automáticamente el rol de STUDENT al usuario registrado.
     *
     * @param user El usuario a registrar.
     * @return Una respuesta con los datos mínimos del usuario registrado.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Users user) {
        // 1. Guarda el usuario (aquí tu UserService ya le asigna el rol STUDENT)
        Users savedUser = userService.registerUser(user);

        // 2. Devuelve los datos mínimos reales del usuario recién creado
        return ResponseEntity.ok(Map.of(
                "userId", savedUser.getUser_id(),
                "username", savedUser.getUsername(),
                "role", "STUDENT"));
    }

    /**
     * Endpoint para el inicio de sesión de usuarios.
     * Valida las credenciales y genera un token JWT para el usuario autenticado.
     *
     * @param loginRequest La solicitud de inicio de sesión que contiene el nombre
     *                     de usuario y la contraseña.
     * @return Una respuesta con el token JWT y la información del usuario
     *         autenticado.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthTokenResponse> login(@RequestBody LoginRequest loginRequest) {
        Users user = userService.login(loginRequest.username(), loginRequest.password());
        List<Long> enrolledCourseIds = enrollmentRepository.findEnrolledCourseIdsByUserId(user.getUser_id());
        InterestDTO interests = userService.getUserInterests(user.getUsername());
        String avatarPath = userProfileRepository.findById(user.getUser_id())
                .map(profile -> profile.getAvatarPath() != null ? profile.getAvatarPath() : "")
                .orElse("");

        String jwtToken = jwtService.generateAccessToken(
                (org.springframework.security.core.userdetails.UserDetails) user,
                user.getUser_id(),
                user.getEmail());
        String refreshToken = refreshTokenService.issueRefreshToken(user);

        Instant expirationInstant = jwtService.extractExpiration(jwtToken);
        long expiresInSeconds = expirationInstant != null
                ? (expirationInstant.getEpochSecond() - Instant.now().getEpochSecond())
                : 0;

        return ResponseEntity
                .ok(AuthTokenResponse.from(user, jwtToken, refreshToken, expiresInSeconds, enrolledCourseIds,
                        avatarPath, interests));
    }

    /**
     * Endpoint para refrescar el token JWT utilizando un refresh token válido.
     *
     * @param request La solicitud que contiene el refresh token.
     * @return Una respuesta con el nuevo token JWT y el refresh token actualizado.
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody RefreshTokenRequest request) {
        try {
            String refreshToken = request != null ? request.refreshToken() : null;
            RefreshTokenResponse response = refreshTokenService.rotate(refreshToken);
            return ResponseEntity.ok(response);
        } catch (RuntimeException ex) {
            return ResponseEntity.status(401).body(Map.of("error", ex.getMessage()));
        }
    }

    /**
     * Endpoint para cerrar la sesión del usuario y revocar el refresh token.
     *
     * @param request La solicitud que contiene el refresh token.
     * @return Una respuesta indicando el éxito de la operación.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody(required = false) RefreshTokenRequest request) {
        String refreshToken = request != null ? request.refreshToken() : null;
        refreshTokenService.revokeIfPresent(refreshToken);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Endpoint seguro para recuperar los intereses y criterios de filtrado del
     * alumno en sesión.
     * Extrae la identidad mediante las credenciales del token JWT activo.
     *
     * @param principal El principal que representa al usuario autenticado.
     * @return Una respuesta con los intereses y criterios de filtrado del alumno.
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
     * Endpoint para guardar o actualizar los intereses y criterios de filtrado del
     * alumno en sesión.
     *
     * @param interestDTO Los intereses y criterios de filtrado del alumno.
     * @param principal   El principal que representa al usuario autenticado.
     * @return Una respuesta indicando el éxito de la operación.
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
     * Endpoint seguro para recuperar las alertas dinámicas del alumno en sesión.
     * Extrae la identidad mediante las credenciales del token JWT activo.
     *
     * @param principal El principal que representa al usuario autenticado.
     * @return Una respuesta con la lista de alertas dinámicas del alumno.
     */
    @GetMapping("/notifications")
    public ResponseEntity<List<com.cursosonline.backend.dto.NotificationDTO>> getNotifications(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        List<com.cursosonline.backend.dto.NotificationDTO> notifications = userService
                .getUserNotifications(principal.getName());
        return ResponseEntity.ok(notifications);
    }

    /**
     * Endpoint seguro para descartar todas las alertas dinámicas del alumno en
     * sesión.
     * Extrae la identidad mediante las credenciales del token JWT activo.
     *
     * @param principal El principal que representa al usuario autenticado.
     * @return Una respuesta indicando el éxito de la operación.
     */
    @PatchMapping("/notifications/dismiss")
    public ResponseEntity<?> dismissNotifications(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }
        userService.dismissUserNotifications(principal.getName());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PatchMapping("/notifications/dismiss-one")
    public ResponseEntity<?> dismissSingleNotification(
            Principal principal,
            @RequestBody(required = false) DismissSingleNotificationRequestDTO request) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        userService.dismissSingleNotification(
                principal.getName(),
                request != null ? request.notificationId() : null,
                request != null ? request.type() : null);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Endpoint seguro para marcar como leídas únicamente las alertas de nueva
     * calificación del alumno en sesión.
     *
     * @param principal El principal que representa al usuario autenticado.
     * @return Una respuesta indicando el éxito de la operación.
     */
    @PatchMapping("/notifications/dismiss-grade-alerts")
    public ResponseEntity<?> dismissGradeNotifications(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }
        userService.dismissGradeNotifications(principal.getName());
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Endpoint seguro para recuperar la información del usuario autenticado.
     * Extrae la identidad mediante las credenciales del token JWT activo.
     *
     * @param principal El principal que representa al usuario autenticado.
     * @return Una respuesta con la información del usuario autenticado.
     */
    @GetMapping("/me")
    public ResponseEntity<?> me(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        Users user = userService.findByUsername(principal.getName())
                .orElseThrow(() -> new ServicesException("Usuario autenticado no encontrado"));

        return ResponseEntity.ok(Map.of(
                "userId", user.getUser_id(),
                "username", user.getUsername(),
                "role", user.getRole(),
                "email", user.getEmail(),
                "enabled", user.isEnabled()));
    }

    /**
     * Endpoint para recuperar la lista de cursos activos del alumno autenticado.
     * Extrae la identidad mediante las credenciales del token JWT activo.
     *
     * @param principal El principal autenticado de la sesión/token.
     * @param username  Fallback legacy opcional por compatibilidad de clientes.
     * @return Una respuesta con la lista de cursos activos del alumno.
     */
    @GetMapping("/my-active-courses")
    public ResponseEntity<List<Enrollment>> getMyActiveCourses(
            HttpServletRequest request,
            Principal principal,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "userId", required = false) Long userId) {

        Long tokenUserId = extractUserIdFromAuthorizationHeader(request);
        if (tokenUserId != null && tokenUserId > 0) {
            List<Enrollment> enrollmentsByToken = userService
                    .getStudentActiveCoursesWithCalculatedProgress(tokenUserId);
            if (!enrollmentsByToken.isEmpty()) {
                return ResponseEntity.ok(enrollmentsByToken);
            }
        }

        String explicitUsername = username != null ? username.trim() : "";
        if (!explicitUsername.isEmpty()) {
            Users explicitUser = userService.findByUsername(explicitUsername)
                    .orElseThrow(
                            () -> new ServicesException("Usuario no encontrado para el nombre: " + explicitUsername));
            List<Enrollment> enrollmentsByExplicitUsername = userService
                    .getStudentActiveCoursesWithCalculatedProgress(explicitUser.getUser_id());
            if (!enrollmentsByExplicitUsername.isEmpty()) {
                return ResponseEntity.ok(enrollmentsByExplicitUsername);
            }
        }

        if (userId != null && userId > 0) {
            List<Enrollment> enrollmentsByUserId = userService
                    .getStudentActiveCoursesWithCalculatedProgress(userId);
            if (!enrollmentsByUserId.isEmpty()) {
                return ResponseEntity.ok(enrollmentsByUserId);
            }
        }

        String principalName = principal != null ? principal.getName() : null;
        String normalizedIdentity = principalName != null && !principalName.trim().isEmpty()
                ? principalName.trim()
                : explicitUsername;

        if (normalizedIdentity.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Users user = userService.findByUsername(normalizedIdentity)
                .orElseThrow(
                        () -> new ServicesException("Usuario no encontrado para el nombre: " + normalizedIdentity));
        List<Enrollment> enrollments = userService.getStudentActiveCoursesWithCalculatedProgress(user.getUser_id());
        return ResponseEntity.ok(enrollments);
    }

    private Long extractUserIdFromAuthorizationHeader(HttpServletRequest request) {
        if (request == null) {
            return null;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        String token = authHeader.substring(7);
        try {
            return jwtService.extractUserId(token);
        } catch (RuntimeException ex) {
            return null;
        }
    }

    /**
     * Endpoint exclusivo para que el Administrador recupere la lista completa de
     * usuarios registrados en la plataforma.
     *
     * @return Una respuesta con la lista de usuarios.
     */
    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> listAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers().stream().map(this::toAdminUserResponse).toList());
    }

    /**
     * Endpoint exclusivo para que el Administrador cambie el rol de un usuario.
     * Se asegura de que el Administrador no pueda cambiar su propio rol.
     *
     * @param username    El nombre de usuario del usuario cuyo rol se desea
     *                    cambiar.
     * @param requestBody Un mapa que contiene el nuevo rol bajo la clave "role".
     * @return Una respuesta indicando el éxito de la operación.
     */
    @PatchMapping("/users/{username}/role")
    @PreAuthorize("hasAuthority('ADMIN')")
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
     * Endpoint exclusivo para que el Administrador elimine (baja lógica) o reactive
     * un usuario.
     * Se asegura de que el Administrador no pueda eliminar su propia cuenta.
     *
     * @param username  El nombre de usuario del usuario a eliminar o reactivar.
     * @param principal El principal que representa al Administrador autenticado.
     * @return Una respuesta indicando el éxito de la operación.
     */
    @DeleteMapping("/users/{username}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> deleteUserByAdmin(@PathVariable String username, Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().trim().isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

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
     * Endpoint exclusivo para que el Administrador elimine permanentemente un
     * usuario de la plataforma.
     * Esto incluye la eliminación de documentos, segúncorresponda.
     *
     * @param username  El nombre de usuario del usuario a eliminar permanentemente.
     * @param principal El principal que representa al Administrador autenticado.
     * @return Una respuesta indicando el éxito de la operación.
     */
    @DeleteMapping("/users/{username}/permanent")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> deleteUserPermanently(@PathVariable String username, Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().trim().isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        userService.deleteUserPermanently(username, principal.getName());

        return ResponseEntity.ok(Map.of(
                "message", "El usuario '" + username + "' ha sido eliminado permanentemente de PostgreSQL."));
    }

    /**
     * Endpoint para obtener el perfil completo de un usuario específico.
     * Solo accesible para el Administrador o el propio usuario autenticado.
     *
     * @param username El nombre de usuario del perfil a obtener.
     * @return El objeto Users correspondiente al perfil solicitado.
     */
    @GetMapping("/{username}")
    @PreAuthorize("hasAuthority('ADMIN') or #username == authentication.name")
    public ResponseEntity<Users> getUserProfile(@PathVariable String username) {
        Users user = userService.findByUsername(username)
                .orElseThrow(() -> new ServicesException("Perfil de usuario no encontrado"));
        return ResponseEntity.ok(user);
    }

    /**
     * Convierte un objeto Users en un mapa de respuesta para el endpoint de listado
     * de usuarios.
     * Este método asegura que solo se expongan los campos necesarios y evita la
     * exposición de información sensible como contraseñas.
     *
     * @param user El objeto Users a convertir.
     * @return Un mapa con los campos relevantes del usuario.
     */
    private Map<String, Object> toAdminUserResponse(Users user) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("userId", user.getUser_id());
        payload.put("username", user.getUsername());
        payload.put("email", user.getEmail());
        payload.put("role", user.getRole() != null ? user.getRole().name() : null);
        payload.put("enabled", user.isEnabled());
        return payload;
    }

    /**
     * Endpoint seguro para iniciar un curso específico para el alumno autenticado.
     * Valida la propiedad del curso mediante el username del token JWT activo.
     *
     * @param id        El ID de la matrícula del curso a iniciar.
     * @param principal El principal que representa al usuario autenticado.
     * @return Una respuesta indicando el éxito de la operación.
     */
    @PostMapping("/enrollment/{id}/start")
    public ResponseEntity<?> startCourse(@PathVariable Long id, Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().trim().isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }
        String authenticatedUsername = principal.getName();
        userService.startCourseSecure(id, authenticatedUsername);
        return ResponseEntity.ok().build();
    }
}
