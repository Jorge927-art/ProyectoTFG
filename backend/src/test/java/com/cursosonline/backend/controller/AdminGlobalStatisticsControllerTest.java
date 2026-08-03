package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.AdminGlobalStatisticsDTO;
import com.cursosonline.backend.dto.AdminGlobalTopCourseDTO;
import com.cursosonline.backend.dto.AdminGlobalYearComparisonDTO;
import com.cursosonline.backend.services.AdminGlobalStatisticsService;
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

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Suite de Pruebas Unitarias para AdminGlobalStatisticsController")
class AdminGlobalStatisticsControllerTest {

    @Mock
    private AdminGlobalStatisticsService adminGlobalStatisticsService;

    @InjectMocks
    private AdminGlobalStatisticsController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new com.cursosonline.backend.exception.GlobalExceptionHandler())
                .build();
    }

    @Test
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
    @DisplayName("POST /api/admin/statistics/global/finalize-previous-year debe consolidar el año cerrado")
    void finalizePreviousYearSnapshot_DebeDevolverOk() throws Exception {
        when(adminGlobalStatisticsService.finalizePreviousYearSnapshotNow()).thenReturn(2025);

        mockMvc.perform(post("/api/admin/statistics/global/finalize-previous-year"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Histórico anual consolidado correctamente."))
                .andExpect(jsonPath("$.finalizedYear").value(2025));
    }
}
