package com.cursosonline.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO Analítico Inmutable para el panel "Métricas de Docencia" del profesor
 * [nueva funcionalidad].
 * Transporta las agregaciones calculadas sobre una asignatura concreta o
 * sobre TODAS las asignaturas asignadas al docente autenticado, cuando el
 * selector se encuentra en la opción TODOS (courseId == null).
 */
public record TeachingMetricsSummaryDTO(
        @JsonProperty(access = JsonProperty.Access.READ_ONLY) Long courseId, // null = TODOS
        @JsonProperty(access = JsonProperty.Access.READ_ONLY) Double collectiveProgress, // AVG progress de
                                                                                         // enrollment
        @JsonProperty(access = JsonProperty.Access.READ_ONLY) Double completionRate, // % matrículas al 100%
        @JsonProperty(access = JsonProperty.Access.READ_ONLY) Double averageGrade, // AVG de course_grades
        @JsonProperty(access = JsonProperty.Access.READ_ONLY) Double courseRating, // AVG course_score
                                                                                   // evaluaciones
        @JsonProperty(access = JsonProperty.Access.READ_ONLY) Double instructorRating // AVG instructor_score
                                                                                      // evaluaciones
) {
}
