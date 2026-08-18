package com.cursosonline.backend.config;

import com.cursosonline.backend.dto.AdminGlobalStatisticsDTO;
import com.cursosonline.backend.dto.TeachingMetricsSummaryDTO;
import com.cursosonline.backend.services.AdminGlobalStatisticsService;
import com.cursosonline.backend.services.TeachingMetricsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@DisplayName("Pruebas de autorización HTTP de SecurityConfig")
class SecurityConfigAuthorizationIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    @MockitoBean
    private AdminGlobalStatisticsService adminGlobalStatisticsService;

    @MockitoBean
    private TeachingMetricsService teachingMetricsService;

    private MockMvc mockMvc;
    private UserDetails student;
    private UserDetails professor;
    private UserDetails admin;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
        student = User.withUsername("security_student").password("password").authorities("STUDENT").build();
        professor = User.withUsername("security_professor").password("password").authorities("PROFESSOR").build();
        admin = User.withUsername("security_admin").password("password").authorities("ADMIN").build();
    }

    @Test
    @DisplayName("debe rechazar una petición anónima a un endpoint administrativo")
    void adminEndpoint_Anonymous_ShouldRequireAuthentication() throws Exception {
        int statusCode = mockMvc.perform(get("/api/admin/statistics/global"))
                .andReturn()
                .getResponse()
                .getStatus();

        assertTrue(statusCode == 401 || statusCode == 403);

        verifyNoInteractions(adminGlobalStatisticsService);
    }

    @Test
    @DisplayName("debe rechazar a un estudiante en endpoints administrativos")
    void adminEndpoint_Student_ShouldReturnForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/statistics/global").with(user(student)))
                .andExpect(status().isForbidden());

        verifyNoInteractions(adminGlobalStatisticsService);
    }

    @Test
    @DisplayName("debe permitir a un administrador en endpoints administrativos")
    void adminEndpoint_Admin_ShouldReturnOk() throws Exception {
        when(adminGlobalStatisticsService.getGlobalStatistics()).thenReturn(
                new AdminGlobalStatisticsDTO(2026, 10, 2, List.of(), List.of()));

        mockMvc.perform(get("/api/admin/statistics/global").with(user(admin)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("debe permitir a un profesor en endpoints docentes")
    void teacherEndpoint_Professor_ShouldReturnOk() throws Exception {
        when(teachingMetricsService.getSummary(7L, "security_professor"))
                .thenReturn(new TeachingMetricsSummaryDTO(7L, 80.0, 50.0, 7.5));

        mockMvc.perform(get("/api/v1/teacher/metrics/summary")
                .param("courseId", "7")
                .with(user(professor)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("debe rechazar a un estudiante en endpoints docentes")
    void teacherEndpoint_Student_ShouldReturnForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/teacher/metrics/summary")
                .param("courseId", "7")
                .with(user(student)))
                .andExpect(status().isForbidden());

        verifyNoInteractions(teachingMetricsService);
    }
}