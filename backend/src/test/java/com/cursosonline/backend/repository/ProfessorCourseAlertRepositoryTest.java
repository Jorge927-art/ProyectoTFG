package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.ProfessorAlertStatus;
import com.cursosonline.backend.entities.ProfessorAlertType;
import com.cursosonline.backend.entities.ProfessorCourseAlert;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test-ci")
@Transactional
@DisplayName("Suite de persistencia para alertas del profesor")
class ProfessorCourseAlertRepositoryTest {

    @Autowired
    private ProfessorCourseAlertRepository alertRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CoursesRepository coursesRepository;

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @Test
    @DisplayName("findByEnrollmentAndTypeAndStatuses debe aplicar el IN de estados y ordenar checkpoints")
    void findByEnrollmentAndTypeAndStatuses_ShouldFilterCollectionAndOrderResults() {
        TestContext context = context();
        saveAlert(context, ProfessorAlertType.MATERIAL_DISPATCH, ProfessorAlertStatus.RESOLVED, 3, false);
        ProfessorCourseAlert viewed = saveAlert(context, ProfessorAlertType.MATERIAL_DISPATCH,
                ProfessorAlertStatus.VIEWED, 2, false);
        ProfessorCourseAlert pending = saveAlert(context, ProfessorAlertType.MATERIAL_DISPATCH,
                ProfessorAlertStatus.PENDING, 1, false);
        saveAlert(context, ProfessorAlertType.FINAL_EXAM, ProfessorAlertStatus.PENDING, 0, false);

        List<ProfessorCourseAlert> result = alertRepository.findByEnrollmentAndTypeAndStatuses(
                context.enrollment.getEnrollmentid(),
                ProfessorAlertType.MATERIAL_DISPATCH,
                List.of(ProfessorAlertStatus.PENDING, ProfessorAlertStatus.VIEWED));

        assertEquals(List.of(pending.getAlertId(), viewed.getAlertId()),
                result.stream().map(alert -> alert.getAlertId()).toList());
        assertTrue(result.stream().allMatch(alert -> alert.getAlertType() == ProfessorAlertType.MATERIAL_DISPATCH));
    }

    @Test
    @DisplayName("countByProfessor_UsernameAndBellDismissedFalse debe contar solo alertas visibles del profesor")
    void countByProfessorUsernameAndBellDismissedFalse_ShouldExcludeDismissedAndOtherProfessors() {
        TestContext context = context();
        Users otherProfessor = saveUser("otro_profesor", Role.PROFESSOR);
        saveAlert(context, ProfessorAlertType.MATERIAL_DISPATCH, ProfessorAlertStatus.PENDING, 1, false);
        saveAlert(context, ProfessorAlertType.FINAL_EXAM, ProfessorAlertStatus.VIEWED, 2, false);
        saveAlert(context, ProfessorAlertType.INITIAL_CONTACT, ProfessorAlertStatus.RESOLVED, 3, true);
        saveAlert(context, ProfessorAlertType.MATERIAL_DISPATCH, ProfessorAlertStatus.PENDING, 4, false,
                otherProfessor);

        assertEquals(2,
                alertRepository.countByProfessor_UsernameAndBellDismissedFalse(context.professor.getUsername()));
        assertEquals(1, alertRepository.countByProfessor_UsernameAndBellDismissedFalse(otherProfessor.getUsername()));
    }

    @Test
    @DisplayName("existsByEnrollment_EnrollmentidAndAlertTypeAndCheckpointIndex debe exigir las tres condiciones")
    void existsByEnrollmentTypeAndCheckpoint_ShouldRequireAllThreeFields() {
        TestContext context = context();
        TestContext otherContext = context("otro_alumno", "otro_curso");
        saveAlert(context, ProfessorAlertType.MATERIAL_DISPATCH, ProfessorAlertStatus.PENDING, 2, false);

        assertTrue(alertRepository.existsByEnrollment_EnrollmentidAndAlertTypeAndCheckpointIndex(
                context.enrollment.getEnrollmentid(), ProfessorAlertType.MATERIAL_DISPATCH, 2));
        assertFalse(alertRepository.existsByEnrollment_EnrollmentidAndAlertTypeAndCheckpointIndex(
                context.enrollment.getEnrollmentid(), ProfessorAlertType.MATERIAL_DISPATCH, 3));
        assertFalse(alertRepository.existsByEnrollment_EnrollmentidAndAlertTypeAndCheckpointIndex(
                context.enrollment.getEnrollmentid(), ProfessorAlertType.FINAL_EXAM, 2));
        assertFalse(alertRepository.existsByEnrollment_EnrollmentidAndAlertTypeAndCheckpointIndex(
                otherContext.enrollment.getEnrollmentid(), ProfessorAlertType.MATERIAL_DISPATCH, 2));
    }

    private TestContext context() {
        return context("alumno_alertas", "curso_alertas");
    }

    private TestContext context(String studentUsername, String courseTitle) {
        Users professor = saveUser("profesor_" + studentUsername, Role.PROFESSOR);
        Users student = saveUser(studentUsername, Role.STUDENT);
        Courses course = saveCourse(courseTitle);
        Enrollment enrollment = new Enrollment();
        enrollment.setUser(student);
        enrollment.setCourse(course);
        enrollment.setStatus("EN_PROGRESO");
        enrollment = enrollmentRepository.saveAndFlush(enrollment);
        return new TestContext(professor, student, course, enrollment);
    }

    private Users saveUser(String username, Role role) {
        Users user = new Users();
        user.setUsername(username);
        user.setPassword("secret-pass");
        user.setRole(role);
        user.setEmail(username + "@uni.es");
        user.setEnabled(true);
        return userRepository.saveAndFlush(user);
    }

    private Courses saveCourse(String title) {
        Courses course = new Courses();
        course.setTitle(title);
        course.setCategory("Ingenieria");
        course.setSite("COLE");
        course.setEverUsed(false);
        return coursesRepository.saveAndFlush(course);
    }

    private ProfessorCourseAlert saveAlert(
            TestContext context,
            ProfessorAlertType type,
            ProfessorAlertStatus status,
            int checkpointIndex,
            boolean dismissed) {
        return saveAlert(context, type, status, checkpointIndex, dismissed, context.professor);
    }

    private ProfessorCourseAlert saveAlert(
            TestContext context,
            ProfessorAlertType type,
            ProfessorAlertStatus status,
            int checkpointIndex,
            boolean dismissed,
            Users professor) {
        ProfessorCourseAlert alert = new ProfessorCourseAlert();
        alert.setProfessor(professor);
        alert.setStudent(context.student);
        alert.setCourse(context.course);
        alert.setEnrollment(context.enrollment);
        alert.setAlertType(type);
        alert.setStatus(status);
        alert.setCheckpointIndex(checkpointIndex);
        alert.setCheckpointPercent(BigDecimal.valueOf(checkpointIndex * 10L));
        alert.setBellDismissed(dismissed);
        alert.setTitle("Alerta " + type);
        alert.setMessage("Mensaje de prueba");
        return alertRepository.saveAndFlush(alert);
    }

    private record TestContext(Users professor, Users student, Courses course, Enrollment enrollment) {
    }
}