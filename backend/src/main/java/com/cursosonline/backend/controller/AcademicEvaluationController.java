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

/**
 * Controlador REST para gestionar las evaluaciones académicas de los alumnos.
 * Proporciona endpoints para obtener asignaturas pendientes de evaluación y
 * enviar evaluaciones académicas.
 * AcademicEvaluationController
 */
@RestController
@RequestMapping("/api/v1/evaluations")
@Transactional
public class AcademicEvaluationController {

        private final EnrollmentRepository enrollmentRepository;
        private final AcademicEvaluationRepository academicEvaluationRepository;
        private final UserRepository userRepository;
        private final CoursesRepository coursesRepository;

        /**
         * Constructor de la clase AcademicEvaluationController.
         * 
         * @param enrollmentRepository         Repositorio utilizado para acceder a las
         *                                     matrículas de los alumnos.
         * @param academicEvaluationRepository Repositorio utilizado para acceder a las
         *                                     evaluaciones académicas.
         * @param userRepository               Repositorio utilizado para acceder a la
         *                                     información de los usuarios.
         * @param coursesRepository            Repositorio utilizado para acceder a la
         *                                     información de los cursos.
         */
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
         * [ENDPOINT OBTENER ASIGNATURAS PENDIENTES]: Recupera las asignaturas en las
         * que el alumno autenticado aún no ha emitido una evaluación académica.
         * 
         * @param authentication Objeto de autenticación que contiene la información del
         *                       usuario autenticado.
         * @return ResponseEntity con la lista de asignaturas pendientes de evaluación o
         *         un mensaje de error en caso de fallo.
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

                        // Hidratación controlada de la colección grades para evitar el error 500 de
                        // Jackson [ADR-40]
                        for (Enrollment enrollment : pending) {
                                if (enrollment.getGrades() != null) {
                                        enrollment.getGrades().size(); // Fuerza la carga limpia desde PostgreSQL antes
                                                                       // de serializar
                                }
                        }

                        return ResponseEntity.ok(pending);
                } catch (Exception e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                                        "error", "Error interno al recuperar asignaturas pendientes de evaluación",
                                        "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
                }
        }

        /**
         * [ENDPOINT ENVIAR EVALUACIÓN]: Permite a un alumno autenticado enviar una
         * evaluación académica para una asignatura específica. Se valida que el alumno
         * esté matriculado en la asignatura y que no haya emitido una evaluación
         * previa.
         * 
         * @param authentication Objeto de autenticación que contiene la información del
         *                       usuario autenticado.
         * @param payload        Mapa con los datos de la evaluación (course_id,
         *                       course_score, instructor_score, course_comment,
         *                       instructor_comment).
         * @return ResponseEntity con el resultado de la operación o un mensaje de error
         *         en caso de fallo.
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

                        // Extracción y parseo seguro del payload entrante
                        Long courseId = Long.valueOf(payload.get("course_id").toString());
                        Integer courseScore = Integer.valueOf(payload.get("course_score").toString());
                        Integer instructorScore = Integer.valueOf(payload.get("instructor_score").toString());
                        String courseComment = payload.get("course_comment") != null
                                        ? payload.get("course_comment").toString()
                                        : null;
                        String instructorComment = payload.get("instructor_comment") != null
                                        ? payload.get("instructor_comment").toString()
                                        : null;

                        if (courseScore > 5 || instructorScore > 5) {
                                return ResponseEntity.badRequest()
                                                .body(Map.of("error",
                                                                "Las puntuaciones deben estar confinadas entre 1 y 5 estrellas."));
                        }

                        if (courseScore < 1 || instructorScore < 1) {
                                return ResponseEntity.badRequest()
                                                .body(Map.of("error",
                                                                "Debes evaluar la calidad del curso y el desempeño docente antes de enviar la evaluación."));
                        }

                        // Rango de estrellas aceptado (1 a 5)
                        if (courseScore < 1 || courseScore > 5 || instructorScore < 1 || instructorScore > 5) {
                                return ResponseEntity.badRequest()
                                                .body(Map.of("error",
                                                                "Las puntuaciones deben estar confinadas entre 1 y 5 estrellas."));
                        }

                        String username = authentication.getName();

                        // [BLINDAJE PERIMETRAL JWT]: Validar que el alumno esté legítimamente
                        // matriculado
                        boolean isEnrolled = enrollmentRepository.existsByUsernameAndCourseId(username, courseId);
                        if (!isEnrolled) {
                                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                                .body(Map.of("error",
                                                                "Acceso denegado: No puedes evaluar una asignatura en la que no estás matriculado."));
                        }

                        // [CONTROL ANTE DUPLICADOS]: Validar que no exista un voto previo
                        boolean alreadyEvaluated = academicEvaluationRepository.existsByUserUsernameAndCourseCourseId(
                                        username,
                                        courseId);
                        if (alreadyEvaluated) {
                                return ResponseEntity.badRequest()
                                                .body(Map.of("error",
                                                                "Ya has emitido una calificación para esta asignatura."));
                        }

                        // [RECUPERACIÓN DE ENTIDADES Y PERSISTENCIA]: Obtener entidades y guardar
                        // evaluación
                        Users currentUser = userRepository.findByUsername(username)
                                        .orElseThrow(() -> new RuntimeException(
                                                        "Usuario no encontrado en el sistema."));

                        Courses currentCourse = coursesRepository.findById(courseId)
                                        .orElseThrow(() -> new RuntimeException(
                                                        "Asignatura no encontrada en el catálogo."));

                        AcademicEvaluation evaluation = new AcademicEvaluation();
                        evaluation.setCourse_score(courseScore);
                        evaluation.setCourseComment(courseComment);
                        evaluation.setInstructor_score(instructorScore);
                        evaluation.setInstructorComment(instructorComment);
                        evaluation.setUser(currentUser);
                        evaluation.setCourse(currentCourse);

                        academicEvaluationRepository.save(evaluation);

                        return ResponseEntity.ok(
                                        Map.of("message", "Evaluación académica guardada y procesada correctamente."));

                } catch (IllegalArgumentException | NullPointerException e) {
                        return ResponseEntity.badRequest()
                                        .body(Map.of("error",
                                                        "Estructura de datos de evaluación corrupta o incompleta."));
                } catch (Exception e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                                        "error", "Error crítico al guardar la evaluación en el servidor",
                                        "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
                }
        }
}
