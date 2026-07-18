package com.cursosonline.backend.dto;

/**
 * Record que modela el contrato de salida para las métricas de un curso.
 * Centraliza la captura de información enviada al frontend.
 * CourseMetricsDTO
 * 
 * @param activeStudentsCount
 * @param groupAverageGrade
 * @param pendingSubmissionsCount
 */
public record CourseMetricsDTO(
        int activeStudentsCount,
        Double groupAverageGrade,
        long pendingSubmissionsCount) {
}
