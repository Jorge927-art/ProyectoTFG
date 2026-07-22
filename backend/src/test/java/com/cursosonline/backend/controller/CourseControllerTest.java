package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.RecommendationDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ResourceNotFoundException;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.services.RecommendationService;
import com.cursosonline.backend.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Suite de Pruebas Unitarias para CourseController")
class CourseControllerTest {

    private MockMvc mockMvc;

    @InjectMocks
    private CourseController courseController;

    @Mock
    private UserService userService;

    @Mock
    private RecommendationService recommendationService;

    private Principal mockPrincipal;
    private Users studentUser;
    private Courses sampleCourse;
    private Enrollment sampleEnrollment;

    @BeforeEach
    void setUp() {
        mockPrincipal = Mockito.mock(Principal.class);
        mockMvc = MockMvcBuilders.standaloneSetup(courseController).build();

        // Configuración Entidad Estudiante
        studentUser = new Users();
        studentUser.setUser_id(1L);
        studentUser.setUsername("mockUser");
        studentUser.setEmail("alumno@tfg.com");

        // Configuración Entidad Curso
        sampleCourse = new Courses();
        sampleCourse.setCourse_id(101L);
        sampleCourse.setTitle("Data Analysis Using Python");

        // Configuración Entidad Matrícula
        sampleEnrollment = new Enrollment();
        sampleEnrollment.setEnrollmentid(55L);
        sampleEnrollment.setUser(studentUser);
        sampleEnrollment.setCourse(sampleCourse);
        sampleEnrollment.setStatus("ACTIVE");
    }

    /*
     * =========================================================================
     * 1. ENDPOINT: GET /api/courses/search
     * =========================================================================
     */
    @Test
    @DisplayName("Debe retornar lista de cursos al buscar por palabra clave")
    void searchCatalog_ShouldReturnCoursesList() throws Exception {
        when(userService.searchCourses("data")).thenReturn(List.of(sampleCourse));

        mockMvc.perform(get("/api/courses/search")
                .param("keyword", "data")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].course_id").value(101))
                .andExpect(jsonPath("$[0].title").value("Data Analysis Using Python"));
    }

    /*
     * =========================================================================
     * 2. ENDPOINT: POST /api/courses/enroll/{courseId}
     * =========================================================================
     */
    @Test
    @DisplayName("Debe retornar 401 Unauthorized al matricularse sin sesión válida")
    void enrollInCourse_WithoutPrincipal_ShouldReturnUnauthorized() throws Exception {
        mockMvc.perform(post("/api/courses/enroll/101")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Sesión inválida o expirada."));
    }

    @Test
    @DisplayName("Debe procesar la matrícula de forma persistente y retornar 201 Created")
    void enrollInCourse_WithValidSession_ShouldReturnCreated() throws Exception {
        when(mockPrincipal.getName()).thenReturn("mockUser");
        when(userService.enrollStudentInCourse(anyString(), anyLong())).thenReturn(sampleEnrollment);

        mockMvc.perform(post("/api/courses/enroll/101")
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.enrollmentId").value(55))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(
                        jsonPath("$.message").value("Te has matriculado en el curso con éxito de forma persistente."));
    }

    /*
     * =========================================================================
     * 3. ENDPOINT: GET /api/courses/recommendations
     * =========================================================================
     */
    @Test
    @DisplayName("Debe retornar 401 Unauthorized al pedir recomendaciones sin sesión")
    void getSmartRecommendations_WithoutPrincipal_ShouldReturnUnauthorized() throws Exception {
        mockMvc.perform(get("/api/courses/recommendations")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Sesión inválida o expirada."));
    }

    @Test
    @DisplayName("Debe retornar 404 Not Found si el alumno no existe en el sistema")
    void getSmartRecommendations_UserNotFound_ShouldReturnNotFound() throws Exception {
        when(mockPrincipal.getName()).thenReturn("mockUser");
        when(userService.findByUsername("mockUser")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/courses/recommendations")
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Estudiante no registrado en el sistema."));
    }

    @Test
    @DisplayName("Debe retornar 200 OK con DTOs de recomendaciones personalizadas")
    void getSmartRecommendations_ValidUser_ShouldReturnRecommendations() throws Exception {
        when(mockPrincipal.getName()).thenReturn("mockUser");
        RecommendationDTO recommendation = new RecommendationDTO(
                202L,
                "Algoritmos Complejos",
                "Por asignar",
                "General",
                5.0,
                "Sugerencia personalizada",
                92);

        when(userService.findByUsername("mockUser")).thenReturn(Optional.of(studentUser));
        when(recommendationService.getRecommendationsForUser(1L)).thenReturn(List.of(recommendation));

        mockMvc.perform(get("/api/courses/recommendations")
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(202))
                .andExpect(jsonPath("$[0].title").value("Algoritmos Complejos"));
    }

    /*
     * =========================================================================
     * 4. ENDPOINT: POST /api/courses/{courseId}/assign-teacher
     * =========================================================================
     */
    @Test
    @DisplayName("Debe retornar 401 Unauthorized al asignar docente sin sesión")
    void assignTeacherToCourse_WithoutPrincipal_ShouldReturnUnauthorized() throws Exception {
        mockMvc.perform(post("/api/courses/101/assign-teacher")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Sesión inválida o expirada."));
    }

    @Test
    @DisplayName("Debe vincular relacionalmente el profesor con el curso y retornar 200 OK")
    void assignTeacherToCourse_ValidData_ShouldReturnOk() throws Exception {
        when(mockPrincipal.getName()).thenReturn("mockUser");
        // Simulamos el usuario asignado para evitar NullPointerException al construir
        // la respuesta del JSON
        Users teacherUser = new Users();
        teacherUser.setUser_id(2L);
        teacherUser.setUsername("profesor");
        teacherUser.setRole(Role.PROFESSOR);

        sampleCourse.setAssignedUser(teacherUser);

        when(userService.assignUserToCourse(anyString(), anyLong())).thenReturn(sampleCourse);

        mockMvc.perform(post("/api/courses/101/assign-teacher")
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courseId").value(101))
                .andExpect(jsonPath("$.title").value("Data Analysis Using Python"))
                .andExpect(jsonPath("$.message").value("El curso ha sido vinculado relacionalmente con éxito."));
    }

    @Test
    @DisplayName("Debe retornar 404 Not Found cuando el recurso no existe al asignar docente")
    void assignTeacherToCourse_ResourceNotFound_ShouldReturnNotFound() throws Exception {
        when(mockPrincipal.getName()).thenReturn("mockUser");
        when(userService.assignUserToCourse(anyString(), anyLong()))
                .thenThrow(new ResourceNotFoundException("Asignatura no encontrada."));

        mockMvc.perform(post("/api/courses/999/assign-teacher")
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Asignatura no encontrada."));
    }

    @Test
    @DisplayName("Debe retornar 400 Bad Request ante una excepción de lógica de negocio")
    void assignTeacherToCourse_ServicesException_ShouldReturnBadRequest() throws Exception {
        when(mockPrincipal.getName()).thenReturn("mockUser");
        when(userService.assignUserToCourse(anyString(), anyLong()))
                .thenThrow(new ServicesException("El curso ya posee un tutor asignado."));

        mockMvc.perform(post("/api/courses/101/assign-teacher")
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("El curso ya posee un tutor asignado."));
    }

    @Test
    @DisplayName("Debe retornar 500 Internal Server Error ante un fallo inesperado no controlado")
    void assignTeacherToCourse_GeneralException_ShouldReturnServerError() throws Exception {
        when(mockPrincipal.getName()).thenReturn("mockUser");
        when(userService.assignUserToCourse(anyString(), anyLong()))
                .thenThrow(new RuntimeException("Fallo crítico inesperado"));

        mockMvc.perform(post("/api/courses/101/assign-teacher")
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error")
                        .value("Ocurrió un error inesperado al procesar la vinculación relacional."));
    }
}
