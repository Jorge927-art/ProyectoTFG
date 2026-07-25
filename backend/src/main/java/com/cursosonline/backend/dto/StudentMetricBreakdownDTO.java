package com.cursosonline.backend.dto;

/**
 * DTO de desglose individual por alumno para las secciones "Progreso Alumno"
 * y "Nota Alumno" del panel de Métricas de Docencia.
 * Cuando el selector está en TODOS, courseId/courseTitle permiten distinguir
 * a qué asignatura pertenece cada fila del alumno en la lista agregada.
 */
public record StudentMetricBreakdownDTO(
        Long userId,
        String username,
        String email,
        Long courseId,
        String courseTitle,
        Integer progressPercentage,
        Double averageGrade) {
}
