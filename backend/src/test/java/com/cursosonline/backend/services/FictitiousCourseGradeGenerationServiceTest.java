package com.cursosonline.backend.services;

import com.cursosonline.backend.entities.CourseGrade;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.CourseGradeRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FictitiousCourseGradeGenerationServiceTest {

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private CourseGradeRepository courseGradeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private FictitiousCourseGradeGenerationService service;

    @Test
    @DisplayName("Debe generar examen y nota final cuando el curso es ficticio y el progreso alcanza 95%")
    void generateGradesForEligibleEnrollments_shouldCreateExamAndFinalAt95Percent() {
        Enrollment enrollment = buildEnrollment(200L, "legacy.instructor", null);

        when(enrollmentRepository.findActiveStudentEnrollmentsForFictitiousCourses()).thenReturn(List.of(enrollment));
        when(userRepository.findByRole(Role.PROFESSOR)).thenReturn(List.of());
        when(userService.calculateCurrentProgress(enrollment)).thenReturn(95);
        when(courseGradeRepository.existsByEnrollment_EnrollmentidAndTitleIgnoreCase(200L, "Examen final"))
                .thenReturn(false);
        when(courseGradeRepository.existsByEnrollment_EnrollmentidAndTitleIgnoreCase(200L, "Nota Final Asignatura"))
                .thenReturn(false);

        service.generateGradesForEligibleEnrollments();

        ArgumentCaptor<CourseGrade> captor = ArgumentCaptor.forClass(CourseGrade.class);
        verify(courseGradeRepository, times(2)).save(captor.capture());

        List<CourseGrade> savedGrades = captor.getAllValues();
        assertEquals(2, savedGrades.size());
        assertEquals("Examen final", savedGrades.get(0).getTitle());
        assertEquals("Nota Final Asignatura", savedGrades.get(1).getTitle());

        BigDecimal examScore = savedGrades.get(0).getScore();
        BigDecimal finalScore = savedGrades.get(1).getScore();

        assertNotNull(examScore);
        assertNotNull(finalScore);
        assertTrue(examScore.doubleValue() >= 0.0 && examScore.doubleValue() <= 10.0);
        assertTrue(finalScore.doubleValue() >= 0.0 && finalScore.doubleValue() <= 10.0);
    }

    @Test
    @DisplayName("No debe generar notas cuando el progreso es inferior al 95%")
    void generateGradesForEligibleEnrollments_shouldSkipWhenProgressIsBelowThreshold() {
        Enrollment enrollment = buildEnrollment(201L, "legacy.instructor", null);

        when(enrollmentRepository.findActiveStudentEnrollmentsForFictitiousCourses()).thenReturn(List.of(enrollment));
        when(userRepository.findByRole(Role.PROFESSOR)).thenReturn(List.of());
        when(userService.calculateCurrentProgress(enrollment)).thenReturn(94);

        service.generateGradesForEligibleEnrollments();

        verify(courseGradeRepository, never()).save(org.mockito.ArgumentMatchers.any());
        verify(courseGradeRepository, never()).existsByEnrollment_EnrollmentidAndTitleIgnoreCase(
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    @DisplayName("Si ya existe examen y falta nota final, solo debe generar la nota final")
    void generateGradesForEligibleEnrollments_shouldCreateOnlyFinalWhenExamAlreadyExists() {
        Enrollment enrollment = buildEnrollment(202L, "legacy.instructor", null);

        when(enrollmentRepository.findActiveStudentEnrollmentsForFictitiousCourses()).thenReturn(List.of(enrollment));
        when(userRepository.findByRole(Role.PROFESSOR)).thenReturn(List.of());
        when(userService.calculateCurrentProgress(enrollment)).thenReturn(95);
        when(courseGradeRepository.existsByEnrollment_EnrollmentidAndTitleIgnoreCase(202L, "Examen final"))
                .thenReturn(true);
        when(courseGradeRepository.existsByEnrollment_EnrollmentidAndTitleIgnoreCase(202L, "Nota Final Asignatura"))
                .thenReturn(false);
        when(courseGradeRepository.findFirstByEnrollment_EnrollmentidAndTitleIgnoreCase(202L, "Examen final"))
                .thenReturn(Optional.of(buildGrade("Examen final", "7.3")));

        service.generateGradesForEligibleEnrollments();

        ArgumentCaptor<CourseGrade> captor = ArgumentCaptor.forClass(CourseGrade.class);
        verify(courseGradeRepository, times(1)).save(captor.capture());
        assertEquals("Nota Final Asignatura", captor.getValue().getTitle());
    }

    @Test
    @DisplayName("No debe generar notas en cursos con profesor asignado por relación")
    void generateGradesForEligibleEnrollments_shouldSkipWhenCourseHasAssignedUser() {
        Users assignedProfessor = new Users();
        assignedProfessor.setUser_id(77L);
        assignedProfessor.setUsername("profesor.asignado");
        assignedProfessor.setRole(Role.PROFESSOR);
        assignedProfessor.setEnabled(true);

        Enrollment enrollment = buildEnrollment(203L, "texto.legacy", assignedProfessor);

        when(enrollmentRepository.findActiveStudentEnrollmentsForFictitiousCourses()).thenReturn(List.of(enrollment));

        service.generateGradesForEligibleEnrollments();

        verify(userRepository, never()).findByRole(Role.PROFESSOR);
        verify(userService, never()).calculateCurrentProgress(org.mockito.ArgumentMatchers.any());
        verify(courseGradeRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("No debe generar notas si el profesor textual coincide con un profesor registrado")
    void generateGradesForEligibleEnrollments_shouldSkipCoursesOwnedByRegisteredProfessor() {
        Users professor = new Users();
        professor.setUser_id(1L);
        professor.setUsername("profesor.real");
        professor.setEmail("profesor.real@curso.es");
        professor.setRole(Role.PROFESSOR);
        professor.setEnabled(true);

        Enrollment enrollment = buildEnrollment(100L, "profesor.real", null);

        when(enrollmentRepository.findActiveStudentEnrollmentsForFictitiousCourses()).thenReturn(List.of(enrollment));
        when(userRepository.findByRole(Role.PROFESSOR)).thenReturn(List.of(professor));

        service.generateGradesForEligibleEnrollments();

        verify(courseGradeRepository, never()).save(org.mockito.ArgumentMatchers.any());
        verify(courseGradeRepository, never()).existsByEnrollment_EnrollmentidAndTitleIgnoreCase(
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString());
    }

    private Enrollment buildEnrollment(Long enrollmentId, String instructors, Users assignedUser) {
        Courses course = new Courses();
        course.setCourse_id(10L);
        course.setTitle("Curso Legacy");
        course.setInstructors(instructors);
        course.setAssignedUser(assignedUser);

        Users student = new Users();
        student.setUser_id(2L);
        student.setUsername("alumno.demo");
        student.setEmail("alumno.demo@curso.es");
        student.setRole(Role.STUDENT);
        student.setEnabled(true);

        Enrollment enrollment = new Enrollment();
        enrollment.setEnrollmentid(enrollmentId);
        enrollment.setUser(student);
        enrollment.setCourse(course);
        enrollment.setStarted_at(LocalDateTime.of(2026, 7, 1, 0, 0));
        enrollment.setStatus("EN_PROGRESO");
        enrollment.setProgress_percentage(95);
        return enrollment;
    }

    private CourseGrade buildGrade(String title, String score) {
        CourseGrade grade = new CourseGrade();
        grade.setTitle(title);
        grade.setScore(new BigDecimal(score));
        return grade;
    }
}