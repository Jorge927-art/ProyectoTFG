package com.cursosonline.backend.dto;

/**
 * DTO de comparación anual para gráficas del panel global.
 *
 * @param year                Año del dato.
 * @param totalStudents       Total de alumnos.
 * @param totalProfessors     Total de profesores.
 * @param topCourseEnrollment Nº de inscritos del curso con mayor demanda.
 * @param realData            true si el dato es real, false si es ficticio.
 */
public record AdminGlobalYearComparisonDTO(
        int year,
        int totalStudents,
        int totalProfessors,
        int topCourseEnrollment,
        boolean realData) {
}
