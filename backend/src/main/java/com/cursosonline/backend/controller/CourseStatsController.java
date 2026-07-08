package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.CourseStatsDTO;
import com.cursosonline.backend.repository.CoursesRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/stats")
public class CourseStatsController {

    private final CoursesRepository coursesRepository;

    public CourseStatsController(CoursesRepository coursesRepository) {
        this.coursesRepository = coursesRepository;
    }

    /**
     * Endpoint analítico para obtener las estadísticas consolidadas de un curso
     * [ADR-41].
     * Valida de forma implícita la sesión mediante el token JWT y responde con el
     * DTO inmutable.
     */
    @GetMapping("/course/{courseId}")
    public ResponseEntity<?> getCourseStatistics(@PathVariable Long courseId, Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Sesión inválida o token JWT ausente."));
            }

            // Consume la consulta analítica segura con pies de plomo desde PostgreSQL
            return coursesRepository.getCourseAnalyticalStats(courseId)
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body((CourseStatsDTO) null)); // Retorna 404 limpio si el ID de curso no existe

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Excepción interna al procesar las agregaciones estadísticas",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }
}
