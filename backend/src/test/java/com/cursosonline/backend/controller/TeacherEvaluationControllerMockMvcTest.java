package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.CourseGrade;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.repository.CourseGradeRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("TeacherEvaluationController - MockMvc submit grading")
class TeacherEvaluationControllerMockMvcTest {

    private MockMvc mockMvc;

    @InjectMocks
    private TeacherEvaluationController teacherEvaluationController;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private CourseGradeRepository courseGradeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Principal principal;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(teacherEvaluationController).build();
    }

    @Test
    @DisplayName("debe mapear feedback del payload JSON y persistirlo en CourseGrade")
    void gradeStudent_shouldMapFeedbackAndPersistGrade() throws Exception {
        Long enrollmentId = 888L;
        String teacherUsername = "profesor_test";
        String feedback = "Buen trabajo, pero revisa normalizacion de datos.";

        Enrollment enrollment = new Enrollment();
        enrollment.setEnrollmentid(enrollmentId);

        when(principal.getName()).thenReturn(teacherUsername);
        when(enrollmentRepository.isInstructorAuthorizedForEnrollment(enrollmentId, teacherUsername)).thenReturn(true);
        when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(enrollment));

        String gradePayload = """
                {
                  "enrollmentId": 888,
                  "title": "Examen Final Modulo 1",
                  "score": 9.50,
                  "feedback": "Buen trabajo, pero revisa normalizacion de datos."
                }
                """;

        mockMvc.perform(post("/api/v1/teacher/evaluations/submit")
                .principal(principal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(gradePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Calificación registrada con éxito por el docente autorizado."));

        ArgumentCaptor<CourseGrade> captor = ArgumentCaptor.forClass(CourseGrade.class);
        verify(courseGradeRepository, times(1)).save(captor.capture());

        CourseGrade persisted = captor.getValue();
        assertEquals("Examen Final Modulo 1", persisted.getTitle());
        assertEquals(new BigDecimal("9.50"), persisted.getScore());
        assertEquals(feedback, persisted.getFeedback());
        assertEquals(enrollmentId, persisted.getEnrollment().getEnrollmentid());

        verify(enrollmentRepository, times(1)).isInstructorAuthorizedForEnrollment(eq(enrollmentId),
                eq(teacherUsername));
    }

    @Test
    @DisplayName("debe devolver 403 y no guardar si el profesor no está autorizado para la matrícula")
    void gradeStudent_shouldReturnForbiddenAndNotPersist_WhenProfessorIsNotAuthorized() throws Exception {
        Long enrollmentId = 999L;
        String teacherUsername = "profesor_test";

        when(principal.getName()).thenReturn(teacherUsername);
        when(enrollmentRepository.isInstructorAuthorizedForEnrollment(enrollmentId, teacherUsername)).thenReturn(false);

        String gradePayload = """
                {
                  "enrollmentId": 999,
                  "title": "Trabajo Integrador",
                  "score": 7.25,
                  "feedback": "Necesita mejorar la estructura del informe."
                }
                """;

        mockMvc.perform(post("/api/v1/teacher/evaluations/submit")
                .principal(principal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(gradePayload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value(
                        "Acceso denegado: No eres el instructor asignado a esta asignatura o la matrícula no existe."));

        verify(courseGradeRepository, never()).save(org.mockito.ArgumentMatchers.any(CourseGrade.class));
        verify(enrollmentRepository, never()).findById(enrollmentId);
    }

    @Test
    @DisplayName("debe devolver 401 y no guardar si no hay principal autenticado")
    void gradeStudent_shouldReturnUnauthorizedAndNotPersist_WhenPrincipalIsMissing() throws Exception {
        String gradePayload = """
                {
                  "enrollmentId": 111,
                  "title": "Examen Parcial",
                  "score": 6.75,
                  "feedback": "Debes reforzar conceptos básicos."
                }
                """;

        mockMvc.perform(post("/api/v1/teacher/evaluations/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(gradePayload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Sesión inválida o expirada."));

        verifyNoInteractions(courseGradeRepository);
        verifyNoInteractions(enrollmentRepository);
    }
}
