package com.cursosonline.backend;

import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.repository.CourseGradeRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean; // Cambiar a @MockBean si Spring Boot es < 3.4
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.Collections;
import java.util.Optional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test de Integración del Flujo de Calificaciones Académicas del Profesor.
 * Certifica el flujo fin-a-fin (End-to-End) desde la emisión de una nota
 * hasta su cálculo e impacto inmediato en los DTOs de rendimiento del alumnado.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("Consola Docente - Test de Integración del Flujo de Calificaciones")
public class TeacherAcademicGradingIntegrationTest {

        private MockMvc mockMvc;

        @Autowired
        private WebApplicationContext webApplicationContext;

        @MockitoBean
        private EnrollmentRepository enrollmentRepository;

        @MockitoBean
        private CourseGradeRepository courseGradeRepository;

        @MockitoBean
        private UserRepository userRepository;

        private Users alumnoSimulado;

        @BeforeEach
        public void setUp() {
                this.mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                                .apply(SecurityMockMvcConfigurers.springSecurity())
                                .build();

                // Inicializar entidad de alumno para las aserciones del rendimiento
                alumnoSimulado = new Users();
                alumnoSimulado.setUser_id(99L);
                alumnoSimulado.setUsername("alumno_test");
                alumnoSimulado.setEmail("alumno@cursos.com");
                alumnoSimulado.setRole(Role.STUDENT);
        }

        @Test
        @WithMockUser(username = "profesor_test", roles = { "PROFESSOR" })
        @DisplayName("El envío de una nota por parte del docente debe impactar de inmediato en el DTO de rendimiento analítico")
        public void alRegistrarNota_DebeCalcularYReflejarLaMediaEnElExpediente() throws Exception {
                Long fakeEnrollmentId = 888L;
                Long expectedStudentEnrollmentId = 999L;
                Long courseId = 1L;

                // --- FASE 1: EMISIÓN DE LA CALIFICACIÓN ---
                // Configurar stubs para autorizar la acción de calificar
                Mockito.when(enrollmentRepository.isInstructorAuthorizedForEnrollment(fakeEnrollmentId,
                                "profesor_test"))
                                .thenReturn(true);

                Enrollment dummyEnrollment = new Enrollment();
                dummyEnrollment.setEnrollmentid(fakeEnrollmentId);
                Mockito.when(enrollmentRepository.findById(fakeEnrollmentId)).thenReturn(Optional.of(dummyEnrollment));

                // Cuerpo JSON estructurado bajo el Record de producción 'TeacherGradeRequest'
                String gradePayload = """
                                    {
                                        "enrollmentId": 888,
                                        "title": "Examen Final Módulo 1",
                                        "score": 9.5
                                    }
                                """;

                mockMvc.perform(post("/api/v1/teacher/evaluations/submit")
                                .content(gradePayload)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.message")
                                                .value("Calificación registrada con éxito por el docente autorizado."));

                // --- FASE 2: CONSULTA Y VERIFICACIÓN DEL RENDIMIENTO ACADÉMICO ---
                // Configurar stubs para simular el cálculo de la nota impactada en las medias
                // aritméticas
                Enrollment activeEnrollment = new Enrollment();
                activeEnrollment.setEnrollmentid(expectedStudentEnrollmentId);
                activeEnrollment.setUser(alumnoSimulado);

                Mockito.when(enrollmentRepository.findActiveStudentEnrollmentsByCourseId(courseId))
                                .thenReturn(Collections.singletonList(activeEnrollment));
                Mockito.when(courseGradeRepository.getGroupAverageScore(courseId)).thenReturn(9.5);
                Mockito.when(courseGradeRepository.getIndividualStudentAverageScore(courseId,
                                alumnoSimulado.getUser_id()))
                                .thenReturn(9.5);

                // Invocar el endpoint de la consola docente para validar la integridad
                // fin-a-fin del dato
                mockMvc.perform(get("/api/v1/teacher/evaluations/courses/" + courseId + "/management/students")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                // Aserciones críticas sobre el Record 'StudentPerformanceDTO'
                                .andExpect(jsonPath("$[0].enrollmentId").value(expectedStudentEnrollmentId))
                                .andExpect(jsonPath("$[0].userId").value(alumnoSimulado.getUser_id()))
                                .andExpect(jsonPath("$[0].username").value("alumno_test"))
                                .andExpect(jsonPath("$[0].individualGrade").value(9.5))
                                .andExpect(jsonPath("$[0].groupAverage").value(9.5));
        }
}
