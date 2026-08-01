package com.cursosonline.backend.services;

import com.cursosonline.backend.entities.CourseGrade;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.CourseGradeRepository;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = "spring.task.scheduling.enabled=false")
@ActiveProfiles("test-ci")
@Transactional
@DisplayName("Integración - Auto-calificación de cursos ficticios")
class FictitiousCourseGradeGenerationServiceIntegrationTest {

    @Autowired
    private FictitiousCourseGradeGenerationService generationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CoursesRepository coursesRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private CourseGradeRepository courseGradeRepository;

    @Test
    @DisplayName("Debe persistir Examen final y Nota Final Asignatura en curso ficticio al 95% y no duplicar en re-ejecución")
    void shouldPersistExamAndFinalForFictitiousCourseAndRemainIdempotent() {
        // Neutralizamos profesores preexistentes en la transacción del test para
        // validar de forma determinista el camino positivo de curso ficticio.
        List<Users> existingProfessors = userRepository.findByRole(Role.PROFESSOR);
        for (Users professor : existingProfessors) {
            professor.setRole(Role.STUDENT);
        }
        userRepository.saveAllAndFlush(existingProfessors);

        Users student = saveStudent("alumno_integracion_1");
        Courses fictitiousCourse = saveCourse("Curso Ficticio Integración", "qzxy_autogen_instructor_9981", null, 1.0f);
        Enrollment enrollment = saveEnrollment(
                student,
                fictitiousCourse,
                LocalDateTime.now(Clock.systemUTC()).minusHours(2));

        generationService.generateGradesForEligibleEnrollments();

        List<CourseGrade> firstRunGrades = courseGradeRepository
                .findAllByEnrollmentIdOrderByGradeIdAsc(enrollment.getEnrollmentid());

        assertEquals(2, firstRunGrades.size());
        assertEquals("Examen final", firstRunGrades.get(0).getTitle());
        assertEquals("Nota Final Asignatura", firstRunGrades.get(1).getTitle());
        assertNotNull(firstRunGrades.get(0).getScore());
        assertNotNull(firstRunGrades.get(1).getScore());
        assertTrue(firstRunGrades.get(0).getScore().doubleValue() >= 0.0
                && firstRunGrades.get(0).getScore().doubleValue() <= 10.0);
        assertTrue(firstRunGrades.get(1).getScore().doubleValue() >= 0.0
                && firstRunGrades.get(1).getScore().doubleValue() <= 10.0);

        generationService.generateGradesForEligibleEnrollments();

        List<CourseGrade> secondRunGrades = courseGradeRepository
                .findAllByEnrollmentIdOrderByGradeIdAsc(enrollment.getEnrollmentid());
        assertEquals(2, secondRunGrades.size());
    }

    @Test
    @DisplayName("No debe generar notas si el instructor textual coincide con un profesor registrado")
    void shouldSkipGenerationWhenTextInstructorMatchesRegisteredProfessor() {
        Users professor = saveProfessor("profesor_integracion");
        Users student = saveStudent("alumno_integracion_2");

        Courses courseOwnedByRegisteredProfessor = saveCourse(
                "Curso con Profesor Registrado",
                professor.getUsername(),
                null,
                1.0f);

        Enrollment enrollment = saveEnrollment(student, courseOwnedByRegisteredProfessor,
                LocalDateTime.now(Clock.systemUTC()).minusHours(2));

        generationService.generateGradesForEligibleEnrollments();

        List<CourseGrade> grades = courseGradeRepository
                .findAllByEnrollmentIdOrderByGradeIdAsc(enrollment.getEnrollmentid());

        assertEquals(0, grades.size());
    }

    private Users saveStudent(String username) {
        Users user = new Users();
        user.setUsername(username);
        user.setPassword("secret-pass");
        user.setRole(Role.STUDENT);
        user.setEmail(username + "@mail.es");
        user.setEnabled(true);
        return userRepository.saveAndFlush(user);
    }

    private Users saveProfessor(String username) {
        Users user = new Users();
        user.setUsername(username);
        user.setPassword("secret-pass");
        user.setRole(Role.PROFESSOR);
        user.setEmail(username + "@mail.es");
        user.setEnabled(true);
        return userRepository.saveAndFlush(user);
    }

    private Courses saveCourse(String title, String instructors, Users assignedUser, Float durationHours) {
        Courses course = new Courses();
        course.setTitle(title);
        course.setCategory("General");
        course.setInstructors(instructors);
        course.setAssignedUser(assignedUser);
        course.setDuration(durationHours);
        return coursesRepository.saveAndFlush(course);
    }

    private Enrollment saveEnrollment(Users student, Courses course, LocalDateTime startedAt) {
        Enrollment enrollment = new Enrollment();
        enrollment.setUser(student);
        enrollment.setCourse(course);
        enrollment.setEnrolled_at(LocalDateTime.now().minusDays(1));
        enrollment.setStarted_at(startedAt);
        enrollment.setStatus("EN_PROGRESO");
        enrollment.setProgress_percentage(0);
        return enrollmentRepository.saveAndFlush(enrollment);
    }
}