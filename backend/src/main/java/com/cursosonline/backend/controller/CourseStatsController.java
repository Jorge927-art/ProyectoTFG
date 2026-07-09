package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.CourseStatsDTO;
import com.cursosonline.backend.services.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/stats")
public class CourseStatsController {

    private final UserService userService;

    // Modificamos el constructor para inyectar el servicio en lugar del repositorio
    public CourseStatsController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Endpoint analítico para obtener las estadísticas consolidadas de un curso
     * [ADR-41].
     * Valida de forma implícita la sesión mediante el token JWT y responde con el
     * DTO inmutable.
     */
    @GetMapping("/course/{courseId}")
    public ResponseEntity<?> getCourseStatistics(@PathVariable(name = "courseId") Long courseId,
            Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Sesión inválida o token JWT ausente."));
            }

            // [CORREGIDO] Consume el servicio que procesa la consulta nativa de PostgreSQL
            CourseStatsDTO stats = userService.getCourseStats(courseId);

            if (stats == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body((CourseStatsDTO) null); // Retorna 404 limpio si el ID de curso no existe o no tiene datos
            }

            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Excepción interna al procesar las agregaciones estadísticas",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }

    }
}
