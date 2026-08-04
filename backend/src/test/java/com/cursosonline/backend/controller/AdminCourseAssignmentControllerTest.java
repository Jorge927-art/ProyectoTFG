package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.AdminCourseProfessorReassignmentResultDTO;
import com.cursosonline.backend.dto.AdminProfessorCourseDTO;
import com.cursosonline.backend.dto.AdminProfessorOptionDTO;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.services.AdminCourseAssignmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Suite de Pruebas Unitarias para AdminCourseAssignmentController")
class AdminCourseAssignmentControllerTest {

    @Mock
    private AdminCourseAssignmentService adminCourseAssignmentService;

    @InjectMocks
    private AdminCourseAssignmentController adminCourseAssignmentController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminCourseAssignmentController)
                .setControllerAdvice(new com.cursosonline.backend.exception.GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/admin/course-assignments/professors debe devolver solo profesores habilitados")
    void getProfessors_ShouldReturnOptions() throws Exception {
        when(adminCourseAssignmentService.getEnabledProfessorsAlphabetical())
                .thenReturn(List.of(
                        new AdminProfessorOptionDTO(10L, "alfa_docente"),
                        new AdminProfessorOptionDTO(11L, "beta_docente")));

        mockMvc.perform(get("/api/admin/course-assignments/professors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].userId").value(10))
                .andExpect(jsonPath("$[0].username").value("alfa_docente"))
                .andExpect(jsonPath("$[1].username").value("beta_docente"));
    }

    @Test
    @DisplayName("GET /api/admin/course-assignments/professors/{id}/courses debe devolver cursos titularizados")
    void getCoursesByProfessor_ShouldReturnCourses() throws Exception {
        when(adminCourseAssignmentService.getCoursesAssignedToProfessor(10L))
                .thenReturn(List.of(new AdminProfessorCourseDTO(300L, "Arquitectura", 10L, "alfa_docente")));

        mockMvc.perform(get("/api/admin/course-assignments/professors/10/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseId").value(300))
                .andExpect(jsonPath("$[0].currentProfessorUsername").value("alfa_docente"));
    }

    @Test
    @DisplayName("PATCH /api/admin/course-assignments/courses/{id}/reassign-professor debe aplicar la reasignación")
    void reassignProfessor_ShouldReturnResult() throws Exception {
        when(adminCourseAssignmentService.reassignCourseProfessor(300L, 20L))
                .thenReturn(new AdminCourseProfessorReassignmentResultDTO(
                        "Reasignación completada.",
                        300L,
                        "Arquitectura",
                        10L,
                        "alfa_docente",
                        20L,
                        "beta_docente"));

        mockMvc.perform(patch("/api/admin/course-assignments/courses/300/reassign-professor")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content("{\"professorId\":20}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courseId").value(300))
                .andExpect(jsonPath("$.previousProfessorUsername").value("alfa_docente"))
                .andExpect(jsonPath("$.newProfessorUsername").value("beta_docente"));
    }

    @Test
    @DisplayName("PATCH ... debe devolver 400 cuando la regla de negocio rechaza la reasignación")
    void reassignProfessor_BusinessError_ShouldReturnBadRequest() throws Exception {
        doThrow(new ServicesException("Acción inválida: solo se puede reasignar a usuarios con rol PROFESSOR."))
                .when(adminCourseAssignmentService)
                .reassignCourseProfessor(300L, 88L);

        mockMvc.perform(patch("/api/admin/course-assignments/courses/300/reassign-professor")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content("{\"professorId\":88}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message")
                        .value("Acción inválida: solo se puede reasignar a usuarios con rol PROFESSOR."));
    }
}
