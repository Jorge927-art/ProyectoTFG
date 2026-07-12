package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserProfileRepository; // ✅ Importación necesaria
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

        @Mock // ✅ Inyección del mock que faltaba para evitar el NullPointerException
        private UserProfileRepository userProfileRepository;

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

                // Entrenamos los mocks existentes
                when(userService.login("Luis", "secret123")).thenReturn(user);
                when(enrollmentRepository.findEnrolledCourseIdsByUserId(1L)).thenReturn(List.of(101L));

                // ✅ Evita el fallo simulando que el usuario aún no tiene un avatar guardado en
                // base de datos
                when(userProfileRepository.findById(1L)).thenReturn(Optional.empty());

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
        void loginDebeHidratarInteresesConListasVaciasSiServicioDevuelveNull() throws Exception {
                Users user = new Users(1L, "Luis", "encoded", Role.STUDENT, "luis@example.com", true,
                                new java.util.ArrayList<>());

                when(userService.login("Luis", "secret123")).thenReturn(user);
                when(enrollmentRepository.findEnrolledCourseIdsByUserId(1L)).thenReturn(List.of());
                when(userService.getUserInterests("Luis")).thenReturn(null);
                when(userProfileRepository.findById(1L)).thenReturn(Optional.empty());

                when(jwtService.generateAccessToken(user, 1L, "luis@example.com")).thenReturn("jwt-token");
                when(jwtService.extractExpiration("jwt-token")).thenReturn(Instant.now().plusSeconds(900));

                mockMvc.perform(post("/api/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"username\":\"Luis\",\"password\":\"secret123\"}"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.interests").exists())
                                .andExpect(jsonPath("$.interests.categories").isArray())
                                .andExpect(jsonPath("$.interests.levels").isArray())
                                .andExpect(jsonPath("$.interests.durations").isArray())
                                .andExpect(jsonPath("$.interests.languages").isArray())
                                .andExpect(jsonPath("$.interests.subtitles").isArray())
                                .andExpect(jsonPath("$.interests.categories[0]").doesNotExist())
                                .andExpect(jsonPath("$.interests.levels[0]").doesNotExist())
                                .andExpect(jsonPath("$.interests.durations[0]").doesNotExist())
                                .andExpect(jsonPath("$.interests.languages[0]").doesNotExist())
                                .andExpect(jsonPath("$.interests.subtitles[0]").doesNotExist());
        }

        @Test
        void loginDebeIncluirInteresesPobladosCuandoServicioDevuelvePreferencias() throws Exception {
                Users user = new Users(1L, "Luis", "encoded", Role.STUDENT, "luis@example.com", true,
                                new java.util.ArrayList<>());

                com.cursosonline.backend.dto.InterestDTO interestDTO = new com.cursosonline.backend.dto.InterestDTO(
                                List.of("Ciencia de Datos", "Negocios"),
                                List.of("Principiante / Básico"),
                                List.of("Medio (1 - 6 semanas)"),
                                List.of("Español"),
                                List.of("Subtítulos en Español"));

                when(userService.login("Luis", "secret123")).thenReturn(user);
                when(enrollmentRepository.findEnrolledCourseIdsByUserId(1L)).thenReturn(List.of(101L, 202L));
                when(userService.getUserInterests("Luis")).thenReturn(interestDTO);
                when(userProfileRepository.findById(1L)).thenReturn(Optional.empty());

                when(jwtService.generateAccessToken(user, 1L, "luis@example.com")).thenReturn("jwt-token");
                when(jwtService.extractExpiration("jwt-token")).thenReturn(Instant.now().plusSeconds(900));

                mockMvc.perform(post("/api/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"username\":\"Luis\",\"password\":\"secret123\"}"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.interests.categories[0]").value("Ciencia de Datos"))
                                .andExpect(jsonPath("$.interests.categories[1]").value("Negocios"))
                                .andExpect(jsonPath("$.interests.levels[0]").value("Principiante / Básico"))
                                .andExpect(jsonPath("$.interests.durations[0]").value("Medio (1 - 6 semanas)"))
                                .andExpect(jsonPath("$.interests.languages[0]").value("Español"))
                                .andExpect(jsonPath("$.interests.subtitles[0]").value("Subtítulos en Español"))
                                .andExpect(jsonPath("$.enrolledCourseIds[0]").value(101))
                                .andExpect(jsonPath("$.enrolledCourseIds[1]").value(202));
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

                // 2. CONFIGURACIÓN EN CADENA RIGUROSA
                when(userService.findByUsername("Luis")).thenReturn(Optional.of(user));
                when(userService.getStudentActiveCoursesWithCalculatedProgress(user.getUser_id()))
                                .thenReturn(List.of(enrollment));

                // 3. EJECUCIÓN Y VALIDACIÓN IMPLACABLE DEL CONTRATO HTTP
                mockMvc.perform(get("/api/auth/my-active-courses")
                                .param("username", "Luis"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].enrollmentid").value(77))
                                .andExpect(jsonPath("$[0].status").value("EN_PROGRESO"))
                                .andExpect(jsonPath("$[0].course.course_id").value(101))
                                .andExpect(jsonPath("$[0].course.title")
                                                .value("Introduction to Data Science Specialization"));
        }

        /**
         * Prueba de integración que valida la recuperación exitosa de alertas
         * académicas
         * siguiendo la configuración de contexto nativa y limpia de la suite de
         * pruebas.
         */
        @Test
        void debeRecuperarAlertasDelEstudianteAutenticadoConExito() throws Exception {
                // 1. Entrenamos el Mock de negocio simulando un escenario con las dos alertas
                // requeridas
                java.util.List<com.cursosonline.backend.dto.NotificationDTO> mockNotifications = List.of(
                                new com.cursosonline.backend.dto.NotificationDTO(
                                                "DOCUMENT_INBOX",
                                                "Bandeja de Entrada",
                                                "Tienes 1 documento(s) pendiente(s).",
                                                "/student/documents"),
                                new com.cursosonline.backend.dto.NotificationDTO(
                                                "COURSE_PROGRESS",
                                                "Asignatura por finalizar",
                                                "Tu curso está al 92%.",
                                                "/student/courses"));

                // Simulamos el comportamiento del principal inyectado pasándole el nombre de
                // Luis
                org.mockito.Mockito.when(userService.getUserNotifications("Luis"))
                                .thenReturn(mockNotifications);

                // 2. Creamos un objeto Principal simulado para inyectarlo directamente en la
                // petición HTTP
                java.security.Principal mockPrincipal = () -> "Luis";

                // 3. Ejecutamos la petición HTTP limpia de forma idéntica al resto de tests de
                // la clase
                mockMvc.perform(get("/api/auth/notifications")
                                .principal(mockPrincipal) // Inyectamos la identidad de Luis directamente
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON))
                                // ✅ VALIDACIONES DE CONTRATO HTTP
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(2)))
                                .andExpect(jsonPath("$[0].type").value("DOCUMENT_INBOX"))
                                .andExpect(jsonPath("$[1].type").value("COURSE_PROGRESS"));
        }
}
