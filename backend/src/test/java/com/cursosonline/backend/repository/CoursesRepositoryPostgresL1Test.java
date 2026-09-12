package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.AcademicEvaluation;
import com.cursosonline.backend.entities.CourseGrade;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@ActiveProfiles("test-ci")
@Transactional
@Tag("Layer1")
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("Suite de Persistencia PostgreSQL real para consultas nativas de cursos")
class CoursesRepositoryPostgresL1Test {

    @Container
    @SuppressWarnings("resource")
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("cursosonline_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void overrideDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.sql.init.platform", () -> "postgresql");
    }

    @Autowired
    private CoursesRepository coursesRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private CourseGradeRepository courseGradeRepository;

    @Autowired
    private AcademicEvaluationRepository academicEvaluationRepository;

    @Test
    @DisplayName("getCourseAnalyticalStatsNative debe ejecutarse correctamente sobre PostgreSQL real")
    void getCourseAnalyticalStatsNative_ShouldReturnExpectedAggregatesOnPostgreSql() {
        Courses course = saveCourse("Analitica SQL", "Ingenieria", "COLE");
        Users firstStudent = saveStudent("alumno_pg_1", "alumno_pg_1@uni.es");
        Users secondStudent = saveStudent("alumno_pg_2", "alumno_pg_2@uni.es");

        Enrollment firstEnrollment = saveEnrollment(firstStudent, course);
        Enrollment secondEnrollment = saveEnrollment(secondStudent, course);

        saveGrade(firstEnrollment, "Proyecto 1", "8.0");
        saveGrade(secondEnrollment, "Proyecto 2", "6.0");

        saveEvaluation(firstStudent, course, 4, 3);
        saveEvaluation(secondStudent, course, 5, 5);

        Map<String, Object> row = coursesRepository.getCourseAnalyticalStatsNative(course.getCourse_id());

        assertNotNull(row);
        assertEquals(course.getCourse_id(), ((Number) row.get("courseId")).longValue());
        assertEquals(7.0, ((Number) row.get("averageGrade")).doubleValue(), 0.01);
        assertEquals(2L, ((Number) row.get("localEnrollments")).longValue());
        assertEquals(4.5, ((Number) row.get("communityRating")).doubleValue(), 0.01);
        assertEquals(4.0, ((Number) row.get("instructorRating")).doubleValue(), 0.01);
        assertEquals("COLE", row.get("platform"));
        assertEquals("Ingenieria", row.get("category"));
    }

    private Courses saveCourse(String title, String category, String site) {
        Courses course = new Courses();
        course.setTitle(title);
        course.setCategory(category);
        course.setSite(site);
        course.setInstructors("profesor_pg");
        course.setEverUsed(false);
        return coursesRepository.saveAndFlush(course);
    }

    private Users saveStudent(String username, String email) {
        Users student = new Users();
        student.setUsername(username);
        student.setPassword("secret-pass");
        student.setRole(Role.STUDENT);
        student.setEmail(email);
        student.setEnabled(true);
        return userRepository.saveAndFlush(student);
    }

    private Enrollment saveEnrollment(Users student, Courses course) {
        Enrollment enrollment = new Enrollment();
        enrollment.setUser(student);
        enrollment.setCourse(course);
        enrollment.setStatus("EN_PROGRESO");
        enrollment.setEnrolled_at(LocalDateTime.now().minusDays(3));
        enrollment.setStarted_at(LocalDateTime.now().minusDays(2));
        enrollment.setProgress_percentage(50);
        return enrollmentRepository.saveAndFlush(enrollment);
    }

    private void saveGrade(Enrollment enrollment, String title, String score) {
        CourseGrade grade = new CourseGrade();
        grade.setEnrollment(enrollment);
        grade.setTitle(title);
        grade.setScore(new BigDecimal(score));
        grade.setComments("feedback");
        courseGradeRepository.saveAndFlush(grade);
    }

    private void saveEvaluation(Users student, Courses course, int courseScore, int instructorScore) {
        AcademicEvaluation evaluation = new AcademicEvaluation();
        evaluation.setUser(student);
        evaluation.setCourse(course);
        evaluation.setCourse_score(courseScore);
        evaluation.setInstructor_score(instructorScore);
        evaluation.setCourseComment("bien");
        evaluation.setInstructorComment("correcto");
        evaluation.setEvaluation_date(LocalDateTime.now());
        academicEvaluationRepository.saveAndFlush(evaluation);
    }
}