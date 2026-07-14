package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.TeacherGradeRequest;
import com.cursosonline.backend.entities.CourseGrade;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.CourseGradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/teacher/evaluations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PROFESSOR')")
public class TeacherEvaluationController {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseGradeRepository courseGradeRepository;

    /**
     * Endpoint exclusivo para que un profesor califique a un alumno.
     * Valida estrictamente que el profesor imparte la asignatura antes de guardar
     * la nota.
     */
    @PostMapping("/submit")
    public ResponseEntity<?> gradeStudent(@RequestBody TeacherGradeRequest request, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        String teacherUsername = principal.getName();

        // 1. BLINDAJE DE SEGURIDAD EXCLUSIVO: ¿Es este profesor el instructor real del
        // curso?
        boolean isAuthorized = enrollmentRepository.isInstructorAuthorizedForEnrollment(
                request.enrollmentId(),
                teacherUsername);

        if (!isAuthorized) {
            return ResponseEntity.status(403).body(Map.of(
                    "error",
                    "Acceso denegado: No eres el instructor asignado a esta asignatura o la matrícula no existe."));
        }

        // 2. RECUPERACIÓN Y PERSISTENCIA DE LA CALIFICACIÓN EN POSTGRESQL
        Enrollment enrollment = enrollmentRepository.findById(request.enrollmentId())
                .orElseThrow(() -> new IllegalArgumentException("Matrícula no encontrada"));

        CourseGrade newGrade = new CourseGrade();
        newGrade.setTitle(request.title());
        newGrade.setScore(request.score());
        newGrade.setEnrollment(enrollment);

        courseGradeRepository.save(newGrade);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Calificación registrada con éxito por el docente autorizado."));
    }
}
