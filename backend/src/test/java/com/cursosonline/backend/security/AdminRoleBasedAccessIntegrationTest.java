package com.cursosonline.backend.security;

import com.cursosonline.backend.dto.AdminCourseSearchResultDTO;
import com.cursosonline.backend.dto.AdminCourseCatalogItemDTO;
import com.cursosonline.backend.dto.AdminGlobalStatisticsDTO;
import com.cursosonline.backend.dto.AdminGlobalTopCourseDTO;
import com.cursosonline.backend.dto.AdminGlobalYearComparisonDTO;
import com.cursosonline.backend.services.AdminCourseCatalogService;
import com.cursosonline.backend.services.AdminCourseInsightService;
import com.cursosonline.backend.services.AdminGlobalStatisticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DisplayName("RBAC Admin Endpoints - Test de Integración")
class AdminRoleBasedAccessIntegrationTest {

        private MockMvc mockMvc;

        @Autowired
        private WebApplicationContext context;

        @MockitoBean
        private AdminGlobalStatisticsService adminGlobalStatisticsService;

        @MockitoBean
        private AdminCourseInsightService adminCourseInsightService;

        @MockitoBean
        private AdminCourseCatalogService adminCourseCatalogService;

        private UserDetails studentUserDetails;
        private UserDetails professorUserDetails;
        private UserDetails adminUserDetails;

        @BeforeEach
        void setUp() {
                mockMvc = MockMvcBuilders
                                .webAppContextSetup(context)
                                .apply(SecurityMockMvcConfigurers.springSecurity())
                                .build();

                studentUserDetails = new User(
                                "student_rbac",
                                "protected_password",
                                Collections.singletonList(new SimpleGrantedAuthority("STUDENT")));

                professorUserDetails = new User(
                                "professor_rbac",
                                "protected_password",
                                Collections.singletonList(new SimpleGrantedAuthority("PROFESSOR")));

                adminUserDetails = new User(
                                "admin_rbac",
                                "protected_password",
                                Collections.singletonList(new SimpleGrantedAuthority("ADMIN")));
        }

        @Test
        @DisplayName("ALUMNO -> 403 en estadísticas globales")
        void shouldReturn403WhenStudentAccessesGlobalStatistics() throws Exception {
                mockMvc.perform(get("/api/admin/statistics/global")
                                .with(user(studentUserDetails))
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isForbidden());

                verifyNoInteractions(adminGlobalStatisticsService);
        }

        @Test
        @DisplayName("ALUMNO -> 403 en catálogo administrativo de cursos")
        void shouldReturn403WhenStudentAccessesAdminCourseCatalog() throws Exception {
                mockMvc.perform(get("/api/admin/courses/catalog")
                                .with(user(studentUserDetails))
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isForbidden());

                verifyNoInteractions(adminCourseCatalogService);
        }

        @Test
        @DisplayName("ALUMNO -> 403 en búsqueda de cursos admin")
        void shouldReturn403WhenStudentSearchesAdminCourses() throws Exception {
                mockMvc.perform(get("/api/admin/courses/search")
                                .param("keyword", "Al")
                                .with(user(studentUserDetails))
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isForbidden());

                verifyNoInteractions(adminCourseInsightService);
        }

        @Test
        @DisplayName("ALUMNO -> 403 en stats de usuario por curso")
        void shouldReturn403WhenStudentRequestsUserCourseStats() throws Exception {
                mockMvc.perform(get("/api/admin/courses/{courseId}/users/{userId}/stats", 42L, 100L)
                                .with(user(studentUserDetails))
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isForbidden());

                verifyNoInteractions(adminCourseInsightService);
        }

        @Test
        @DisplayName("PROFESOR sin ADMIN -> 403 en estadísticas globales")
        void shouldReturn403WhenProfessorAccessesGlobalStatistics() throws Exception {
                mockMvc.perform(get("/api/admin/statistics/global")
                                .with(user(professorUserDetails))
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isForbidden());

                verifyNoInteractions(adminGlobalStatisticsService);
        }

        @Test
        @DisplayName("PROFESOR sin ADMIN -> 403 en creación de curso")
        void shouldReturn403WhenProfessorCreatesAdminCourse() throws Exception {
                mockMvc.perform(post("/api/admin/courses")
                                .with(user(professorUserDetails))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"title\":\"Nuevo\"}"))
                                .andExpect(status().isForbidden());

                verifyNoInteractions(adminCourseCatalogService);
        }

        @Test
        @DisplayName("PROFESOR sin ADMIN -> 403 en patch de curso")
        void shouldReturn403WhenProfessorPatchesAdminCourse() throws Exception {
                mockMvc.perform(patch("/api/admin/courses/10")
                                .with(user(professorUserDetails))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"category\":\"X\"}"))
                                .andExpect(status().isForbidden());

                verifyNoInteractions(adminCourseCatalogService);
        }

        @Test
        @DisplayName("PROFESOR sin ADMIN -> 403 en búsqueda de cursos admin")
        void shouldReturn403WhenProfessorSearchesAdminCourses() throws Exception {
                mockMvc.perform(get("/api/admin/courses/search")
                                .param("keyword", "Al")
                                .with(user(professorUserDetails))
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isForbidden());

                verifyNoInteractions(adminCourseInsightService);
        }

        @Test
        @DisplayName("ADMIN -> 200 en estadísticas globales")
        void shouldReturn200WhenAdminAccessesGlobalStatistics() throws Exception {
                AdminGlobalStatisticsDTO dto = new AdminGlobalStatisticsDTO(
                                2026,
                                120,
                                9,
                                List.of(new AdminGlobalTopCourseDTO(10L, "Algebra", 45)),
                                List.of(new AdminGlobalYearComparisonDTO(2026, 120, 9, 45, true)));

                when(adminGlobalStatisticsService.getGlobalStatistics()).thenReturn(dto);

                mockMvc.perform(get("/api/admin/statistics/global")
                                .with(user(adminUserDetails))
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("ADMIN -> 200 en catálogo administrativo de cursos")
        void shouldReturn200WhenAdminAccessesCourseCatalog() throws Exception {
                when(adminCourseCatalogService.getAdminCourseCatalog()).thenReturn(List.of(
                                new AdminCourseCatalogItemDTO(
                                                10L,
                                                "Algebra",
                                                null,
                                                null,
                                                "Matemáticas",
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
                                                false)));

                mockMvc.perform(get("/api/admin/courses/catalog")
                                .with(user(adminUserDetails))
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("ADMIN -> 200 en borrado de curso")
        void shouldReturn200WhenAdminDeletesCourse() throws Exception {
                mockMvc.perform(delete("/api/admin/courses/10")
                                .with(user(adminUserDetails))
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("ADMIN -> 200 en búsqueda de cursos admin")
        void shouldReturn200WhenAdminSearchesCourses() throws Exception {
                when(adminCourseInsightService.searchCourses("Al"))
                                .thenReturn(List.of(new AdminCourseSearchResultDTO(10L, "Algebra", "Matemáticas")));

                mockMvc.perform(get("/api/admin/courses/search")
                                .param("keyword", "Al")
                                .with(user(adminUserDetails))
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk());
        }
}
