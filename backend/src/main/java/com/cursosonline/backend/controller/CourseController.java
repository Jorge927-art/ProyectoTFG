package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.RecommendationDTO;
import com.cursosonline.backend.dto.AssignTeacherWithDispatchConfigRequestDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ResourceNotFoundException;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.services.RecommendationService;
import com.cursosonline.backend.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * Controlador REST para gestionar las operaciones relacionadas con los cursos.
 * Proporciona endpoints para buscar cursos, obtener asignaturas asignadas a un
 * profesor, matricular estudiantes en cursos, obtener recomendaciones
 * personalizadas y asignar profesores a cursos.
 * CourseController
 */
@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final UserService userService;

    private final RecommendationService recommendationService;

    /**
     * Endpoint para buscar cursos en el catálogo utilizando un término de búsqueda
     * (keyword).
     * GET /api/courses/search?keyword=data
     *
     * @param keyword El término de búsqueda utilizado para filtrar los cursos.
     * @return ResponseEntity con la lista de cursos que coinciden con el término de
     *         búsqueda.
     */
    @GetMapping("/search")
    public ResponseEntity<List<Courses>> searchCatalog(
            @RequestParam(name = "keyword", required = false, defaultValue = "") String keyword) {
        return ResponseEntity.ok(userService.searchCourses(keyword));
    }

    /**
     * Endpoint para obtener las asignaturas asignadas al profesor autenticado.
     * GET /api/courses/assigned-to-me
     *
     * @param principal Objeto Principal que contiene la información del usuario
     *                  autenticado.
     * @return ResponseEntity con la lista de cursos asignados al profesor o un
     *         mensaje de error en caso de fallo.
     */
    @GetMapping("/assigned-to-me")
    public ResponseEntity<?> getAssignedCoursesForProfessor(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        try {
            List<Courses> assignedCourses = userService.getAssignedCoursesForProfessor(principal.getName());
            return ResponseEntity.ok(assignedCourses);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ocurrió un error inesperado al consultar las asignaturas asignadas."));
        }
    }

    /**
     * Endpoint transaccional seguro para procesar la matrícula de un estudiante.
     * POST /api/courses/enroll/{courseId}
     *
     * @param courseId  El ID del curso en el cual se desea matricular al
     *                  estudiante.
     * @param principal Objeto Principal que contiene la información del usuario
     *                  autenticado.
     * @return ResponseEntity con el resultado de la operación de matrícula.
     */
    @PostMapping("/enroll/{courseId}")
    public ResponseEntity<?> enrollInCourse(@PathVariable Long courseId, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        Enrollment enrollment = userService.enrollStudentInCourse(principal.getName(), courseId);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Te has matriculado en el curso con éxito de forma persistente.",
                "enrollmentId", enrollment.getEnrollmentid(),
                "userId", enrollment.getUser().getUser_id(),
                "courseId", enrollment.getCourse().getCourse_id(),
                "status", enrollment.getStatus()));
    }

    /**
     * Endpoint para obtener recomendaciones inteligentes para el estudiante
     * autenticado.
     * GET /api/courses/recommendations
     *
     * @param principal Objeto Principal que contiene la información del usuario
     *                  autenticado.
     * @return ResponseEntity con la lista de recomendaciones personalizadas o un
     *         mensaje de error en caso de fallo.
     */
    @GetMapping("/recommendations")
    public ResponseEntity<?> getSmartRecommendations(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        // Resolución de identidad mediante la sesión JWT [ADR-27]
        Users user = userService.findByUsername(principal.getName())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Estudiante no registrado en el sistema."));
        }

        List<RecommendationDTO> recommendations = recommendationService.getRecommendationsForUser(user.getUser_id());
        return ResponseEntity.ok(recommendations);
    }

    /**
     * Endpoint transaccional seguro para procesar la asignación relacional de un
     * curso.
     * POST /api/courses/{courseId}/assign-teacher
     *
     * @param courseId  El ID del curso al cual se desea asignar un profesor.
     * @param principal Objeto Principal que contiene la información del usuario
     *                  autenticado.
     * @return ResponseEntity con el resultado de la operación de asignación.
     */
    @PostMapping("/{courseId}/assign-teacher")
    @PreAuthorize("hasAuthority('PROFESSOR')")
    public ResponseEntity<?> assignTeacherToCourse(@PathVariable Long courseId, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        try {
            // Invocamos la lógica de negocio genérica construida en el servicio de usuarios
            Courses updatedCourse = userService.assignUserToCourse(principal.getName(), courseId);

            return ResponseEntity.ok(Map.of(
                    "message", "El curso ha sido vinculado relacionalmente con éxito.",
                    "courseId", updatedCourse.getCourse_id(),
                    "title", updatedCourse.getTitle(),
                    "assignedUserId", updatedCourse.getAssignedUser().getUser_id(),
                    "assignedUsername", updatedCourse.getAssignedUser().getUsername(),
                    "role", updatedCourse.getAssignedUser().getRole().name()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (ServicesException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ocurrió un error inesperado al procesar la vinculación relacional."));
        }
    }

    @PostMapping("/{courseId}/assign-teacher-with-alert-config")
    @PreAuthorize("hasAuthority('PROFESSOR')")
    public ResponseEntity<?> assignTeacherToCourseWithAlertConfig(
            @PathVariable Long courseId,
            @RequestBody AssignTeacherWithDispatchConfigRequestDTO request,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        try {
            Courses updatedCourse = userService.assignUserToCourseWithDispatchConfig(
                    principal.getName(),
                    courseId,
                    request != null ? request.dispatchParts() : null);

            return ResponseEntity.ok(Map.of(
                    "message", "Curso asignado y configuración de avisos guardada correctamente.",
                    "courseId", updatedCourse.getCourse_id(),
                    "title", updatedCourse.getTitle(),
                    "assignedUserId", updatedCourse.getAssignedUser().getUser_id(),
                    "assignedUsername", updatedCourse.getAssignedUser().getUsername(),
                    "role", updatedCourse.getAssignedUser().getRole().name()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (ServicesException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error",
                            "Ocurrió un error inesperado al asignar el curso y guardar la configuración."));
        }
    }
}
