package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.security.jwt.JwtService;
import com.cursosonline.backend.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private JwtService jwtService;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @InjectMocks
    private UserController userController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(userController).build();
    }

    @Test
    void loginDebeIncluirLasMatriculasDelUsuario() throws Exception {
        Users user = new Users(1L, "Luis", "encoded", Role.STUDENT, "luis@example.com", true,
                new java.util.ArrayList<>());
        when(userService.login("Luis", "secret123")).thenReturn(user);
        when(enrollmentRepository.findEnrolledCourseIdsByUserId(1L)).thenReturn(List.of(101L));
        when(jwtService.generateAccessToken(user, 1L, "luis@example.com")).thenReturn("jwt-token");
        when(jwtService.extractExpiration("jwt-token")).thenReturn(Instant.now().plusSeconds(900));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"Luis\",\"password\":\"secret123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("Luis"))
                .andExpect(jsonPath("$.enrolledCourseIds[0]").value(101));
    }

    @Test
    void myActiveCoursesDebeDevolverLaMatrículaConElCurso() throws Exception {
        // 1. ESCENARIO REAL CON LOS DATOS ORIGINALES DE LUIS
        Users user = new Users(1L, "Luis", "encoded", Role.STUDENT, "luis@example.com", true,
                new java.util.ArrayList<>());
        Courses course = new Courses();
        course.setCourse_id(101L);
        course.setTitle("Introduction to Data Science Specialization");
        course.setCategory("Data Science");
        course.setInstructors("John Doe");

        Enrollment enrollment = new Enrollment();
        enrollment.setEnrollmentid(77L);
        enrollment.setUser(user);
        enrollment.setCourse(course);
        enrollment.setStatus("EN_PROGRESO");
        enrollment.setProgress_percentage(25);

        // 2. CONFIGURACIÓN EN CADENA RIGUROSA (EMULA LOS PASOS REALES DEL CONTROLADOR
        // DE PRODUCCIÓN)
        // Paso A: El controlador busca el usuario por su nombre exacto
        when(userService.findByUsername("Luis")).thenReturn(Optional.of(user));
        // Paso B: El controlador invoca el servicio que calcula el progreso usando el
        // ID exacto de Luis
        when(userService.getStudentActiveCoursesWithCalculatedProgress(user.getUser_id()))
                .thenReturn(List.of(enrollment));

        // 3. EJECUCIÓN Y VALIDACIÓN IMPLACABLE DEL CONTRATO HTTP
        mockMvc.perform(get("/api/auth/my-active-courses")
                .param("username", "Luis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].enrollmentid").value(77))
                .andExpect(jsonPath("$[0].status").value("EN_PROGRESO"))
                .andExpect(jsonPath("$[0].course.course_id").value(101))
                .andExpect(jsonPath("$[0].course.title").value("Introduction to Data Science Specialization"));
    }

}