package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.StudentMetricBreakdownDTO;
import com.cursosonline.backend.dto.TeachingMetricsSummaryDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
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
    private final UserService userService;

    /**
     * Resuelve la lista de IDs de asignaturas que el profesor autenticado puede
     * consultar.
     * Si se pasa un courseId concreto, se valida que el profesor lo imparta.
     * 
     * @param courseId          El ID de la asignatura que se desea consultar, o
     *                          null para todas las asignaturas del profesor.
     * @param professorUsername El nombre de usuario del profesor autenticado.
     * @return Una lista de IDs de asignaturas que el profesor puede consultar.
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
     * Calcula el resumen de métricas de docencia para un profesor y una asignatura
     * concreta o todas sus asignaturas.
     * 
     * @param courseId          El ID de la asignatura que se desea consultar, o
     *                          null para todas las asignaturas del profesor.
     * @param professorUsername El nombre de usuario del profesor autenticado.
     * @return Un objeto TeachingMetricsSummaryDTO que contiene las métricas
     *         agregadas.
     */
    public TeachingMetricsSummaryDTO getSummary(Long courseId, String professorUsername) {
        List<Long> courseIds = resolveCourseIds(courseId, professorUsername);

        if (courseIds.isEmpty()) {
            return new TeachingMetricsSummaryDTO(courseId, 0.0, 0.0, 0.0);
        }

        List<Enrollment> enrollments = enrollmentRepository.findActiveStudentEnrollmentsByCourseIds(courseIds);

        double collectiveProgress = 0.0;
        double completionRate = 0.0;

        if (!enrollments.isEmpty()) {
            int totalStudents = enrollments.size();
            int accumulatedProgress = 0;
            int completedStudents = 0;

            for (Enrollment enrollment : enrollments) {
                int dynamicProgress = userService.calculateCurrentProgress(enrollment);
                accumulatedProgress += dynamicProgress;
                if (dynamicProgress >= 100) {
                    completedStudents++;
                }
            }

            collectiveProgress = (double) accumulatedProgress / totalStudents;
            completionRate = (completedStudents * 100.0) / totalStudents;
        }

        Double averageGrade = courseGradeRepository.getGroupAverageScoreByCourseIds(courseIds);

        return new TeachingMetricsSummaryDTO(
                courseId,
                collectiveProgress,
                completionRate,
                averageGrade != null ? averageGrade : 0.0);
    }

    /**
     * Calcula el desglose individual por alumno (progreso y nota media) para
     * el ámbito resuelto, usado por "Progreso Alumno" y "Nota Alumno".
     * 
     * @param courseId          El ID de la asignatura que se desea consultar, o
     *                          null para todas las asignaturas del profesor.
     * @param professorUsername El nombre de usuario del profesor autenticado.
     * @return Una lista de objetos StudentMetricBreakdownDTO que contienen las
     *         métricas individuales por alumno.
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
                    userService.calculateCurrentProgress(enrollment),
                    individualGrade != null ? individualGrade : 0.0);
        }).toList();
    }
}