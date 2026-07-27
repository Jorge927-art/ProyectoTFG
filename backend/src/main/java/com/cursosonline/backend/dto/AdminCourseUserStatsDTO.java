package com.cursosonline.backend.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO para representar las estadísticas de un usuario específico dentro de un
 * curso en el panel de administración.
 * AdminCourseUserStatsDTO
 * 
 * @param activeStudentsInCourse          El número de alumnos activos en el
 *                                        curso.
 * @param studentProgressPercentage       El progreso del estudiante
 *                                        seleccionado, null si es el profesor.
 * @param courseAverageProgressPercentage El progreso medio del curso.
 * @param studentGrades                   Las calificaciones del estudiante
 *                                        seleccionado, vacío si es el profesor.
 * @param workGrade                       Nota de trabajo del alumno
 *                                        seleccionado,
 *                                        null si no existe o si es profesor.
 * @param finalExamGrade                  Nota de examen final del alumno
 *                                        seleccionado, null si no existe o si
 *                                        es
 *                                        profesor.
 * @param completionRatePercentage        El porcentaje de alumnos inscritos con
 *                                        nota > 5.
 * @param averageCourseRating             La media de valoraciones de los
 *                                        alumnos (1-5), null si aún no hay
 *                                        votos.
 * @param averageInstructorRating         La media de valoración del profesor en
 *                                        este curso (1-5), null si aún no hay
 *                                        votos.
 */
public record AdminCourseUserStatsDTO(
        int activeStudentsInCourse,
        Integer studentProgressPercentage, // null si el seleccionado es el PROFESSOR
        int courseAverageProgressPercentage,
        List<GradeItem> studentGrades, // vacío si el seleccionado es el PROFESSOR
        Double workGrade, // null si no existe o si el seleccionado es el PROFESSOR
        Double finalExamGrade, // null si no existe o si el seleccionado es el PROFESSOR
        int completionRatePercentage, // % de alumnos inscritos con nota > 5
        Double averageCourseRating, // media de valoraciones de los alumnos (1-5), null si aún no hay votos
        Double averageInstructorRating // media de valoración del profesor en este curso (1-5), null si aún no hay
                                       // votos
) {
    public record GradeItem(String title, BigDecimal score) {
    }
}