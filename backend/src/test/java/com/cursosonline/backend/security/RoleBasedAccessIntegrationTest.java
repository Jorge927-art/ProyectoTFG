package com.cursosonline.backend.security;

import com.cursosonline.backend.repository.CourseGradeRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.security.jwt.JwtService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.context.bean.override.mockito.MockitoBean; // O org.springframework.boot.test.mock.mockito.MockBean según Spring Boot
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DisplayName("Filtro de Seguridad RBAC - Test de Integración de Penetración Perimetral")
public class RoleBasedAccessIntegrationTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext context;

    @MockitoBean
    private EnrollmentRepository enrollmentRepository;

    @MockitoBean
    private CourseGradeRepository courseGradeRepository;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private JwtService jwtService;

    private UserDetails studentUserDetails;
    private UserDetails professorUserDetails;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
        studentUserDetails = new User(
                "student_tfg_2026",
                "protected_password",
                Collections.singletonList(new SimpleGrantedAuthority("STUDENT")));

        professorUserDetails = new User(
                "teacher_tfg_2026",
                "protected_password",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_PROFESSOR")));
    }

    // --- BLOQUE 1: CASOS DE INTENTOS DE VIOLACIÓN DE ACCESO DE ESTUDIANTE (ALUMNO
    // ATTACK) ---
    @Test
    @DisplayName("Debe denegar el acceso con 403 Forbidden cuando un alumno intenta consultar el rendimiento de un curso")
    void shouldReturn403ForbiddenWhenStudentAttemptsToGetPerformance() throws Exception {
        // Ejecución simulada de petición GET interceptada por la directiva de seguridad
        // del controlador
        mockMvc.perform(get("/api/v1/teacher/evaluations/courses/42/management/students")
                .with(user(studentUserDetails)) // Inyección de la identidad autenticada con rol STUDENT
                .contentType(MediaType.APPLICATION_JSON))
                // ASERCIÓN CRÍTICA DE SEGURIDAD: Spring Security debe bloquear la intrusión
                // antes de tocar el controlador
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Debe denegar el acceso con 403 Forbidden cuando un alumno intenta consultar las métricas analíticas del curso")
    void shouldReturn403ForbiddenWhenStudentAttemptsToGetMetrics() throws Exception {
        mockMvc.perform(get("/api/v1/teacher/evaluations/courses/42/management/metrics")
                .with(user(studentUserDetails))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Debe denegar el acceso con 403 Forbidden cuando un alumno intenta emitir el envío de una calificación")
    void shouldReturn403ForbiddenWhenStudentAttemptsToSubmitGrade() throws Exception {
        String fakeGradePayload = """
                    {
                        "enrollmentId": 101,
                        "title": "Intrusión de Trabajo Escrito",
                        "score": "10.0"
                    }
                """;

        mockMvc.perform(post("/api/v1/teacher/evaluations/submit")
                .with(user(studentUserDetails))
                .content(fakeGradePayload)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    // --- BLOQUE 2: COMPROBACIÓN DE ACCESO EXITOSO CON EL ROL DOCENTE AUTORIZADO
    // ---
    @Test
    @DisplayName("Debe permitir el acceso con 200 OK cuando un profesor autorizado consulta las métricas del curso")
    void shouldAllowAccessWhenUserHasProfessorRole() throws Exception {
        // Ejecución simulada de petición GET por parte de la identidad válida del
        // docente
        mockMvc.perform(get("/api/v1/teacher/evaluations/courses/42/management/metrics")
                .with(user(professorUserDetails)) // Inyección de autoridad ROLE_PROFESSOR
                .contentType(MediaType.APPLICATION_JSON))
                // ASERCIÓN DE INTEGRACIÓN: El filtro debe autorizar el paso, devolviendo un
                // estado HTTP exitoso
                .andExpect(status().isOk());
    }
}
