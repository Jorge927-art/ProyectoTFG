package com.cursosonline.backend.repository;

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

/**
 * Clase de prueba para el repositorio EnrollmentRepository. Contiene pruebas
 * unitarias
 * y de integración para verificar el correcto funcionamiento de los métodos de
 * EnrollmentRepository.
 */
@SpringBootTest
@ActiveProfiles("test-ci")
@Transactional
@DisplayName("Suite de Pruebas de Persistencia para EnrollmentRepository")
class EnrollmentRepositoryTest {

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CoursesRepository coursesRepository;

    private Users activeStudent;
    private Users secondaryStudent;
    private Users inactiveStudent;
    private Courses courseAlpha;
    private Courses courseBeta;

    private void seedData() {
        activeStudent = saveUser("ana_docencia", true);
        secondaryStudent = saveUser("bruno_docencia", true);
        inactiveStudent = saveUser("carlos_docencia", false);

        courseAlpha = saveCourse("Arquitectura de Software");
        courseBeta = saveCourse("Programacion Avanzada");

        saveEnrollment(activeStudent, courseAlpha, 80);
        saveEnrollment(activeStudent, courseBeta, 100);
        saveEnrollment(secondaryStudent, courseAlpha, 60);
        saveEnrollment(inactiveStudent, courseAlpha, 40);
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

    private Enrollment saveEnrollment(Users user, Courses course, int progress) {
        Enrollment enrollment = new Enrollment();
        enrollment.setUser(user);
        enrollment.setCourse(course);
        enrollment.setEnrolled_at(LocalDateTime.now().minusDays(7));
        enrollment.setStarted_at(LocalDateTime.now().minusDays(6));
        enrollment.setStatus(progress == 100 ? "COMPLETADO" : "EN_PROGRESO");
        enrollment.setProgress_percentage(progress);
        return enrollmentRepository.saveAndFlush(enrollment);
    }

    @Test
    @DisplayName("Debe recuperar las asignaturas matriculadas de un alumno por su identificador")
    void findEnrolledCourseIdsByUserId_ShouldReturnCourseIds() {
        seedData();

        List<Long> courseIds = enrollmentRepository.findEnrolledCourseIdsByUserId(activeStudent.getUser_id());

        assertEquals(List.of(courseAlpha.getCourse_id(), courseBeta.getCourse_id()), courseIds);
    }

    @Test
    @DisplayName("Debe encontrar una matrícula concreta por usuario y curso")
    void findByUserIdAndCourseId_ShouldReturnExpectedEnrollment() {
        seedData();

        Enrollment found = enrollmentRepository
                .findByUserIdAndCourseId(activeStudent.getUser_id(), courseBeta.getCourse_id())
                .orElseThrow();

        assertEquals(activeStudent.getUser_id(), found.getUser().getUser_id());
        assertEquals(courseBeta.getCourse_id(), found.getCourse().getCourse_id());
        assertEquals(100, found.getProgress_percentage());
    }

    @Test
    @DisplayName("Debe recuperar las matrículas activas de alumnos de un curso excluyendo cuentas desactivadas")
    void findActiveStudentEnrollmentsByCourseId_ShouldFilterDisabledUsers() {
        seedData();

        List<Enrollment> enrollments = enrollmentRepository
                .findActiveStudentEnrollmentsByCourseId(courseAlpha.getCourse_id());

        assertEquals(2, enrollments.size());
        assertEquals("ana_docencia", enrollments.get(0).getUser().getUsername());
        assertEquals("bruno_docencia", enrollments.get(1).getUser().getUsername());
    }

    @Test
    @DisplayName("Debe recuperar y ordenar las matrículas activas de varios cursos para el panel docente")
    void findActiveStudentEnrollmentsByCourseIds_ShouldOrderByCourseAndUsername() {
        seedData();

        List<Enrollment> enrollments = enrollmentRepository.findActiveStudentEnrollmentsByCourseIds(
                List.of(courseAlpha.getCourse_id(), courseBeta.getCourse_id()));

        assertEquals(3, enrollments.size());
        assertEquals(courseAlpha.getTitle(), enrollments.get(0).getCourse().getTitle());
        assertEquals("ana_docencia", enrollments.get(0).getUser().getUsername());
        assertEquals(courseAlpha.getTitle(), enrollments.get(1).getCourse().getTitle());
        assertEquals("bruno_docencia", enrollments.get(1).getUser().getUsername());
        assertEquals(courseBeta.getTitle(), enrollments.get(2).getCourse().getTitle());
    }

    @Test
    @DisplayName("Debe calcular la media de progreso y la tasa de finalización sobre un conjunto de cursos")
    void aggregateMetrics_ShouldReturnExpectedValues() {
        seedData();

        Double averageProgress = enrollmentRepository.getAverageProgressByCourseIds(
                List.of(courseAlpha.getCourse_id(), courseBeta.getCourse_id()));
        Double completionRate = enrollmentRepository.getCompletionRateByCourseIds(
                List.of(courseAlpha.getCourse_id(), courseBeta.getCourse_id()));

        assertNotNull(averageProgress);
        assertNotNull(completionRate);
        assertEquals(80.0, averageProgress, 0.01);
        assertEquals(33.333, completionRate, 0.01);
    }

    @Test
    @DisplayName("Debe recuperar solo las matrículas del alumno autenticado con las asignaturas cargadas")
    void findAllByUserIdWithCourses_ShouldReturnFetchedCourses() {
        seedData();

        List<Enrollment> enrollments = enrollmentRepository.findAllByUserIdWithCourses(activeStudent.getUser_id());

        assertEquals(2, enrollments.size());
        assertEquals(courseAlpha.getTitle(), enrollments.get(0).getCourse().getTitle());
        assertEquals(courseBeta.getTitle(), enrollments.get(1).getCourse().getTitle());
    }

    @Test
    @DisplayName("[PANEL ESTADÍSTICO ADMIN] findAllByCourseId debe recuperar TODAS las matrículas del curso, activas e inactivas, ordenadas por username")
    void findAllByCourseId_ShouldReturnAllEnrollmentsRegardlessOfUserStatus() {
        seedData();

        List<Enrollment> enrollments = enrollmentRepository.findAllByCourseId(courseAlpha.getCourse_id());

        assertEquals(3, enrollments.size(), "courseAlpha tiene 3 matrículas: ana, bruno (activos) y carlos (inactivo)");
        assertEquals("ana_docencia", enrollments.get(0).getUser().getUsername());
        assertEquals("bruno_docencia", enrollments.get(1).getUser().getUsername());
        assertEquals("carlos_docencia", enrollments.get(2).getUser().getUsername());
    }

    @Test
    @DisplayName("[PANEL ESTADÍSTICO ADMIN] findAllByCourseId debe devolver lista vacía si el curso no tiene matrículas")
    void findAllByCourseId_ShouldReturnEmptyList_WhenCourseHasNoEnrollments() {
        Courses cursoVacio = saveCourse("Curso Sin Matriculas");

        List<Enrollment> enrollments = enrollmentRepository.findAllByCourseId(cursoVacio.getCourse_id());

        assertEquals(0, enrollments.size());
    }
}
