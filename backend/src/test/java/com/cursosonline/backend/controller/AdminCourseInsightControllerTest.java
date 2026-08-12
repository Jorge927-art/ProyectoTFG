package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.AdminCourseDetailDTO;
import com.cursosonline.backend.dto.AdminCourseCollectiveStatsDTO;
import com.cursosonline.backend.dto.AdminCourseCatalogItemDTO;
import com.cursosonline.backend.dto.AdminCourseCreateRequestDTO;
import com.cursosonline.backend.dto.AdminCourseSearchResultDTO;
import com.cursosonline.backend.dto.AdminCourseUserStatsDTO;
import com.cursosonline.backend.dto.AdminEnrolledUserDTO;
import com.cursosonline.backend.exception.ResourceNotFoundException;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.services.AdminCourseCatalogService;
import com.cursosonline.backend.services.AdminCourseInsightService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Suite de Pruebas Unitarias para AdminCourseInsightController")
class AdminCourseInsightControllerTest {

        @Mock
        private AdminCourseInsightService adminCourseInsightService;

        @Mock
        private AdminCourseCatalogService adminCourseCatalogService;

        @InjectMocks
        private AdminCourseInsightController adminCourseInsightController;

        private MockMvc mockMvc;

        @BeforeEach
        void setUp() {
                mockMvc = MockMvcBuilders.standaloneSetup(adminCourseInsightController)
                                .setControllerAdvice(new com.cursosonline.backend.exception.GlobalExceptionHandler())
                                .build();
        }

        @Test
        @DisplayName("GET /api/admin/courses/catalog debe devolver el catálogo administrativo")
        void getCourseCatalog_DebeDevolverCatalogo() throws Exception {
                when(adminCourseCatalogService.getAdminCourseCatalog())
                                .thenReturn(List.of(new AdminCourseCatalogItemDTO(
                                                99L,
                                                "Arquitectura",
                                                "https://x",
                                                null,
                                                "Ingenieria",
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                4.2f,
                                                100,
                                                20f,
                                                "COLE",
                                                true)));

                mockMvc.perform(get("/api/admin/courses/catalog"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].courseId").value(99))
                                .andExpect(jsonPath("$[0].title").value("Arquitectura"))
                                .andExpect(jsonPath("$[0].site").value("COLE"))
                                .andExpect(jsonPath("$[0].used").value(true));
        }

        @Test
        @DisplayName("POST /api/admin/courses debe crear curso con payload válido")
        void createCourse_DebeCrearCurso() throws Exception {
                when(adminCourseCatalogService.createCourse(new AdminCourseCreateRequestDTO(
                                "Arquitectura",
                                "https://x",
                                null,
                                "Ingenieria",
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                4.5f,
                                320,
                                18f)))
                                .thenReturn(new AdminCourseCatalogItemDTO(
                                                77L,
                                                "Arquitectura",
                                                "https://x",
                                                null,
                                                "Ingenieria",
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                4.5f,
                                                320,
                                                18f,
                                                "COLE",
                                                false));

                mockMvc.perform(post("/api/admin/courses")
                                .contentType(APPLICATION_JSON)
                                .content("""
                                                {
                                                  "title": "Arquitectura",
                                                  "url": "https://x",
                                                  "category": "Ingenieria",
                                                  "rating": 4.5,
                                                  "numOfViewers": 320,
                                                  "duration": 18
                                                }
                                                """))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.courseId").value(77))
                                .andExpect(jsonPath("$.site").value("COLE"));
        }

        @Test
        @DisplayName("PATCH /api/admin/courses/{id} debe aplicar actualización parcial")
        void patchCourse_DebeActualizarParcial() throws Exception {
                when(adminCourseCatalogService.patchCourse(77L, Map.of("category", "Data")))
                                .thenReturn(new AdminCourseCatalogItemDTO(
                                                77L,
                                                "Arquitectura",
                                                null,
                                                null,
                                                "Data",
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                null,
                                                "COLE",
                                                false));

                mockMvc.perform(patch("/api/admin/courses/77")
                                .contentType(APPLICATION_JSON)
                                .content("""
                                                { "category": "Data" }
                                                """))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.courseId").value(77))
                                .andExpect(jsonPath("$.category").value("Data"));
        }

        @Test
        @DisplayName("DELETE /api/admin/courses/{id} debe devolver mensaje de eliminación")
        void deleteCourse_DebeResponderOk() throws Exception {
                doNothing().when(adminCourseCatalogService).deleteCourse(77L);

                mockMvc.perform(delete("/api/admin/courses/77"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.message").value("Curso eliminado correctamente."));
        }

        @Test
        @DisplayName("POST /api/admin/courses debe mapear ServicesException a HTTP 400")
        void createCourse_Duplicado_DebeDevolver400() throws Exception {
                when(adminCourseCatalogService.createCourse(new AdminCourseCreateRequestDTO(
                                "Arquitectura",
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null)))
                                .thenThrow(new ServicesException("Este curso ya existe."));

                mockMvc.perform(post("/api/admin/courses")
                                .contentType(APPLICATION_JSON)
                                .content("""
                                                { "title": "Arquitectura" }
                                                """))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.message").value("Este curso ya existe."));
        }

        @Test
        @DisplayName("POST /api/admin/courses debe devolver 400 con mensaje claro cuando el payload tiene formato inválido")
        void createCourse_PayloadConFormatoInvalido_DebeDevolver400() throws Exception {
                mockMvc.perform(post("/api/admin/courses")
                                .contentType(APPLICATION_JSON)
                                .content("""
                                                {
                                                        "title": "Arquitectura",
                                                        "category": "Ingenieria",
                                                        "courseType": "Básico",
                                                        "language": "ES",
                                                        "duration": "abc"
                                                }
                                                """))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.message").value(
                                                "Formato de datos incorrecto en la solicitud. Revisa los tipos y el formato de los campos enviados."));
        }

        @Test
        @DisplayName("GET /api/admin/courses/search debe delegar el keyword y devolver los resultados")
        void searchCourses_DebeDevolverResultadosDelServicio() throws Exception {
                when(adminCourseInsightService.searchCourses("Arquitectura"))
                                .thenReturn(List.of(new AdminCourseSearchResultDTO(300L, "Arquitectura de Software",
                                                "Ingenieria")));

                mockMvc.perform(get("/api/admin/courses/search").param("keyword", "Arquitectura"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].courseId").value(300))
                                .andExpect(jsonPath("$[0].title").value("Arquitectura de Software"));
        }

        @Test
        @DisplayName("GET /api/admin/courses/{courseId} debe devolver el detalle del curso")
        void getCourseDetail_DebeDevolverProfesorYAlumnos() throws Exception {
                AdminEnrolledUserDTO professor = new AdminEnrolledUserDTO(20L, "laura_teacher", "PROFESSOR", true);
                AdminEnrolledUserDTO student = new AdminEnrolledUserDTO(10L, "laura_student", "STUDENT", true);
                when(adminCourseInsightService.getCourseDetail(300L))
                                .thenReturn(new AdminCourseDetailDTO(300L, "Arquitectura de Software", professor,
                                                List.of(student)));

                mockMvc.perform(get("/api/admin/courses/300"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.professor.username").value("laura_teacher"))
                                .andExpect(jsonPath("$.students[0].username").value("laura_student"));
        }

        @Test
        @DisplayName("GET /api/admin/courses/{courseId}/collective-stats debe devolver métricas colectivas")
        void getCourseCollectiveStats_DebeDevolverMetricas() throws Exception {
                AdminCourseCollectiveStatsDTO dto = new AdminCourseCollectiveStatsDTO(
                                12,
                                60,
                                75,
                                4.2,
                                4.6,
                                7.8,
                                7.4,
                                8.1);
                when(adminCourseInsightService.getCourseCollectiveStats(300L)).thenReturn(dto);

                mockMvc.perform(get("/api/admin/courses/300/collective-stats"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.activeStudentsInCourse").value(12))
                                .andExpect(jsonPath("$.courseAverageProgressPercentage").value(60))
                                .andExpect(jsonPath("$.completionRatePercentage").value(75))
                                .andExpect(jsonPath("$.averageCourseRating").value(4.2))
                                .andExpect(jsonPath("$.averageInstructorRating").value(4.6))
                                .andExpect(jsonPath("$.averageGrade").value(7.8))
                                .andExpect(jsonPath("$.averageWorkGrade").value(7.4))
                                .andExpect(jsonPath("$.averageFinalExamGrade").value(8.1));
        }

        @Test
        @DisplayName("GET /api/admin/courses/{courseId}/users/{userId}/stats debe devolver las estadísticas completas")
        void getUserStats_DebeDevolverEstadisticasCompletas() throws Exception {
                AdminCourseUserStatsDTO dto = new AdminCourseUserStatsDTO(
                                12, 65, 60,
                                List.of(new AdminCourseUserStatsDTO.GradeItem("Examen Final", new BigDecimal("8.5"))),
                                null, 8.5,
                                100, 4.2, 4.6);
                when(adminCourseInsightService.getUserStatsInCourse(300L, 10L)).thenReturn(dto);

                mockMvc.perform(get("/api/admin/courses/300/users/10/stats"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.activeStudentsInCourse").value(12))
                                .andExpect(jsonPath("$.studentProgressPercentage").value(65))
                                .andExpect(jsonPath("$.courseAverageProgressPercentage").value(60))
                                .andExpect(jsonPath("$.workGrade").isEmpty())
                                .andExpect(jsonPath("$.finalExamGrade").value(8.5))
                                .andExpect(jsonPath("$.completionRatePercentage").value(100))
                                .andExpect(jsonPath("$.averageCourseRating").value(4.2))
                                .andExpect(jsonPath("$.averageInstructorRating").value(4.6))
                                .andExpect(jsonPath("$.studentGrades[0].title").value("Examen Final"));
        }

        @Test
        @DisplayName("GET .../stats debe devolver 404 con el ErrorResponse correcto cuando el curso o usuario no existen")
        void getUserStats_CursoOUsuarioInexistente_DebeDevolver404() throws Exception {
                doThrow(new ResourceNotFoundException("Curso no encontrado con id: 999"))
                                .when(adminCourseInsightService).getUserStatsInCourse(999L, 10L);

                mockMvc.perform(get("/api/admin/courses/999/users/10/stats"))
                                .andExpect(status().isNotFound())
                                .andExpect(jsonPath("$.status").value(404))
                                .andExpect(jsonPath("$.message").value("Curso no encontrado con id: 999"))
                                .andExpect(jsonPath("$.timestamp").exists());
        }

        @Test
        @DisplayName("GET /api/admin/courses/{courseId} debe devolver 404 cuando el curso no existe")
        void getCourseDetail_CursoInexistente_DebeDevolver404() throws Exception {
                doThrow(new ResourceNotFoundException("Curso no encontrado con id: 999"))
                                .when(adminCourseInsightService).getCourseDetail(999L);

                mockMvc.perform(get("/api/admin/courses/999"))
                                .andExpect(status().isNotFound())
                                .andExpect(jsonPath("$.status").value(404))
                                .andExpect(jsonPath("$.message").value("Curso no encontrado con id: 999"));
        }
}