package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.CourseStatsDTO;
import com.cursosonline.backend.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class CourseStatsControllerTest {

    private MockMvc mockMvc;

    // [CORREGIDO] Simulamos el servicio en lugar del repositorio para mantener la
    // consistencia
    @Mock
    private UserService userService;

    @InjectMocks
    private CourseStatsController courseStatsController;

    private UsernamePasswordAuthenticationToken mockPrincipal;

    @BeforeEach
    void setUp() {
        // Inicializamos MockMvc en modo Standalone (compila en cualquier entorno)
        this.mockMvc = MockMvcBuilders.standaloneSetup(courseStatsController).build();

        // Creamos un token de autenticación simulado idéntico al que inyecta tu filtro
        // JWT
        this.mockPrincipal = new UsernamePasswordAuthenticationToken(
                "Luis",
                null,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_STUDENT")));
    }

    @Test
    @DisplayName("Debería retornar HTTP 200 y las métricas analíticas cuando se solicitan estadísticas de un curso válido")
    void shouldReturnStatsWhenCourseExists() throws Exception {
        // ARRANGE
        Long targetCourseId = 101L;
        CourseStatsDTO mockStats = new CourseStatsDTO(
                targetCourseId,
                8.75,
                15L,
                4.8,
                4.9,
                "Coursera",
                "Data Science");

        // [CORREGIDO] Vinculamos el mock al nuevo método del servicio que retorna el
        // objeto DTO directamente
        when(userService.getCourseStats(targetCourseId)).thenReturn(mockStats);

        // ACT & ASSERT: Inyectamos explícitamente el principal simulado en la petición
        mockMvc.perform(get("/api/v1/stats/course/{courseId}", targetCourseId)
                .principal(mockPrincipal)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courseId").value(targetCourseId))
                .andExpect(jsonPath("$.averageGrade").value(8.75))
                .andExpect(jsonPath("$.localEnrollments").value(15))
                .andExpect(jsonPath("$.platform").value("Coursera"))
                .andExpect(jsonPath("$.category").value("Data Science"));
    }

    @Test
    @DisplayName("Debería retornar HTTP 404 cuando se solicitan estadísticas de un curso inexistente o sin datos analíticos")
    void shouldReturnNotFoundWhenCourseDoesNotExist() throws Exception {
        // ARRANGE
        Long nonExistentCourseId = 999L;

        // Simulamos de forma segura que el servicio devuelve nulo (comportamiento
        // inerte)
        when(userService.getCourseStats(nonExistentCourseId)).thenReturn(null);

        // ACT & ASSERT: Verificamos con MockMvc que el controlador responda con un 404
        // defensivo
        mockMvc.perform(get("/api/v1/stats/course/{courseId}", nonExistentCourseId)
                .principal(mockPrincipal)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

}
