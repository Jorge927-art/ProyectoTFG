package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.StudentMetricBreakdownDTO;
import com.cursosonline.backend.dto.TeachingMetricsSummaryDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.AcademicEvaluationRepository;
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
    private AcademicEvaluationRepository academicEvaluationRepository;

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
        when(coursesRepository.findAllAssignedToProfessor("profesor"))
                .thenReturn(Arrays.asList(course(10L, "Arquitectura"), null, course(20L, "Bases")));
        when(enrollmentRepository.getAverageProgressByCourseIds(List.of(10L, 20L))).thenReturn(80.0);
        when(enrollmentRepository.getCompletionRateByCourseIds(List.of(10L, 20L))).thenReturn(50.0);
        when(courseGradeRepository.getGroupAverageScoreByCourseIds(List.of(10L, 20L))).thenReturn(null);
        when(academicEvaluationRepository.getAverageCourseScoreByCourseIds(List.of(10L, 20L))).thenReturn(4.3);
        when(academicEvaluationRepository.getAverageInstructorScoreByCourseIds(List.of(10L, 20L))).thenReturn(4.8);

        TeachingMetricsSummaryDTO summary = teachingMetricsService.getSummary(null, "profesor");

        assertNull(summary.courseId());
        assertEquals(80.0, summary.collectiveProgress());
        assertEquals(50.0, summary.completionRate());
        assertEquals(0.0, summary.averageGrade());
        assertEquals(4.3, summary.courseRating());
        assertEquals(4.8, summary.instructorRating());
        verify(enrollmentRepository).getAverageProgressByCourseIds(List.of(10L, 20L));
    }

    @Test
    @DisplayName("Debe rechazar el acceso cuando el profesor solicita un curso fuera de su ámbito")
    void getSummary_WhenCourseDoesNotBelongToProfessor_ShouldThrowAccessDenied() {
        when(coursesRepository.findAllAssignedToProfessor("profesor"))
                .thenReturn(List.of(course(10L, "Arquitectura")));

        assertThrows(AccessDeniedException.class, () -> teachingMetricsService.getSummary(99L, "profesor"));
        verifyNoInteractions(enrollmentRepository, courseGradeRepository, academicEvaluationRepository);
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
        assertEquals(0.0, summary.courseRating());
        assertEquals(0.0, summary.instructorRating());
        verifyNoInteractions(enrollmentRepository, courseGradeRepository, academicEvaluationRepository);
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
        when(courseGradeRepository.getIndividualStudentAverageScore(10L, 1L)).thenReturn(8.7);
        when(courseGradeRepository.getIndividualStudentAverageScore(20L, 2L)).thenReturn(null);

        List<StudentMetricBreakdownDTO> breakdown = teachingMetricsService.getStudentBreakdown(null, "profesor");

        assertEquals(2, breakdown.size());
        assertEquals("alumno1", breakdown.get(0).username());
        assertEquals("Arquitectura", breakdown.get(0).courseTitle());
        assertEquals(8.7, breakdown.get(0).averageGrade());
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
        verifyNoInteractions(enrollmentRepository, courseGradeRepository, academicEvaluationRepository);
    }
}