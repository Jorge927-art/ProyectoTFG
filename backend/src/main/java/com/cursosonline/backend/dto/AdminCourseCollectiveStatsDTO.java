package com.cursosonline.backend.dto;

/**
 * DTO con métricas colectivas del curso para el panel estadístico de admin.
 *
 * @param activeStudentsInCourse          Número de alumnos activos en el curso.
 * @param courseAverageProgressPercentage Progreso medio del curso (0-100).
 * @param completionRatePercentage        Porcentaje de alumnos inscritos con
 *                                        nota > 5.
 * @param averageCourseRating             Valoración media del curso (1-5), null
 *                                        si no hay votos.
 * @param averageInstructorRating         Valoración media del profesor (1-5),
 *                                        null si no hay votos.
 * @param averageGrade                    Nota media global del curso, null si
 *                                        no hay calificaciones.
 * @param averageWorkGrade                Nota media de
 *                                        trabajos/proyectos/prácticas, null si
 *                                        no hay.
 * @param averageFinalExamGrade           Nota media de examen final, null si no
 *                                        hay.
 */
public record AdminCourseCollectiveStatsDTO(
        int activeStudentsInCourse,
        int courseAverageProgressPercentage,
        int completionRatePercentage,
        Double averageCourseRating,
        Double averageInstructorRating,
        Double averageGrade,
        Double averageWorkGrade,
        Double averageFinalExamGrade) {
}
