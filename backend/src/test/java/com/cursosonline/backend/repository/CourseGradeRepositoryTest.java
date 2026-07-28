package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.CourseGrade;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Clase de prueba para el repositorio CourseGradeRepository. Contiene pruebas
 * correcto funcionamiento de los métodos de CourseGradeRepository.
 * CourseGradeRepositoryTest
 */
@SpringBootTest
@ActiveProfiles("test-ci")
@Transactional
@DisplayName("Suite de Pruebas de Persistencia para CourseGradeRepository")
class CourseGradeRepositoryTest {

    @Autowired
    private CourseGradeRepository courseGradeRepository;

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
        activeStudent = saveUser("ana_notas", true);
        secondaryStudent = saveUser("bruno_notas", true);
        inactiveStudent = saveUser("carlos_notas", false);

        courseAlpha = saveCourse("Arquitectura de Software");
        courseBeta = saveCourse("Programacion Avanzada");

        Enrollment alphaActiveEnrollment = saveEnrollment(activeStudent, courseAlpha);
        Enrollment alphaSecondaryEnrollment = saveEnrollment(secondaryStudent, courseAlpha);
        Enrollment alphaInactiveEnrollment = saveEnrollment(inactiveStudent, courseAlpha);
        Enrollment betaActiveEnrollment = saveEnrollment(activeStudent, courseBeta);

        saveGrade(alphaActiveEnrollment, "Examen Parcial", "8.0");
        saveGrade(alphaActiveEnrollment, "Proyecto Final", "9.0");
        saveGrade(alphaSecondaryEnrollment, "Entrega", "6.0");
        saveGrade(alphaInactiveEnrollment, "Entrega", "10.0");
        saveGrade(betaActiveEnrollment, "Proyecto Final", "10.0");
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

    private Courses saveCourse(String title) {
        Courses course = new Courses();
        course.setTitle(title);
        course.setCategory("Ingenieria");
        course.setInstructors("Brandon Krakowsky");
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

    private CourseGrade saveGrade(Enrollment enrollment, String title, String score) {
        CourseGrade grade = new CourseGrade();
        grade.setEnrollment(enrollment);
        grade.setTitle(title);
        grade.setScore(new BigDecimal(score));
        grade.setFeedback("feedback");
        return courseGradeRepository.saveAndFlush(grade);
    }

    @Test
    @DisplayName("Debe calcular la media del grupo excluyendo matrículas de usuarios desactivados")
    void getGroupAverageScore_ShouldReturnCorrectAverage() {
        seedData();

        Double score = courseGradeRepository.getGroupAverageScore(courseAlpha.getCourse_id());

        assertNotNull(score);
        assertEquals(7.67, score, 0.01);
    }

    @Test
    @DisplayName("Debe recuperar la nota media individual de un alumno en una asignatura")
    void getIndividualStudentAverageScore_ShouldReturnCorrectValue() {
        seedData();

        Double score = courseGradeRepository.getIndividualStudentAverageScore(
                courseAlpha.getCourse_id(), activeStudent.getUser_id());

        assertNotNull(score);
        assertEquals(8.5, score, 0.01);
    }

    @Test
    @DisplayName("Debe calcular la media global de notas para un conjunto de asignaturas")
    void getGroupAverageScoreByCourseIds_ShouldReturnCorrectAverage() {
        seedData();

        Double score = courseGradeRepository.getGroupAverageScoreByCourseIds(
                List.of(courseAlpha.getCourse_id(), courseBeta.getCourse_id()));

        assertNotNull(score);
        assertEquals(8.25, score, 0.01);
    }

    @Test
    @DisplayName("[PANEL ESTADÍSTICO ADMIN] countStudentsWithPassingGradeByCourseId debe contar alumnos distintos con nota > 5")
    void countStudentsWithPassingGradeByCourseId_ShouldCountDistinctStudentsAboveThreshold() {
        seedData();
        // courseAlpha: activeStudent (8.0, 9.0), secondaryStudent (6.0),
        // inactiveStudent (10.0) -> los 3 aprueban

        long passingAlpha = courseGradeRepository.countStudentsWithPassingGradeByCourseId(courseAlpha.getCourse_id());
        long passingBeta = courseGradeRepository.countStudentsWithPassingGradeByCourseId(courseBeta.getCourse_id());

        assertEquals(3, passingAlpha);
        assertEquals(1, passingBeta);
    }

    @Test
    @DisplayName("[PANEL ESTADÍSTICO ADMIN] countStudentsWithPassingGradeByCourseId no debe contar notas <= 5")
    void countStudentsWithPassingGradeByCourseId_ShouldExcludeFailingGrades() {
        Users reprobado = saveUser("dario_notas", true);
        Courses cursoReprobado = saveCourse("Curso Con Suspenso");
        Enrollment enrollment = saveEnrollment(reprobado, cursoReprobado);
        saveGrade(enrollment, "Examen Final", "4.5");

        long passing = courseGradeRepository.countStudentsWithPassingGradeByCourseId(cursoReprobado.getCourse_id());

        assertEquals(0, passing);
    }
}
