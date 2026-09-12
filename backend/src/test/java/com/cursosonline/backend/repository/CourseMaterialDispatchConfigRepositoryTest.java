package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.CourseMaterialDispatchConfig;
import com.cursosonline.backend.entities.Courses;
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
@DisplayName("Suite de persistencia para configuración de avisos de material")
class CourseMaterialDispatchConfigRepositoryTest {

    @Autowired
    private CourseMaterialDispatchConfigRepository configRepository;

    @Autowired
    private CoursesRepository coursesRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("findByCourseId debe recuperar solo la configuración del curso solicitado")
    void findByCourseId_ShouldFilterByCourseRelation() {
        Users professor = saveUser("profesor_config", Role.PROFESSOR);
        Courses courseAlpha = saveCourse("Arquitectura");
        Courses courseBeta = saveCourse("Programación");
        CourseMaterialDispatchConfig expected = saveConfig(courseAlpha, professor, 3);
        saveConfig(courseBeta, professor, 2);

        assertTrue(configRepository.findByCourseId(courseAlpha.getCourse_id()).isPresent());
        assertEquals(expected.getConfigId(),
                configRepository.findByCourseId(courseAlpha.getCourse_id()).get().getConfigId());
        assertTrue(configRepository.findByCourseId(999999L).isEmpty());
    }

    @Test
    @DisplayName("existsByCourseId debe diferenciar cursos configurados y no configurados")
    void existsByCourseId_ShouldReturnTrueOnlyForConfiguredCourse() {
        Users professor = saveUser("profesor_exists", Role.PROFESSOR);
        Courses configured = saveCourse("Curso configurado");
        Courses unconfigured = saveCourse("Curso sin configuración");
        saveConfig(configured, professor, 1);

        assertTrue(configRepository.existsByCourseId(configured.getCourse_id()));
        assertFalse(configRepository.existsByCourseId(unconfigured.getCourse_id()));
        assertFalse(configRepository.existsByCourseId(null));
    }

    @Test
    @DisplayName("findAllByCourse_AssignedUser_IsNotNull debe excluir cursos sin profesor asignado")
    void findAllByCourseAssignedUserIsNotNull_ShouldExcludeUnassignedCourses() {
        Users professor = saveUser("profesor_assigned", Role.PROFESSOR);
        Courses assignedCourse = saveCourse("Curso asignado");
        assignedCourse.setAssignedUser(professor);
        assignedCourse = coursesRepository.saveAndFlush(assignedCourse);
        Courses unassignedCourse = saveCourse("Curso sin profesor");
        saveConfig(assignedCourse, professor, 4);
        saveConfig(unassignedCourse, professor, 2);

        List<CourseMaterialDispatchConfig> result = configRepository.findAllByCourse_AssignedUser_IsNotNull();

        assertEquals(1, result.size());
        assertEquals(assignedCourse.getCourse_id(), result.get(0).getCourse().getCourse_id());
        assertTrue(result.get(0).getCourse().getAssignedUser() != null);
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

    private CourseMaterialDispatchConfig saveConfig(Courses course, Users professor, int parts) {
        CourseMaterialDispatchConfig config = new CourseMaterialDispatchConfig();
        config.setCourse(course);
        config.setCreatedBy(professor);
        config.setDispatchParts(parts);
        config.setExamThreshold(new BigDecimal("90.00"));
        return configRepository.saveAndFlush(config);
    }
}