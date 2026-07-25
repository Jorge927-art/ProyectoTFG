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
 * Controlador del panel "Métricas de Docencia" [nueva funcionalidad].
 * courseId ausente o null en ambos endpoints representa la opción TODOS del
 * selector del frontend, agregando sobre todas las asignaturas asignadas al
 * profesor autenticado.
 */
@RestController
@RequestMapping("/api/v1/teacher/metrics")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PROFESSOR')")
public class TeachingMetricsController {

    private final TeachingMetricsService teachingMetricsService;

    /**
     * [PANEL DOCENTE - RESUMEN]: progreso colectivo, tasa de finalización, nota
     * media y valoraciones (curso/profesor) para la asignatura seleccionada o
     * para TODAS si courseId no se envía.
     */
    @GetMapping("/summary")
    public ResponseEntity<TeachingMetricsSummaryDTO> getSummary(@RequestParam(required = false) Long courseId,
            Principal principal) {
        TeachingMetricsSummaryDTO summary = teachingMetricsService.getSummary(courseId,
                resolvePrincipalName(principal));
        return ResponseEntity.ok(summary);
    }

    /**
     * [PANEL DOCENTE - DESGLOSE ALUMNO]: progreso y nota individual por alumno,
     * scopeado igual que /summary. Alimenta las listas "Progreso Alumno" y
     * "Nota Alumno".
     */
    @GetMapping("/students")
    public ResponseEntity<List<StudentMetricBreakdownDTO>> getStudentBreakdown(
            @RequestParam(required = false) Long courseId,
            Principal principal) {
        List<StudentMetricBreakdownDTO> breakdown = teachingMetricsService.getStudentBreakdown(courseId,
                resolvePrincipalName(principal));
        return ResponseEntity.ok(breakdown);
    }

    private String resolvePrincipalName(Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            throw new AuthenticationCredentialsNotFoundException("Sesión inválida o expirada.");
        }
        return principal.getName();
    }
}