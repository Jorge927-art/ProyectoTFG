package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.UserSystemNotification;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.repository.UserSystemNotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test-ci")
@Transactional
@DisplayName("Integración AdminCourseAssignment: seguridad + persistencia")
class AdminCourseAssignmentIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CoursesRepository coursesRepository;

    @Autowired
    private UserSystemNotificationRepository userSystemNotificationRepository;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    private Users saveUser(String username, Role role, boolean enabled) {
        Users user = new Users();
        user.setUsername(username);
        user.setPassword("encoded-pass");
        user.setRole(role);
        user.setEmail(username + "@cursosonline.es");
        user.setEnabled(enabled);
        return userRepository.saveAndFlush(user);
    }

    private Courses saveCourse(String title, Users assignedProfessor) {
        Courses course = new Courses();
        course.setTitle(title);
        course.setCategory("Ingenieria");
        course.setAssignedUser(assignedProfessor);
        course.setInstructors(assignedProfessor != null ? assignedProfessor.getUsername() : null);
        return coursesRepository.saveAndFlush(course);
    }

    @Test
    @WithMockUser(authorities = "ADMIN")
    @DisplayName("PATCH reasignación admin: actualiza titular/instructors y persiste 2 notificaciones")
    void reassignCourseProfessor_AsAdmin_ShouldPersistCourseAndNotifications() throws Exception {
        Users currentProfessor = saveUser("profesor_saliente_it", Role.PROFESSOR, true);
        Users newProfessor = saveUser("profesor_entrante_it", Role.PROFESSOR, true);
        Courses course = saveCourse("Sistemas Distribuidos", currentProfessor);

        mockMvc.perform(
                patch("/api/admin/course-assignments/courses/{courseId}/reassign-professor", course.getCourse_id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"professorId\":" + newProfessor.getUser_id() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courseId").value(course.getCourse_id()))
                .andExpect(jsonPath("$.previousProfessorUsername").value("profesor_saliente_it"))
                .andExpect(jsonPath("$.newProfessorUsername").value("profesor_entrante_it"));

        Courses reloadedCourse = coursesRepository.findById(course.getCourse_id()).orElseThrow();
        assertNotNull(reloadedCourse.getAssignedUser());
        assertEquals(newProfessor.getUser_id(), reloadedCourse.getAssignedUser().getUser_id());
        assertEquals("profesor_entrante_it", reloadedCourse.getInstructors());

        List<UserSystemNotification> outgoing = userSystemNotificationRepository
                .findUnreadByUsername("profesor_saliente_it");
        List<UserSystemNotification> incoming = userSystemNotificationRepository
                .findUnreadByUsername("profesor_entrante_it");

        assertEquals(1, outgoing.size());
        assertEquals(1, incoming.size());
        assertEquals("COURSE_ASSIGNMENT_CHANGE", outgoing.get(0).getType());
        assertEquals("COURSE_ASSIGNMENT_CHANGE", incoming.get(0).getType());
        assertEquals("/professor", incoming.get(0).getRedirectUrl());
        assertTrue(outgoing.get(0).getMessage().contains("desvinculado"));
        assertTrue(incoming.get(0).getMessage().contains("asignado"));
    }

    @Test
    @WithMockUser(authorities = "PROFESSOR")
    @DisplayName("PATCH reasignación sin ADMIN: devuelve 403 y no modifica curso/notificaciones")
    void reassignCourseProfessor_NonAdmin_ShouldReturnForbiddenAndKeepState() throws Exception {
        Users currentProfessor = saveUser("profesor_actual_forbidden", Role.PROFESSOR, true);
        Users newProfessor = saveUser("profesor_nuevo_forbidden", Role.PROFESSOR, true);
        Courses course = saveCourse("Redes", currentProfessor);

        mockMvc.perform(
                patch("/api/admin/course-assignments/courses/{courseId}/reassign-professor", course.getCourse_id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"professorId\":" + newProfessor.getUser_id() + "}"))
                .andExpect(status().isForbidden());

        Courses reloadedCourse = coursesRepository.findById(course.getCourse_id()).orElseThrow();
        assertNotNull(reloadedCourse.getAssignedUser());
        assertEquals(currentProfessor.getUser_id(), reloadedCourse.getAssignedUser().getUser_id());
        assertEquals("profesor_actual_forbidden", reloadedCourse.getInstructors());

        assertTrue(userSystemNotificationRepository.findUnreadByUsername("profesor_actual_forbidden").isEmpty());
        assertTrue(userSystemNotificationRepository.findUnreadByUsername("profesor_nuevo_forbidden").isEmpty());
    }

    @Test
    @WithMockUser(authorities = "ADMIN")
    @DisplayName("PATCH reasignación a profesor deshabilitado: 400 sin efectos en BD")
    void reassignCourseProfessor_DisabledIncomingProfessor_ShouldReturnBadRequestWithoutSideEffects() throws Exception {
        Users currentProfessor = saveUser("profesor_actual_disabled", Role.PROFESSOR, true);
        Users disabledProfessor = saveUser("profesor_disabled_target", Role.PROFESSOR, false);
        Courses course = saveCourse("Calculo", currentProfessor);

        mockMvc.perform(
                patch("/api/admin/course-assignments/courses/{courseId}/reassign-professor", course.getCourse_id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"professorId\":" + disabledProfessor.getUser_id() + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(
                        jsonPath("$.message").value("Acción inválida: no se puede asignar un profesor deshabilitado."));

        Courses reloadedCourse = coursesRepository.findById(course.getCourse_id()).orElseThrow();
        assertNotNull(reloadedCourse.getAssignedUser());
        assertEquals(currentProfessor.getUser_id(), reloadedCourse.getAssignedUser().getUser_id());
        assertEquals("profesor_actual_disabled", reloadedCourse.getInstructors());

        assertTrue(userSystemNotificationRepository.findUnreadByUsername("profesor_actual_disabled").isEmpty());
        assertTrue(userSystemNotificationRepository.findUnreadByUsername("profesor_disabled_target").isEmpty());
    }
}