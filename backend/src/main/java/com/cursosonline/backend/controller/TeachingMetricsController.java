package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.StudentMetricBreakdownDTO;
import com.cursosonline.backend.dto.TeachingMetricsSummaryDTO;
import com.cursosonline.backend.services.TeachingMetricsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

/**
 * Controlador REST para gestionar las métricas de enseñanza en el panel del
 * profesor.
 * Proporciona endpoints para obtener resúmenes y desgloses de métricas
 * relacionadas con la enseñanza.
 * TeachingMetricsController
 */
@RestController
@RequestMapping("/api/v1/teacher/metrics")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PROFESSOR')")
public class TeachingMetricsController {

    private final TeachingMetricsService teachingMetricsService;

    /**
     * [PANEL DOCENTE - RESUMEN]: resumen de métricas generales del curso, scopeado
     * a los cursos del profesor.
     * Alimenta la sección "Resumen de Métricas" del panel docente.
     * 
     * @param courseId  ID del curso para el cual se desea obtener el resumen de
     *                  métricas.
     * @param principal Objeto Principal que contiene la información del profesor
     *                  autenticado.
     * @return ResponseEntity con un TeachingMetricsSummaryDTO que contiene el
     *         resumen de métricas del curso.
     */
    @GetMapping("/summary")
    public ResponseEntity<TeachingMetricsSummaryDTO> getSummary(@RequestParam(required = false) Long courseId,
            Principal principal) {
        TeachingMetricsSummaryDTO summary = teachingMetricsService.getSummary(courseId,
                resolvePrincipalName(principal));
        return ResponseEntity.ok(summary);
    }

    /**
     * [PANEL DOCENTE - DESGLOSE DE ESTUDIANTES]: desglose de métricas por
     * estudiante, scopeado a los cursos del profesor.
     * Alimenta la sección "Desglose de Estudiantes" del panel docente.
     * 
     * @param courseId  ID del curso para el cual se desea obtener el desglose de
     *                  métricas por estudiante.
     * @param principal Objeto Principal que contiene la información del profesor
     *                  autenticado.
     * @return ResponseEntity con una lista de StudentMetricBreakdownDTO que
     *         contiene el desglose de métricas por estudiante.
     */
    @GetMapping("/students")
    public ResponseEntity<List<StudentMetricBreakdownDTO>> getStudentBreakdown(
            @RequestParam(required = false) Long courseId,
            Principal principal) {
        List<StudentMetricBreakdownDTO> breakdown = teachingMetricsService.getStudentBreakdown(courseId,
                resolvePrincipalName(principal));
        return ResponseEntity.ok(breakdown);
    }

    /**
     * Resuelve el nombre del principal a partir del objeto Principal proporcionado.
     * Lanza una excepción si el principal es nulo o inválido.
     * 
     * @param principal Objeto Principal que contiene la información del profesor
     *                  autenticado.
     * @return El nombre del principal (profesor) autenticado.
     */
    private String resolvePrincipalName(Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            throw new AuthenticationCredentialsNotFoundException("Sesión inválida o expirada.");
        }
        return principal.getName();
    }
}