package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.AcademicEvaluation;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test-ci")
@Transactional
@DisplayName("Suite de Pruebas de Persistencia para AcademicEvaluationRepository")
class AcademicEvaluationRepositoryTest {

    @Autowired
    private AcademicEvaluationRepository academicEvaluationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CoursesRepository coursesRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    private Users activeStudent;
    private Users secondaryStudent;
    private Users inactiveStudent;
    private Courses courseAlpha;
    private Courses courseBeta;

    private void seedData() {
        activeStudent = saveUser("ana_evaluaciones", true);
        secondaryStudent = saveUser("bruno_evaluaciones", true);
        inactiveStudent = saveUser("carlos_evaluaciones", false);

        courseAlpha = saveCourse("Arquitectura de Software", "Brandon Krakowsky");
        courseBeta = saveCourse("Programacion Avanzada", "Brandon Krakowsky");

        saveEnrollment(activeStudent, courseAlpha);
        saveEnrollment(secondaryStudent, courseAlpha);
        saveEnrollment(inactiveStudent, courseAlpha);
        saveEnrollment(activeStudent, courseBeta);

        saveEvaluation(activeStudent, courseAlpha, 5, 4);
        saveEvaluation(secondaryStudent, courseAlpha, 3, 5);
        saveEvaluation(inactiveStudent, courseAlpha, 1, 1);
        saveEvaluation(activeStudent, courseBeta, 4, 4);
    }

    private Users saveUser(String username, boolean enabled) {
        Users user = new Users();
        user.setUsername(username);
        user.setPassword("secret-pass");
        user.setRole(Role.STUDENT);
        user.setEmail(username + "@uni.es");
        user.setEnabled(enabled);
        return userRepository.saveAndFlush(user);
    }

    private Courses saveCourse(String title, String instructors) {
        Courses course = new Courses();
        course.setTitle(title);
        course.setCategory("Ingenieria");
        course.setInstructors(instructors);
        return coursesRepository.saveAndFlush(course);
    }

    private Enrollment saveEnrollment(Users user, Courses course) {
        Enrollment enrollment = new Enrollment();
        enrollment.setUser(user);
        enrollment.setCourse(course);
        enrollment.setEnrolled_at(LocalDateTime.now().minusDays(7));
        enrollment.setStarted_at(LocalDateTime.now().minusDays(6));
        enrollment.setStatus("EN_PROGRESO");
        enrollment.setProgress_percentage(80);
        return enrollmentRepository.saveAndFlush(enrollment);
    }

    private AcademicEvaluation saveEvaluation(Users user, Courses course, int courseScore, int instructorScore) {
        AcademicEvaluation evaluation = new AcademicEvaluation();
        evaluation.setUser(user);
        evaluation.setCourse(course);
        evaluation.setCourse_score(courseScore);
        evaluation.setInstructor_score(instructorScore);
        evaluation.setCourseComment("Buen curso");
        evaluation.setInstructorComment("Buen docente");
        evaluation.setEvaluation_date(LocalDateTime.now());
        return academicEvaluationRepository.saveAndFlush(evaluation);
    }

    @Test
    @DisplayName("Debe calcular la media de la asignatura incluyendo todas las valoraciones persistidas")
    void getAverageCourseScore_ShouldReturnCorrectAverage() {
        seedData();

        Double score = academicEvaluationRepository.getAverageCourseScore(courseAlpha.getCourse_id());

        assertNotNull(score);
        assertEquals(3.0, score, 0.01);
    }

    @Test
    @DisplayName("Debe calcular la media del docente a partir del nombre exacto del instructor")
    void getAverageInstructorScore_ShouldReturnCorrectAverage() {
        seedData();

        Double score = academicEvaluationRepository.getAverageInstructorScore("Brandon Krakowsky");

        assertNotNull(score);
        assertEquals(3.5, score, 0.01);
    }

    @Test
    @DisplayName("Debe confirmar si el alumno ya emitió una evaluación para el curso")
    void existsByUserUsernameAndCourseCourseId_ShouldReturnTrueIfExists() {
        seedData();

        boolean exists = academicEvaluationRepository.existsByUserUsernameAndCourseCourseId(
                activeStudent.getUsername(), courseBeta.getCourse_id());

        assertTrue(exists);
    }

    @Test
    @DisplayName("Debe calcular la media del grupo filtrando alumnos desactivados")
    void getGroupAveragePerformance_ShouldReturnCorrectAverage() {
        seedData();

        Double score = academicEvaluationRepository.getGroupAveragePerformance(courseAlpha.getCourse_id());

        assertNotNull(score);
        assertEquals(4.0, score, 0.01);
    }

    @Test
    @DisplayName("Debe recuperar el rendimiento individual de un alumno en una asignatura")
    void getIndividualStudentPerformance_ShouldReturnCorrectValue() {
        seedData();

        Double score = academicEvaluationRepository.getIndividualStudentPerformance(
                courseAlpha.getCourse_id(), activeStudent.getUser_id());

        assertNotNull(score);
        assertEquals(5.0, score, 0.01);
    }

    @Test
    @DisplayName("Debe calcular las medias agregadas para varias asignaturas del panel docente")
    void aggregateMetrics_ShouldReturnCorrectValues() {
        seedData();

        Double courseScore = academicEvaluationRepository.getAverageCourseScoreByCourseIds(
                List.of(courseAlpha.getCourse_id(), courseBeta.getCourse_id()));
        Double instructorScore = academicEvaluationRepository.getAverageInstructorScoreByCourseIds(
                List.of(courseAlpha.getCourse_id(), courseBeta.getCourse_id()));

        assertNotNull(courseScore);
        assertNotNull(instructorScore);
        assertEquals(3.25, courseScore, 0.01);
        assertEquals(3.5, instructorScore, 0.01);
    }
}
