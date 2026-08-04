package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.AdminGlobalStatisticsDTO;
import com.cursosonline.backend.dto.AdminGlobalTopCourseDTO;
import com.cursosonline.backend.dto.AdminGlobalYearComparisonDTO;
import com.cursosonline.backend.services.AdminGlobalStatisticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@DisplayName("Suite de Pruebas Unitarias para AdminGlobalStatisticsController")
class AdminGlobalStatisticsControllerTest {

        @Autowired
        private WebApplicationContext context;

        private MockMvc mockMvc;

        @BeforeEach
        void setUp() {
                mockMvc = MockMvcBuilders.webAppContextSetup(context)
                                .apply(springSecurity())
                                .build();
        }

        @MockitoBean
        private AdminGlobalStatisticsService adminGlobalStatisticsService;

        @Test
        @WithMockUser(authorities = "ADMIN")
        @DisplayName("GET /api/admin/statistics/global debe devolver el panel global")
        void getGlobalStatistics_DebeDevolverDatos() throws Exception {
                AdminGlobalStatisticsDTO dto = new AdminGlobalStatisticsDTO(
                                2026,
                                120,
                                9,
                                List.of(new AdminGlobalTopCourseDTO(10L, "Algebra", 45)),
                                List.of(
                                                new AdminGlobalYearComparisonDTO(2026, 120, 9, 45, true),
                                                new AdminGlobalYearComparisonDTO(2025, 110, 8, 40, false),
                                                new AdminGlobalYearComparisonDTO(2024, 100, 7, 37, false)));

                when(adminGlobalStatisticsService.getGlobalStatistics()).thenReturn(dto);

                mockMvc.perform(get("/api/admin/statistics/global"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.currentYear").value(2026))
                                .andExpect(jsonPath("$.totalStudents").value(120))
                                .andExpect(jsonPath("$.topCourses[0].courseTitle").value("Algebra"))
                                .andExpect(jsonPath("$.yearlyComparisons[1].realData").value(false));
        }

        @Test
        @WithMockUser(authorities = "ADMIN")
        @DisplayName("POST /api/admin/statistics/global/finalize-previous-year debe consolidar el año cerrado")
        void finalizePreviousYearSnapshot_DebeDevolverOk() throws Exception {
                when(adminGlobalStatisticsService.finalizePreviousYearSnapshotNow()).thenReturn(2025);

                mockMvc.perform(post("/api/admin/statistics/global/finalize-previous-year"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.message").value("Histórico anual consolidado correctamente."))
                                .andExpect(jsonPath("$.finalizedYear").value(2025));
        }

        @Test
        @WithMockUser(authorities = "ADMIN")
        @DisplayName("GET /api/admin/statistics/global debe devolver 500 si el servicio falla")
        void getGlobalStatistics_ServicioFalla_DebeDevolver500() throws Exception {
                when(adminGlobalStatisticsService.getGlobalStatistics())
                                .thenThrow(new RuntimeException("fallo inesperado"));

                mockMvc.perform(get("/api/admin/statistics/global"))
                                .andExpect(status().isInternalServerError())
                                .andExpect(jsonPath("$.status").value(500))
                                .andExpect(jsonPath("$.message").value("Error interno en el servidor."));
        }

        @Test
        @WithMockUser(authorities = "ADMIN")
        @DisplayName("POST /api/admin/statistics/global/finalize-previous-year debe devolver 500 si el servicio falla")
        void finalizePreviousYearSnapshot_ServicioFalla_DebeDevolver500() throws Exception {
                when(adminGlobalStatisticsService.finalizePreviousYearSnapshotNow())
                                .thenThrow(new RuntimeException("fallo inesperado"));

                mockMvc.perform(post("/api/admin/statistics/global/finalize-previous-year"))
                                .andExpect(status().isInternalServerError())
                                .andExpect(jsonPath("$.status").value(500))
                                .andExpect(jsonPath("$.message").value("Error interno en el servidor."));
        }

        @Test
        @WithMockUser(authorities = "PROFESSOR")
        @DisplayName("GET /api/admin/statistics/global debe devolver 403 si el usuario autenticado no es admin")
        void getGlobalStatistics_UsuarioNoAdmin_DebeDevolver403() throws Exception {
                mockMvc.perform(get("/api/admin/statistics/global"))
                                .andExpect(status().isForbidden());

                verifyNoInteractions(adminGlobalStatisticsService);
        }

        @Test
        @DisplayName("GET /api/admin/statistics/global debe devolver 401 o 403 para usuario anónimo")
        void getGlobalStatistics_UsuarioAnonimo_DebeDevolver401o403() throws Exception {
                int statusCode = mockMvc.perform(get("/api/admin/statistics/global"))
                                .andReturn()
                                .getResponse()
                                .getStatus();

                org.junit.jupiter.api.Assertions.assertTrue(statusCode == 401 || statusCode == 403);
                verifyNoInteractions(adminGlobalStatisticsService);
        }
}
