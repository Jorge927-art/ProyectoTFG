package com.cursosonline.backend.dto;

import java.util.List;

/**
 * DTO principal del panel estadístico global de administración.
 *
 * @param currentYear       Año actual (dinámico en vivo).
 * @param totalStudents     Total de alumnos actuales.
 * @param totalProfessors   Total de profesores actuales.
 * @param topCourses        Ranking actual de cursos por nº de inscritos.
 * @param yearlyComparisons Comparativa anual (año actual + 2 anteriores).
 */
public record AdminGlobalStatisticsDTO(
        int currentYear,
        int totalStudents,
        int totalProfessors,
        List<AdminGlobalTopCourseDTO> topCourses,
        List<AdminGlobalYearComparisonDTO> yearlyComparisons) {
}
