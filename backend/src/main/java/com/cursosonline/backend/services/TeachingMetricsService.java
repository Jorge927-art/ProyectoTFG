package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.StudentMetricBreakdownDTO;
import com.cursosonline.backend.dto.TeachingMetricsSummaryDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.repository.AcademicEvaluationRepository;
import com.cursosonline.backend.repository.CourseGradeRepository;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

/**
 * Servicio del panel "Métricas de Docencia".
 * Centraliza la resolución del ámbito de asignaturas (una sola concreta, o
 * TODAS las asignadas al profesor autenticado cuando el selector del
 * frontend envía courseId = null) y agrega las estadísticas consolidadas.
 */
@Service
@RequiredArgsConstructor
public class TeachingMetricsService {

    private final CoursesRepository coursesRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseGradeRepository courseGradeRepository;
    private final AcademicEvaluationRepository academicEvaluationRepository;

    /**
     * Resuelve el ámbito de asignaturas para el profesor autenticado:
     * - courseId == null => TODOS: todas las asignaturas que imparte.
     * - courseId != null => valida que el profesor realmente la imparte antes
     * de devolver un ámbito de una sola asignatura.
     */
    private List<Long> resolveCourseIds(Long courseId, String professorUsername) {
        List<Courses> assigned = coursesRepository.findAllAssignedToProfessor(professorUsername);

        if (courseId == null) {
            return assigned.stream()
                    .filter(Objects::nonNull)
                    .map(course -> course.getCourse_id())
                    .filter(Objects::nonNull)
                    .toList();
        }

        boolean owns = assigned.stream()
                .filter(Objects::nonNull)
                .anyMatch(c -> courseId.equals(c.getCourse_id()));
        if (!owns) {
            throw new AccessDeniedException("El profesor no imparte la asignatura solicitada.");
        }
        return List.of(courseId);
    }

    /**
     * Calcula el resumen agregado (progreso colectivo, tasa de finalización,
     * nota media, valoraciones del curso y del profesor) para el ámbito
     * resuelto.
     */
    public TeachingMetricsSummaryDTO getSummary(Long courseId, String professorUsername) {
        List<Long> courseIds = resolveCourseIds(courseId, professorUsername);

        if (courseIds.isEmpty()) {
            return new TeachingMetricsSummaryDTO(courseId, 0.0, 0.0, 0.0, 0.0, 0.0);
        }

        Double collectiveProgress = enrollmentRepository.getAverageProgressByCourseIds(courseIds);
        Double completionRate = enrollmentRepository.getCompletionRateByCourseIds(courseIds);
        Double averageGrade = courseGradeRepository.getGroupAverageScoreByCourseIds(courseIds);
        Double courseRating = academicEvaluationRepository.getAverageCourseScoreByCourseIds(courseIds);
        Double instructorRating = academicEvaluationRepository.getAverageInstructorScoreByCourseIds(courseIds);

        return new TeachingMetricsSummaryDTO(
                courseId,
                collectiveProgress != null ? collectiveProgress : 0.0,
                completionRate != null ? completionRate : 0.0,
                averageGrade != null ? averageGrade : 0.0,
                courseRating != null ? courseRating : 0.0,
                instructorRating != null ? instructorRating : 0.0);
    }

    /**
     * Calcula el desglose individual por alumno (progreso y nota media) para
     * el ámbito resuelto, usado por "Progreso Alumno" y "Nota Alumno".
     */
    public List<StudentMetricBreakdownDTO> getStudentBreakdown(Long courseId, String professorUsername) {
        List<Long> courseIds = resolveCourseIds(courseId, professorUsername);
        if (courseIds.isEmpty()) {
            return List.of();
        }

        List<Enrollment> enrollments = enrollmentRepository.findActiveStudentEnrollmentsByCourseIds(courseIds);

        return enrollments.stream().map(enrollment -> {
            Long studentId = enrollment.getUser().getUser_id();
            Long enrollmentCourseId = enrollment.getCourse().getCourse_id();

            Double individualGrade = courseGradeRepository
                    .getIndividualStudentAverageScore(enrollmentCourseId, studentId);

            return new StudentMetricBreakdownDTO(
                    studentId,
                    enrollment.getUser().getUsername(),
                    enrollment.getUser().getEmail(),
                    enrollmentCourseId,
                    enrollment.getCourse().getTitle(),
                    enrollment.getProgress_percentage(),
                    individualGrade != null ? individualGrade : 0.0);
        }).toList();
    }
}