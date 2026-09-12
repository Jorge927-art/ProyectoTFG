package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.StudentMetricBreakdownDTO;
import com.cursosonline.backend.dto.TeachingMetricsSummaryDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.CourseGradeRepository;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Suite de Pruebas Unitarias para TeachingMetricsService")
class TeachingMetricsServiceTest {

    @Mock
    private CoursesRepository coursesRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private CourseGradeRepository courseGradeRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private TeachingMetricsService teachingMetricsService;

    private Courses course(Long courseId, String title) {
        Courses course = new Courses();
        course.setCourse_id(courseId);
        course.setTitle(title);
        return course;
    }

    private Enrollment enrollment(Long studentId, String username, String email, Long courseId, String courseTitle,
            int progress) {
        Users user = new Users();
        user.setUser_id(studentId);
        user.setUsername(username);
        user.setEmail(email);

        Courses course = course(courseId, courseTitle);

        Enrollment enrollment = new Enrollment();
        enrollment.setUser(user);
        enrollment.setCourse(course);
        enrollment.setProgress_percentage(progress);
        return enrollment;
    }

    @Test
    @DisplayName("Debe agregar todas las asignaturas asignadas cuando el selector llega en null")
    void getSummary_WhenCourseIdIsNull_ShouldAggregateAllAssignedCourses() {
        Enrollment firstEnrollment = enrollment(1L, "alumno1", "alumno1@uni.es", 10L, "Arquitectura", 0);
        Enrollment secondEnrollment = enrollment(2L, "alumno2", "alumno2@uni.es", 20L, "Bases", 0);

        when(coursesRepository.findAllAssignedToProfessor("profesor"))
                .thenReturn(Arrays.asList(course(10L, "Arquitectura"), null, course(20L, "Bases")));
        when(enrollmentRepository.findActiveStudentEnrollmentsByCourseIds(List.of(10L, 20L)))
                .thenReturn(List.of(firstEnrollment, secondEnrollment));
        when(userService.calculateCurrentProgress(firstEnrollment)).thenReturn(60);
        when(userService.calculateCurrentProgress(secondEnrollment)).thenReturn(100);
        when(courseGradeRepository.getGroupAverageScoreByCourseIds(List.of(10L, 20L))).thenReturn(null);

        TeachingMetricsSummaryDTO summary = teachingMetricsService.getSummary(null, "profesor");

        assertNull(summary.courseId());
        assertEquals(80.0, summary.collectiveProgress());
        assertEquals(50.0, summary.completionRate());
        assertEquals(0.0, summary.averageGrade());
        verify(enrollmentRepository).findActiveStudentEnrollmentsByCourseIds(List.of(10L, 20L));
    }

    @Test
    @DisplayName("Debe rechazar el acceso cuando el profesor solicita un curso fuera de su ámbito")
    void getSummary_WhenCourseDoesNotBelongToProfessor_ShouldThrowAccessDenied() {
        when(coursesRepository.findAllAssignedToProfessor("profesor"))
                .thenReturn(List.of(course(10L, "Arquitectura")));

        assertThrows(AccessDeniedException.class, () -> teachingMetricsService.getSummary(99L, "profesor"));
        verifyNoInteractions(enrollmentRepository, courseGradeRepository);
    }

    @Test
    @DisplayName("Debe devolver ceros cuando el profesor no tiene asignaturas asignadas")
    void getSummary_WhenProfessorHasNoAssignedCourses_ShouldReturnZeroSummary() {
        when(coursesRepository.findAllAssignedToProfessor("profesor")).thenReturn(List.of());

        TeachingMetricsSummaryDTO summary = teachingMetricsService.getSummary(null, "profesor");

        assertNull(summary.courseId());
        assertEquals(0.0, summary.collectiveProgress());
        assertEquals(0.0, summary.completionRate());
        assertEquals(0.0, summary.averageGrade());
        verifyNoInteractions(enrollmentRepository, courseGradeRepository);
    }

    @Test
    @DisplayName("Debe calcular progreso colectivo y tasa de finalización para una asignatura concreta")
    void getSummary_WhenCourseIdIsConcrete_ShouldAggregateActiveEnrollments() {
        Enrollment inProgress = enrollment(1L, "alumno1", "alumno1@uni.es", 10L, "Arquitectura", 0);
        Enrollment completed = enrollment(2L, "alumno2", "alumno2@uni.es", 10L, "Arquitectura", 100);
        Courses assignedCourse = course(10L, "Arquitectura");

        when(coursesRepository.findAllAssignedToProfessor("profesor")).thenReturn(List.of(assignedCourse));
        when(enrollmentRepository.findActiveStudentEnrollmentsByCourseIds(List.of(10L)))
                .thenReturn(List.of(inProgress, completed));
        when(userService.calculateCurrentProgress(inProgress)).thenReturn(40);
        when(userService.calculateCurrentProgress(completed)).thenReturn(100);
        when(courseGradeRepository.getGroupAverageScoreByCourseIds(List.of(10L))).thenReturn(7.5);

        TeachingMetricsSummaryDTO summary = teachingMetricsService.getSummary(10L, "profesor");

        assertEquals(10L, summary.courseId());
        assertEquals(70.0, summary.collectiveProgress());
        assertEquals(50.0, summary.completionRate());
        assertEquals(7.5, summary.averageGrade());
    }

    @Test
    @DisplayName("Debe conservar la media de notas aunque no haya matrículas activas")
    void getSummary_WhenThereAreNoEnrollments_ShouldStillReturnAverageGrade() {
        Courses assignedCourse = course(10L, "Arquitectura");

        when(coursesRepository.findAllAssignedToProfessor("profesor")).thenReturn(List.of(assignedCourse));
        when(enrollmentRepository.findActiveStudentEnrollmentsByCourseIds(List.of(10L))).thenReturn(List.of());
        when(courseGradeRepository.getGroupAverageScoreByCourseIds(List.of(10L))).thenReturn(8.25);

        TeachingMetricsSummaryDTO summary = teachingMetricsService.getSummary(10L, "profesor");

        assertEquals(0.0, summary.collectiveProgress());
        assertEquals(0.0, summary.completionRate());
        assertEquals(8.25, summary.averageGrade());
        verify(userService, org.mockito.Mockito.never()).calculateCurrentProgress(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Debe construir el desglose individual y normalizar notas nulas a cero")
    void getStudentBreakdown_WhenCourseIdIsNull_ShouldMapStudentsAndNormalizeGrades() {
        Enrollment firstEnrollment = enrollment(1L, "alumno1", "alumno1@uni.es", 10L, "Arquitectura", 90);
        Enrollment secondEnrollment = enrollment(2L, "alumno2", "alumno2@uni.es", 20L, "Bases", 70);

        when(coursesRepository.findAllAssignedToProfessor("profesor"))
                .thenReturn(List.of(course(10L, "Arquitectura"), course(20L, "Bases")));
        when(enrollmentRepository.findActiveStudentEnrollmentsByCourseIds(List.of(10L, 20L)))
                .thenReturn(List.of(firstEnrollment, secondEnrollment));
        when(userService.calculateCurrentProgress(firstEnrollment)).thenReturn(90);
        when(userService.calculateCurrentProgress(secondEnrollment)).thenReturn(70);
        when(courseGradeRepository.getIndividualStudentAverageScore(10L, 1L)).thenReturn(8.7);
        when(courseGradeRepository.getIndividualStudentAverageScore(20L, 2L)).thenReturn(null);

        List<StudentMetricBreakdownDTO> breakdown = teachingMetricsService.getStudentBreakdown(null, "profesor");

        assertEquals(2, breakdown.size());
        assertEquals("alumno1", breakdown.get(0).username());
        assertEquals("Arquitectura", breakdown.get(0).courseTitle());
        assertEquals(90, breakdown.get(0).progressPercentage());
        assertEquals(8.7, breakdown.get(0).averageGrade());
        assertEquals(70, breakdown.get(1).progressPercentage());
        assertEquals(0.0, breakdown.get(1).averageGrade());
        verify(courseGradeRepository).getIndividualStudentAverageScore(10L, 1L);
        verify(courseGradeRepository).getIndividualStudentAverageScore(20L, 2L);
    }

    @Test
    @DisplayName("Debe devolver una lista vacía de desglose cuando no hay cursos asignados")
    void getStudentBreakdown_WhenProfessorHasNoAssignedCourses_ShouldReturnEmptyList() {
        when(coursesRepository.findAllAssignedToProfessor("profesor")).thenReturn(List.of());

        List<StudentMetricBreakdownDTO> breakdown = teachingMetricsService.getStudentBreakdown(null, "profesor");

        assertEquals(List.of(), breakdown);
        verifyNoInteractions(enrollmentRepository, courseGradeRepository);
    }

    @Test
    @DisplayName("Debe construir el desglose para una asignatura concreta y consultar su curso")
    void getStudentBreakdown_WhenCourseIdIsConcrete_ShouldMapCourseMetrics() {
        Enrollment enrollment = enrollment(7L, "alumno7", "alumno7@uni.es", 10L, "Arquitectura", 55);

        when(coursesRepository.findAllAssignedToProfessor("profesor"))
                .thenReturn(List.of(course(10L, "Arquitectura")));
        when(enrollmentRepository.findActiveStudentEnrollmentsByCourseIds(List.of(10L)))
                .thenReturn(List.of(enrollment));
        when(userService.calculateCurrentProgress(enrollment)).thenReturn(55);
        when(courseGradeRepository.getIndividualStudentAverageScore(10L, 7L)).thenReturn(9.1);

        List<StudentMetricBreakdownDTO> breakdown = teachingMetricsService.getStudentBreakdown(10L, "profesor");

        assertEquals(1, breakdown.size());
        assertEquals(7L, breakdown.get(0).userId());
        assertEquals("alumno7@uni.es", breakdown.get(0).email());
        assertEquals(10L, breakdown.get(0).courseId());
        assertEquals(55, breakdown.get(0).progressPercentage());
        assertEquals(9.1, breakdown.get(0).averageGrade());
    }
}