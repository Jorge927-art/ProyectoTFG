package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserProfileRepository;
import com.cursosonline.backend.security.jwt.JwtService;
import com.cursosonline.backend.services.RefreshTokenService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
        private RefreshTokenService refreshTokenService;

        @Mock
        private EnrollmentRepository enrollmentRepository;

        @Mock // ✅ Inyección del mock que faltaba para evitar el NullPointerException
        private UserProfileRepository userProfileRepository;

        @InjectMocks
        private UserController userController;

        private MockMvc mockMvc;

        @BeforeEach
        void setUp() {
                mockMvc = MockMvcBuilders.standaloneSetup(userController)
                                .setControllerAdvice(new com.cursosonline.backend.exception.GlobalExceptionHandler())
                                .build();
        }

        @Test
        void loginDebeIncluirLasMatriculasDelUsuario() throws Exception {
                Users user = new Users(1L, "Luis", "encoded", Role.STUDENT, "luis@example.com", true,
                                new java.util.ArrayList<>());

                // Entrenamos los mocks existentes
                when(userService.login("Luis", "secret123")).thenReturn(user);
                when(enrollmentRepository.findEnrolledCourseIdsByUserId(1L)).thenReturn(List.of(101L));

                // Evita el fallo simulando que el usuario aún no tiene un avatar guardado en
                // base de datos
                when(userProfileRepository.findById(1L)).thenReturn(Optional.empty());

                when(jwtService.generateAccessToken(user, 1L, "luis@example.com")).thenReturn("jwt-token");
                when(refreshTokenService.issueRefreshToken(user)).thenReturn("refresh-token");
                when(jwtService.extractExpiration("jwt-token")).thenReturn(Instant.now().plusSeconds(900));

                mockMvc.perform(post("/api/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"username\":\"Luis\",\"password\":\"secret123\"}"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.username").value("Luis"))
                                .andExpect(jsonPath("$.enrolledCourseIds[0]").value(101))
                                .andExpect(result -> org.junit.jupiter.api.Assertions.assertTrue(
                                                result.getResponse().getHeader("Set-Cookie").contains("HttpOnly")));
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
                when(refreshTokenService.issueRefreshToken(user)).thenReturn("refresh-token");
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
                when(refreshTokenService.issueRefreshToken(user)).thenReturn("refresh-token");
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
                                .andExpect(jsonPath("$.enrolledCourseIds[1]").value(202))
                                .andExpect(result -> org.junit.jupiter.api.Assertions.assertTrue(
                                                result.getResponse().getHeader("Set-Cookie").contains("HttpOnly")));
        }

        @Test
        void refreshDebeRetornarNuevosTokensCuandoRefreshTokenEsValido() throws Exception {
                when(refreshTokenService.rotate("refresh-viejo")).thenReturn(
                                new com.cursosonline.backend.dto.RefreshTokenResponse(
                                                "access-nuevo",
                                                "refresh-nuevo",
                                                "Bearer",
                                                900L));

                mockMvc.perform(post("/api/auth/refresh")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"refreshToken\":\"refresh-viejo\"}"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.accessToken").value("access-nuevo"))
                                .andExpect(result -> org.junit.jupiter.api.Assertions.assertTrue(
                                                result.getResponse().getHeader("Set-Cookie").contains("refresh-nuevo")))
                                .andExpect(jsonPath("$.tokenType").value("Bearer"));
        }

        @Test
        void refreshDebeRetornar401CuandoElTokenNoEsValido() throws Exception {
                when(refreshTokenService.rotate("refresh-invalido"))
                                .thenThrow(new com.cursosonline.backend.exception.ServicesException(
                                                "Refresh token inválido o expirado."));

                mockMvc.perform(post("/api/auth/refresh")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"refreshToken\":\"refresh-invalido\"}"))
                                .andExpect(status().isUnauthorized())
                                .andExpect(jsonPath("$.error").value("Refresh token inválido o expirado."));
        }

        @Test
        void logoutDebeRevoCarRefreshTokenYResponderOk() throws Exception {
                doNothing().when(refreshTokenService).revokeIfPresent("refresh-vigente");

                mockMvc.perform(post("/api/auth/logout")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"refreshToken\":\"refresh-vigente\"}"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true));

                verify(refreshTokenService).revokeIfPresent("refresh-vigente");
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

        @Test
        void myActiveCoursesDebePriorizarUsernameExplicitoAunqueExistaPrincipal() throws Exception {
                Users explicitUser = new Users(10L, "Carlos", "encoded", Role.STUDENT, "carlos@example.com", true,
                                new java.util.ArrayList<>());
                Courses course = new Courses();
                course.setCourse_id(501L);
                course.setTitle("Arquitectura de Software");

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(999L);
                enrollment.setUser(explicitUser);
                enrollment.setCourse(course);
                enrollment.setStatus("EN_PROGRESO");
                enrollment.setProgress_percentage(42);

                when(userService.findByUsername("Carlos")).thenReturn(Optional.of(explicitUser));
                when(userService.getStudentActiveCoursesWithCalculatedProgress(10L)).thenReturn(List.of(enrollment));

                java.security.Principal mismatchedPrincipal = () -> "otro_usuario";

                mockMvc.perform(get("/api/auth/my-active-courses")
                                .principal(mismatchedPrincipal)
                                .param("username", "Carlos"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].enrollmentid").value(999))
                                .andExpect(jsonPath("$[0].course.course_id").value(501))
                                .andExpect(jsonPath("$[0].course.title").value("Arquitectura de Software"));
        }

        @Test
        void myActiveCoursesDebeUsarFallbackPorUserIdExplicitoSiTokenYUsernameNoResuelven() throws Exception {
                Users user = new Users(77L, "carlos_student", "encoded", Role.STUDENT, "carlos@example.com", true,
                                new java.util.ArrayList<>());
                Courses course = new Courses();
                course.setCourse_id(321L);
                course.setTitle("Programación Funcional Aplicada");

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(1234L);
                enrollment.setUser(user);
                enrollment.setCourse(course);
                enrollment.setStatus("EN_PROGRESO");
                enrollment.setProgress_percentage(11);

                when(userService.getStudentActiveCoursesWithCalculatedProgress(77L)).thenReturn(List.of(enrollment));

                java.security.Principal mismatchedPrincipal = () -> "otro_usuario";

                mockMvc.perform(get("/api/auth/my-active-courses")
                                .principal(mismatchedPrincipal)
                                .param("userId", "77"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].enrollmentid").value(1234))
                                .andExpect(jsonPath("$[0].course.course_id").value(321))
                                .andExpect(jsonPath("$[0].course.title").value("Programación Funcional Aplicada"));
        }

        @Test
        void myActiveCoursesDebeResolverElUserIdDesdeElHeaderAuthorization() throws Exception {
                Users user = new Users(88L, "header_user", "encoded", Role.STUDENT, "header@example.com", true,
                                new java.util.ArrayList<>());
                Courses course = new Courses();
                course.setCourse_id(777L);
                course.setTitle("Curso desde header");

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(4444L);
                enrollment.setUser(user);
                enrollment.setCourse(course);
                enrollment.setStatus("EN_PROGRESO");
                enrollment.setProgress_percentage(33);

                when(jwtService.extractUserId("token-header")).thenReturn(88L);
                when(userService.getStudentActiveCoursesWithCalculatedProgress(88L)).thenReturn(List.of(enrollment));

                mockMvc.perform(get("/api/auth/my-active-courses")
                                .header("Authorization", "Bearer token-header"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].enrollmentid").value(4444))
                                .andExpect(jsonPath("$[0].course.course_id").value(777))
                                .andExpect(jsonPath("$[0].course.title").value("Curso desde header"));
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

        @Test
        void dismissNotificationsDebeMarcarNotificacionesComoVistasConPrincipalValido() throws Exception {
                java.security.Principal mockPrincipal = () -> "Luis";

                mockMvc.perform(patch("/api/auth/notifications/dismiss")
                                .principal(mockPrincipal)
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true));

                verify(userService).dismissUserNotifications("Luis");
        }

        @Test
        void dismissNotificationsDebeDevolver401SiNoHayPrincipal() throws Exception {
                mockMvc.perform(patch("/api/auth/notifications/dismiss")
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON))
                                .andExpect(status().isUnauthorized())
                                .andExpect(jsonPath("$.error").value("Sesión inválida o expirada."));
        }

        @Test
        void getNotificationsDebeDevolver401SiNoHayPrincipal() throws Exception {
                mockMvc.perform(get("/api/auth/notifications")
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON))
                                .andExpect(status().isUnauthorized());
        }

        @Test
        void deleteUserPermanentlyDebeRetornarOkCuandoElAdminEliminaAOtroUsuario() throws Exception {
                java.security.Principal mockPrincipal = () -> "root_admin";

                doNothing().when(userService).deleteUserPermanently("laura_student", "root_admin");

                mockMvc.perform(delete("/api/auth/users/laura_student/permanent")
                                .principal(mockPrincipal))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.message")
                                                .value("El usuario 'laura_student' ha sido eliminado permanentemente de PostgreSQL."));

                verify(userService, times(1)).deleteUserPermanently("laura_student", "root_admin");
        }

        @Test
        void deleteUserPermanentlyDebeRetornar401CuandoNoHayPrincipal() throws Exception {
                mockMvc.perform(delete("/api/auth/users/laura_student/permanent"))
                                .andExpect(status().isUnauthorized());

                verify(userService, never()).deleteUserPermanently(anyString(), anyString());
        }

        @Test
        void deleteUserPermanentlyDebePropagarErrorDeNegocioComoRespuestaControlada() throws Exception {
                java.security.Principal mockPrincipal = () -> "root_admin";

                doThrow(new com.cursosonline.backend.exception.ServicesException(
                                "Acción denegada: no puedes eliminarte permanentemente a ti mismo."))
                                .when(userService).deleteUserPermanently("root_admin", "root_admin");

                mockMvc.perform(delete("/api/auth/users/root_admin/permanent")
                                .principal(mockPrincipal))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.status").value(400))
                                .andExpect(jsonPath("$.message").value(
                                                "Acción denegada: no puedes eliminarte permanentemente a ti mismo."));
        }

        @Test
        void getStudentInterestsDebeRetornar401CuandoNoHayPrincipal() throws Exception {
                mockMvc.perform(get("/api/auth/my-interests"))
                                .andExpect(status().isUnauthorized())
                                .andExpect(jsonPath("$.error").value("Sesión inválida o expirada."));
        }

        @Test
        void meDebeRetornar401CuandoNoHayPrincipal() throws Exception {
                mockMvc.perform(get("/api/auth/me"))
                                .andExpect(status().isUnauthorized())
                                .andExpect(jsonPath("$.error").value("Sesión inválida o expirada."));
        }

        @Test
        void saveStudentInterestsDebeRetornar401CuandoNoHayPrincipal() throws Exception {
                mockMvc.perform(post("/api/auth/my-interests")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                                .andExpect(status().isUnauthorized())
                                .andExpect(jsonPath("$.error").value("Sesión inválida o expirada."));
        }

        @Test
        void changeUserRoleByAdminDebeRechazarRoleVacio() throws Exception {
                java.security.Principal mockPrincipal = () -> "root_admin";

                mockMvc.perform(patch("/api/auth/users/luis/role")
                                .principal(mockPrincipal)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"role\":\"   \"}"))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.message").value("El campo 'role' es requerido"));
        }

        @Test
        void changeUserRoleByAdminDebeRechazarRolInvalido() throws Exception {
                java.security.Principal mockPrincipal = () -> "root_admin";

                mockMvc.perform(patch("/api/auth/users/luis/role")
                                .principal(mockPrincipal)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"role\":\"MAESTRO\"}"))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.message").value(
                                                "Rol inválido. Opciones válidas: STUDENT, PROFESSOR, ADMIN"));
        }

        @Test
        void deleteUserByAdminDebeRechazarAutoEliminacionDelAdmin() throws Exception {
                java.security.Principal mockPrincipal = () -> "root_admin";

                mockMvc.perform(delete("/api/auth/users/root_admin")
                                .principal(mockPrincipal))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.error").value(
                                                "Acción denegada: No puedes modificar tu propia cuenta de administrador."));
        }

        @Test
        void refreshDebeRetornar401CuandoElRefreshTokenEsNulo() throws Exception {
                when(refreshTokenService.rotate(null))
                                .thenThrow(new com.cursosonline.backend.exception.ServicesException(
                                                "Refresh token inválido o expirado."));

                mockMvc.perform(post("/api/auth/refresh")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                                .andExpect(status().isUnauthorized())
                                .andExpect(jsonPath("$.error").value("Refresh token inválido o expirado."));
        }

        @Test
        void startCourseDebeRetornar401CuandoNoHayPrincipal() throws Exception {
                mockMvc.perform(post("/api/auth/enrollment/77/start"))
                                .andExpect(status().isUnauthorized())
                                .andExpect(jsonPath("$.error").value("Sesión inválida o expirada."));
        }

        @Test
        void startCourseDebeDelegarAlServicioCuandoHayPrincipalValido() throws Exception {
                java.security.Principal mockPrincipal = () -> "Luis";

                mockMvc.perform(post("/api/auth/enrollment/77/start")
                                .principal(mockPrincipal))
                                .andExpect(status().isOk());

                verify(userService).startCourseSecure(77L, "Luis");
        }

        @Test
        void getMyActiveCoursesDebeRetornar400CuandoNoHayIdentidad() throws Exception {
                mockMvc.perform(get("/api/auth/my-active-courses"))
                                .andExpect(status().isBadRequest());
        }

        @Test
        void getMyActiveCoursesDebeUsarElPrincipalComoFallbackCuandoNoHayOtrosIdentificadores() throws Exception {
                Users user = new Users(66L, "principal_user", "encoded", Role.STUDENT, "principal@example.com", true,
                                new java.util.ArrayList<>());
                Courses course = new Courses();
                course.setCourse_id(999L);
                course.setTitle("Curso por principal");

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(5555L);
                enrollment.setUser(user);
                enrollment.setCourse(course);
                enrollment.setStatus("EN_PROGRESO");
                enrollment.setProgress_percentage(12);

                java.security.Principal principal = () -> "principal_user";

                when(userService.findByUsername("principal_user")).thenReturn(Optional.of(user));
                when(userService.getStudentActiveCoursesWithCalculatedProgress(66L)).thenReturn(List.of(enrollment));

                mockMvc.perform(get("/api/auth/my-active-courses")
                                .principal(principal))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].enrollmentid").value(5555))
                                .andExpect(jsonPath("$[0].course.course_id").value(999));
        }

        @Test
        void registerDebeCrearAlumnoYResponderPayloadMinimo() throws Exception {
                Users saved = new Users(501L, "nuevo_alumno", "encoded", Role.STUDENT, "nuevo@demo.com", true,
                                new java.util.ArrayList<>());
                when(userService.registerUser(org.mockito.ArgumentMatchers.any(Users.class))).thenReturn(saved);

                mockMvc.perform(post("/api/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{" +
                                                "\"username\":\"nuevo_alumno\"," +
                                                "\"password\":\"secret123\"," +
                                                "\"email\":\"nuevo@demo.com\"" +
                                                "}"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.userId").value(501))
                                .andExpect(jsonPath("$.username").value("nuevo_alumno"))
                                .andExpect(jsonPath("$.role").value("STUDENT"));
        }

        @Test
        void meDebeDevolverPerfilCuandoHayPrincipalValido() throws Exception {
                Users user = new Users(601L, "perfil_user", "enc", Role.STUDENT, "perfil@demo.com", true,
                                new java.util.ArrayList<>());
                java.security.Principal principal = () -> "perfil_user";

                when(userService.findByUsername("perfil_user")).thenReturn(Optional.of(user));

                mockMvc.perform(get("/api/auth/me").principal(principal))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.userId").value(601))
                                .andExpect(jsonPath("$.username").value("perfil_user"))
                                .andExpect(jsonPath("$.email").value("perfil@demo.com"))
                                .andExpect(jsonPath("$.enabled").value(true));
        }

        @Test
        void getStudentInterestsDebeRetornarInteresesCuandoHayPrincipal() throws Exception {
                java.security.Principal principal = () -> "Luis";
                com.cursosonline.backend.dto.InterestDTO dto = new com.cursosonline.backend.dto.InterestDTO(
                                List.of("Data"),
                                List.of("Básico"),
                                List.of("Corto"),
                                List.of("Español"),
                                List.of("ES"));

                when(userService.getUserInterests("Luis")).thenReturn(dto);

                mockMvc.perform(get("/api/auth/my-interests").principal(principal))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.categories[0]").value("Data"));
        }

        @Test
        void saveStudentInterestsDebePersistirCuandoHayPrincipal() throws Exception {
                java.security.Principal principal = () -> "Luis";

                mockMvc.perform(post("/api/auth/my-interests")
                                .principal(principal)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{" +
                                                "\"categories\":[\"Data\"]," +
                                                "\"levels\":[\"Básico\"]," +
                                                "\"durations\":[\"Corto\"]," +
                                                "\"languages\":[\"Español\"]," +
                                                "\"subtitles\":[\"ES\"]" +
                                                "}"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true));

                verify(userService).saveUserInterests(org.mockito.ArgumentMatchers.eq("Luis"),
                                org.mockito.ArgumentMatchers.any(com.cursosonline.backend.dto.InterestDTO.class));
        }

        @Test
        void logoutDebeAceptarBodyNuloYRevocarSinToken() throws Exception {
                mockMvc.perform(post("/api/auth/logout"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true));

                verify(refreshTokenService).revokeIfPresent(null);
        }

        @Test
        void listAllUsersDebeMapearRespuestaAdministrativa() throws Exception {
                Users u1 = new Users(701L, "u1", "enc", Role.STUDENT, "u1@demo.com", true,
                                new java.util.ArrayList<>());
                Users u2 = new Users(702L, "u2", "enc", null, "u2@demo.com", false,
                                new java.util.ArrayList<>());

                when(userService.getAllUsers()).thenReturn(List.of(u1, u2));

                mockMvc.perform(get("/api/auth"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].userId").value(701))
                                .andExpect(jsonPath("$[0].role").value("STUDENT"))
                                .andExpect(jsonPath("$[1].userId").value(702))
                                .andExpect(jsonPath("$[1].enabled").value(false));
        }

        @Test
        void deleteUserByAdminDebeRetornar401SiNoHayPrincipalValido() throws Exception {
                mockMvc.perform(delete("/api/auth/users/alumno_x"))
                                .andExpect(status().isUnauthorized())
                                .andExpect(jsonPath("$.error").value("Sesión inválida o expirada."));

                verify(userService, never()).deleteByUsername(anyString());
        }

        @Test
        void deleteUserByAdminDebeRetornarOkCuandoAplicaBajaLogica() throws Exception {
                Users disabledUser = new Users(801L, "alumno_x", "enc", Role.STUDENT, "ax@demo.com", false,
                                new java.util.ArrayList<>());
                when(userService.deleteByUsername("alumno_x")).thenReturn(disabledUser);

                java.security.Principal principal = () -> "root_admin";
                mockMvc.perform(delete("/api/auth/users/alumno_x").principal(principal))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.enabled").value(false));
        }
}
