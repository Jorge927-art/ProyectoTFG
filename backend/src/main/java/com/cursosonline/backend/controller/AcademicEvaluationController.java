package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.AcademicEvaluation;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.AcademicEvaluationRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.repository.CoursesRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/evaluations")
@Transactional
public class AcademicEvaluationController {

    private final EnrollmentRepository enrollmentRepository;
    private final AcademicEvaluationRepository academicEvaluationRepository;
    private final UserRepository userRepository;
    private final CoursesRepository coursesRepository;

    public AcademicEvaluationController(EnrollmentRepository enrollmentRepository,
            AcademicEvaluationRepository academicEvaluationRepository,
            UserRepository userRepository,
            CoursesRepository coursesRepository) {
        this.enrollmentRepository = enrollmentRepository;
        this.academicEvaluationRepository = academicEvaluationRepository;
        this.userRepository = userRepository;
        this.coursesRepository = coursesRepository;
    }

    /**
     * [ENDPOINT FILTRADO DOCENTE]: Obtiene las asignaturas y profesores que el
     * alumno
     * cursa activamente y que se encuentran pendientes de recibir calificación.
     */
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingEvaluations(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o sesión inválida."));
            }

            String username = authentication.getName();
            List<Enrollment> pending = enrollmentRepository.findPendingEvaluationsByUsername(username);

            return ResponseEntity.ok(pending);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error interno al recuperar asignaturas pendientes de evaluación",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * [ENDPOINT CARGA PUNTUACIONES]: Valida las precondiciones de seguridad y
     * almacena el voto granular de estrellas y comentarios en PostgreSQL.
     */
    @PostMapping("/submit")
    public ResponseEntity<?> submitEvaluation(
            Authentication authentication,
            @RequestBody Map<String, Object> payload) {

        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o sesión inválida."));
            }

            // 1. Extracción y parseo seguro del payload entrante
            Long courseId = Long.valueOf(payload.get("course_id").toString());
            Integer courseScore = Integer.valueOf(payload.get("course_score").toString());
            Integer instructorScore = Integer.valueOf(payload.get("instructor_score").toString());
            String courseComment = payload.get("course_comment") != null ? payload.get("course_comment").toString()
                    : null;
            String instructorComment = payload.get("instructor_comment") != null
                    ? payload.get("instructor_comment").toString()
                    : null;

            // Rango de estrellas aceptado (1 a 5)
            if (courseScore < 1 || courseScore > 5 || instructorScore < 1 || instructorScore > 5) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Las puntuaciones deben estar confinadas entre 1 y 5 estrellas."));
            }

            String username = authentication.getName();

            // 2. [BLINDAJE PERIMETRAL JWT]: Validar que el alumno esté legítimamente
            // matriculado
            boolean isEnrolled = enrollmentRepository.existsByUsernameAndCourseId(username, courseId);
            if (!isEnrolled) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error",
                                "Acceso denegado: No puedes evaluar una asignatura en la que no estás matriculado."));
            }

            // 3. [CONTROL ANTE DUPLICADOS]: Validar que no exista un voto previo
            boolean alreadyEvaluated = academicEvaluationRepository.existsByUserUsernameAndCourseCourseId(username,
                    courseId);
            if (alreadyEvaluated) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Ya has emitido una calificación para esta asignatura."));
            }

            // 4. Recuperación de entidades y persistencia
            Users currentUser = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado en el sistema."));

            Courses currentCourse = coursesRepository.findById(courseId)
                    .orElseThrow(() -> new RuntimeException("Asignatura no encontrada en el catálogo."));

            AcademicEvaluation evaluation = new AcademicEvaluation();
            evaluation.setCourse_score(courseScore);
            evaluation.setCourseComment(courseComment);
            evaluation.setInstructor_score(instructorScore);
            evaluation.setInstructorComment(instructorComment);
            evaluation.setUser(currentUser);
            evaluation.setCourse(currentCourse);

            academicEvaluationRepository.save(evaluation);

            return ResponseEntity.ok(Map.of("message", "Evaluación académica guardada y procesada correctamente."));

        } catch (IllegalArgumentException | NullPointerException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Estructura de datos de evaluación corrupta o incompleta."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error crítico al guardar la evaluación en el servidor",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }
}
