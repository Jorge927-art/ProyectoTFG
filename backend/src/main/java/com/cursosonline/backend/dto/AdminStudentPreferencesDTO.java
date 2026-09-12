package com.cursosonline.backend.dto;

import java.util.List;

/**
 * Resumen agregado de preferencias y demanda de cursos para el panel admin.
 */
public record AdminStudentPreferencesDTO(
        int studentsWithPreferences,
        int activeStudentsWithEnrollments,
        List<PreferenceSummary> preferences,
        List<CourseDemand> courses) {

    public record PreferenceSummary(
            String dimension,
            List<String> values,
            int selections,
            int analyzedStudents) {
    }

    public record CourseDemand(
            Long courseId,
            String title,
            int totalScore,
            double categoryScore,
            double enrollmentScore,
            double levelScore,
            double languageScore,
            double subtitleScore,
            double durationScore,
            long activeEnrollments,
            boolean professorAssigned,
            String professorUsername) {
    }
}
