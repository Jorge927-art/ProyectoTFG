package com.cursosonline.backend.dto; // Adapta el paquete a tu estructura real

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO Analítico Inmutable para el Componente Estadístico del Alumno [ADR-41].
 * Transporta las agregaciones calculadas en PostgreSQL protegiendo el flujo de
 * salida.
 */
public record CourseStatsDTO(
                @JsonProperty(access = JsonProperty.Access.READ_ONLY) Long courseId,
                @JsonProperty(access = JsonProperty.Access.READ_ONLY) Double averageGrade, // AVG de course_grades
                                                                                           // (casteado)
                @JsonProperty(access = JsonProperty.Access.READ_ONLY) Long localEnrollments, // COUNT de alumnos
                                                                                             // inscritos
                @JsonProperty(access = JsonProperty.Access.READ_ONLY) Double communityRating, // AVG de course_score en
                                                                                              // // evaluaciones
                @JsonProperty(access = JsonProperty.Access.READ_ONLY) Double instructorRating, // AVG de
                                                                                               // instructor_score en //
                                                                                               // evaluaciones
                @JsonProperty(access = JsonProperty.Access.READ_ONLY) String platform, // Mapeado desde Courses.site
                @JsonProperty(access = JsonProperty.Access.READ_ONLY) String category // Mapeado desde Courses.category
) {
}
