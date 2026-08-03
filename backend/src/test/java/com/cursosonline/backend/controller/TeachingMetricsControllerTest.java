package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.StudentMetricBreakdownDTO;
import com.cursosonline.backend.dto.TeachingMetricsSummaryDTO;
import com.cursosonline.backend.exception.GlobalExceptionHandler;
import com.cursosonline.backend.services.TeachingMetricsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.security.Principal;
import java.util.List;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Suite de Pruebas Unitarias para TeachingMetricsController")
class TeachingMetricsControllerTest {

        private MockMvc mockMvc;

        @InjectMocks
        private TeachingMetricsController teachingMetricsController;

        @Mock
        private TeachingMetricsService teachingMetricsService;

        private Principal mockPrincipal;

        @BeforeEach
        void setUp() {
                mockPrincipal = Mockito.mock(Principal.class);
                mockMvc = MockMvcBuilders.standaloneSetup(teachingMetricsController)
                                .setControllerAdvice(new GlobalExceptionHandler())
                                .build();
        }

        @Test
        @DisplayName("Debe retornar 200 OK con el resumen cuando la sesión es válida")
        void getSummary_WithValidSession_ShouldReturnOk() throws Exception {
                when(mockPrincipal.getName()).thenReturn("profesor");
                when(teachingMetricsService.getSummary(eq(7L), eq("profesor")))
                                .thenReturn(new TeachingMetricsSummaryDTO(7L, 83.5, 71.2, 8.4));

                mockMvc.perform(get("/api/v1/teacher/metrics/summary")
                                .param("courseId", "7")
                                .principal(mockPrincipal)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.courseId").value(7))
                                .andExpect(jsonPath("$.collectiveProgress").value(83.5))
                                .andExpect(jsonPath("$.completionRate").value(71.2));
        }

        @Test
        @DisplayName("Debe retornar 200 OK con desglose de alumnos cuando la sesión es válida")
        void getStudentBreakdown_WithValidSession_ShouldReturnOk() throws Exception {
                when(mockPrincipal.getName()).thenReturn("profesor");
                when(teachingMetricsService.getStudentBreakdown(eq(7L), eq("profesor")))
                                .thenReturn(List.of(new StudentMetricBreakdownDTO(
                                                15L,
                                                "alumno1",
                                                "alumno1@demo.com",
                                                7L,
                                                "Programacion Avanzada",
                                                90,
                                                8.7)));

                mockMvc.perform(get("/api/v1/teacher/metrics/students")
                                .param("courseId", "7")
                                .principal(mockPrincipal)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].userId").value(15))
                                .andExpect(jsonPath("$[0].username").value("alumno1"))
                                .andExpect(jsonPath("$[0].progressPercentage").value(90));
        }

        @Test
        @DisplayName("Debe delegar en el servicio el resumen global cuando no se envía courseId")
        void getSummary_WithoutCourseId_ShouldPassNullToService() throws Exception {
                when(mockPrincipal.getName()).thenReturn("profesor");
                when(teachingMetricsService.getSummary(isNull(), eq("profesor")))
                                .thenReturn(new TeachingMetricsSummaryDTO(null, 10.0, 20.0, 30.0));

                mockMvc.perform(get("/api/v1/teacher/metrics/summary")
                                .principal(mockPrincipal)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.collectiveProgress").value(10.0))
                                .andExpect(jsonPath("$.courseId").value(nullValue()));
        }

        @Test
        @DisplayName("Debe delegar en el servicio el desglose global cuando no se envía courseId")
        void getStudentBreakdown_WithoutCourseId_ShouldPassNullToService() throws Exception {
                when(mockPrincipal.getName()).thenReturn("profesor");
                when(teachingMetricsService.getStudentBreakdown(isNull(), eq("profesor"))).thenReturn(List.of());

                mockMvc.perform(get("/api/v1/teacher/metrics/students")
                                .principal(mockPrincipal)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$").isArray());
        }

        @Test
        @DisplayName("Debe retornar 401 Unauthorized cuando falta el principal en el desglose de alumnos")
        void getStudentBreakdown_WithoutPrincipal_ShouldReturnUnauthorized() throws Exception {
                mockMvc.perform(get("/api/v1/teacher/metrics/students")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isUnauthorized())
                                .andExpect(jsonPath("$.message").value("Credenciales de acceso inválidas."));
        }

        @Test
        @DisplayName("Debe retornar 401 Unauthorized cuando no hay sesión válida")
        void getSummary_WithoutPrincipal_ShouldReturnUnauthorized() throws Exception {
                mockMvc.perform(get("/api/v1/teacher/metrics/summary")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isUnauthorized())
                                .andExpect(jsonPath("$.message").value("Credenciales de acceso inválidas."));
        }

        @Test
        @DisplayName("Debe retornar 403 Forbidden cuando el curso no pertenece al profesor")
        void getSummary_WhenServiceThrowsAccessDenied_ShouldReturnForbidden() throws Exception {
                when(mockPrincipal.getName()).thenReturn("profesor");
                when(teachingMetricsService.getSummary(eq(999L), eq("profesor")))
                                .thenThrow(new AccessDeniedException(
                                                "El profesor no imparte la asignatura solicitada."));

                mockMvc.perform(get("/api/v1/teacher/metrics/summary")
                                .param("courseId", "999")
                                .principal(mockPrincipal)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isForbidden())
                                .andExpect(jsonPath("$.message")
                                                .value("Acceso denegado: No posee los privilegios requeridos para este recurso."));
        }

        @Test
        @DisplayName("Debe retornar 500 Internal Server Error ante fallo inesperado")
        void getStudentBreakdown_WhenServiceThrowsRuntime_ShouldReturnServerError() throws Exception {
                when(mockPrincipal.getName()).thenReturn("profesor");
                when(teachingMetricsService.getStudentBreakdown(eq(7L), eq("profesor")))
                                .thenThrow(new RuntimeException("Fallo interno de prueba"));

                mockMvc.perform(get("/api/v1/teacher/metrics/students")
                                .param("courseId", "7")
                                .principal(mockPrincipal)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError())
                                .andExpect(jsonPath("$.message").value("Error interno en el servidor."));
        }
}
