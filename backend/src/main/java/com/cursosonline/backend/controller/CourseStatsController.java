package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.CourseStatsDTO;
import com.cursosonline.backend.services.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controlador REST para gestionar las operaciones relacionadas con las
 * estadísticas de cursos.
 * Proporciona un endpoint para obtener estadísticas consolidadas de un curso
 * específico.
 * CourseStatsController
 */
@RestController
@RequestMapping("/api/v1/stats")
public class CourseStatsController {

    private final UserService userService;

    /**
     * Constructor de la clase CourseStatsController.
     * 
     * @param userService Servicio utilizado para obtener las estadísticas del
     *                    curso.
     */
    public CourseStatsController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Endpoint para obtener estadísticas consolidadas de un curso específico.
     * 
     * @param courseId       El ID del curso del cual se desean obtener las
     *                       estadísticas.
     * @param authentication Objeto Authentication que contiene la información del
     *                       usuario autenticado.
     * @return ResponseEntity con las estadísticas del curso o un mensaje de error
     *         en caso de fallo.
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
