package com.cursosonline.backend;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.services.UserService;

/**
 * Clase de pruebas unitarias para UserService. Utiliza Mockito para simular el
 * comportamiento de UserRepository, EnrollmentRepository y PasswordEncoder,
 * permitiendo probar la lógica de negocio de UserService de forma aislada.
 */
@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

        @Mock
        private UserRepository userRepository;

        @Mock
        private PasswordEncoder passwordEncoder;

        // [AÑADIDO PARA LA AUDITORÍA]: Mock del repositorio de matrículas requerida
        // para el Activity Tracker
        @Mock
        private EnrollmentRepository enrollmentRepository;

        @InjectMocks
        private UserService userService;

        /**
         * Prueba para el método findByUsername, verificando que retorne un usuario
         * cuando existe en el repositorio.
         */
        @Test
        void findByUsername_DebeRetornarUsuario_CuandoExiste() {
                String username = "Luis";
                Users expectedUser = new Users(1L, "Luis", "jki", Role.STUDENT, "jose.gmail.com", true,
                                new java.util.ArrayList<>());
                when(userRepository.findByUsername("Luis")).thenReturn(Optional.of(expectedUser));
                Optional<Users> result = userService.findByUsername(username);
                assertTrue(result.isPresent());
                assertEquals(username, result.get().getUsername());
        }

        /**
         * Prueba para el método registerUser, verificando que se registre un nuevo
         * usuario correctamente.
         */
        @Test
        void assignUser() {
                Users newUser = new Users(null, "Luis", "jki", Role.STUDENT, "jose.gmail.com", true,
                                new java.util.ArrayList<>());
                Users savedUser = new Users(1L, "Luis", "jki", Role.STUDENT, "jose.gmail.com", true,
                                new java.util.ArrayList<>());
                when(userRepository.findByUsername("Luis")).thenReturn(Optional.empty());
                when(passwordEncoder.encode("jki")).thenReturn("encoded_jki");
                when(userRepository.save(any())).thenReturn(savedUser);
                Users result = userService.registerUser(newUser);
                assertNotNull(newUser);
                assertEquals(1L, result.getUser_id());
                verify(userRepository).save(any());
                verify(passwordEncoder).encode("jki");
        }

        /**
         * Prueba para el método findByUsername, verificando que retorne un Optional
         * vacío cuando el usuario no existe.
         */
        @Test
        void findByUsername_ReturnEmpty() {
                String username_does_not_exist = "usuario_no_existe";
                when(userRepository.findByUsername(username_does_not_exist)).thenReturn(Optional.empty());
                Optional<Users> resultado = userService.findByUsername(username_does_not_exist);
                assertFalse(resultado.isPresent(), "El resultado debería ser un Optional vacío");
                assertTrue(resultado.isEmpty());
                verify(userRepository, times(1)).findByUsername(username_does_not_exist);
        }

        /**
         * Prueba para el método registerUser, verificando que se lance una excepción al
         * intentar registrar un usuario con un nombre de usuario que ya existe.
         */
        @Test
        void registerUser_DebeLanzarExcepcion_CuandoElNombreDeUsuarioYaExiste() {
                String username = "Luis";
                Users new_user = new Users(null, username, "frgt", Role.STUDENT, "jose.gmail.com", true,
                                new java.util.ArrayList<>());
                Users existing_user = new Users(1L, username, "frgt", Role.STUDENT, "jose.gmail.com", true,
                                new java.util.ArrayList<>());
                when(userRepository.findByUsername(username)).thenReturn(Optional.of(existing_user));
                RuntimeException excepcion = assertThrows(RuntimeException.class, () -> {
                        userService.registerUser(new_user);
                });
                assertTrue(excepcion.getMessage().contains(username));
                verify(userRepository, never()).save(any(Users.class));
        }

        // =========================================================================
        // NUEVOS TESTS DE AUDITORÍA: ACTIVITY TRACKER DE MATRÍCULAS Y PROGRESO [ADR-34]
        // =========================================================================

        @Test
        void debeIniciarElCronometroUnicaYExclusivamenteEnLaMatriculaSolicitadaConAislamientoTotal() {
                // Fijamos un reloj virtual estático para simular el paso del tiempo de forma
                // matemática determinista
                Clock fixedClock = Clock.fixed(Instant.parse("2026-01-01T12:00:00Z"), ZoneId.of("UTC"));
                userService.setClock(fixedClock);

                Users mockStudent = new Users(1L, "Luis", "jki", Role.STUDENT, "jose.gmail.com", true,
                                new java.util.ArrayList<>());

                Courses mockCourse1 = new Courses();
                mockCourse1.setCourse_id(10L);
                mockCourse1.setDuration(40.0f); // 40 horas totales

                Courses mockCourse2 = new Courses();
                mockCourse2.setCourse_id(20L);
                mockCourse2.setDuration(60.0f);

                Enrollment mockEnrollment1 = new Enrollment(1001L, mockStudent, mockCourse1, null, "EN_PROGRESO", 0,
                                null);
                Enrollment mockEnrollment2 = new Enrollment(1002L, mockStudent, mockCourse2, null, "EN_PROGRESO", 0,
                                null);

                // Simulamos que el repositorio encuentra la matrícula 1001 vinculada al
                // username "Luis"
                when(enrollmentRepository.findByEnrollmentidAndUserUsername(1001L, "Luis"))
                                .thenReturn(Optional.of(mockEnrollment1));

                // Ejecutamos la acción segura del servicio sobre la matrícula 1001
                userService.startCourseSecure(1001L, "Luis");

                // [VERIFICACIÓN CRÍTICA TFG]: Comprobamos que mutó a EN_CURSO y guardó la
                // estampa de tiempo
                assertNotNull(mockEnrollment1.getStarted_at(),
                                "El started_at de la matrícula 1 debería haberse registrado.");
                assertEquals("EN_CURSO", mockEnrollment1.getStatus());
                verify(enrollmentRepository, times(1)).save(mockEnrollment1);

                // [AISLAMIENTO DE DATOS]: Comprobamos de forma estricta que la matrícula 2 se
                // mantuvo inmutable
                assertNull(mockEnrollment2.getStarted_at(),
                                "La matrícula 2 jamás debió verse afectada de forma colateral.");
                assertEquals("EN_PROGRESO", mockEnrollment2.getStatus());
        }

        @Test
        void debeCalcularElProgresoAlVueloMatematicamenteYDeFormaAislada() {
                // Fijamos la fecha del sistema actual a las 12:00:00
                Clock fixedClockNow = Clock.fixed(Instant.parse("2026-01-01T12:00:00Z"), ZoneId.of("UTC"));
                userService.setClock(fixedClockNow);

                Users mockStudent = new Users(1L, "Luis", "jki", Role.STUDENT, "jose.gmail.com", true,
                                new java.util.ArrayList<>());
                Courses mockCourse = new Courses();
                mockCourse.setCourse_id(10L);
                mockCourse.setDuration(40.0f); // 40 horas totales

                // Inicializamos la matrícula simulando que fue iniciada exactamente hace 10
                // horas (a las 02:00:00)
                Clock fixedClockPast = Clock.fixed(Instant.parse("2026-01-01T02:00:00Z"), ZoneId.of("UTC"));
                Enrollment mockEnrollment = new Enrollment(1001L, mockStudent, mockCourse, null, "EN_CURSO", 0,
                                java.time.LocalDateTime.now(fixedClockPast));

                // Ejecutamos el cálculo matemático en frío
                int progresoCalculado = userService.calculateCurrentProgress(mockEnrollment);

                // 10 horas pasadas sobre 40 totales = 25% exacto de progreso académico en el
                // tiempo absoluto
                assertEquals(25, progresoCalculado,
                                "La fórmula matemática del cálculo de progreso transcurrido al vuelo falló.");
        }

        @Test
        void debeDetectarFalloEnElReadPathAlAdelantarElRelojTresDias() {
                // 1. CONFIGURACIÓN DEL ESCENARIO BASE DETERMINISTA
                // Fijamos el inicio del curso el 1 de Enero de 2026 a las 12:00:00 UTC
                Instant inicioInstant = Instant.parse("2026-01-01T12:00:00Z");
                Clock relojInicio = Clock.fixed(inicioInstant, ZoneId.of("UTC"));
                userService.setClock(relojInicio);

                // Instanciamos el estudiante "Luis" con ID físico 1L
                Users mockStudent = new Users(1L, "Luis", "jki", Role.STUDENT, "://gmail.com", true,
                                new java.util.ArrayList<>());

                // Instanciamos el curso de larga duración (2652.8 horas) de tu informe de
                // NotebookLM
                Courses mockCourse = new Courses();
                mockCourse.setCourse_id(50L);
                mockCourse.setDuration(2652.8f);

                // Fabricamos la matrícula en estado "EN_CURSO" guardando la estampa de inicio
                // real (2026-01-01T12:00:00)
                Enrollment mockEnrollment = new Enrollment(2001L, mockStudent, mockCourse,
                                java.time.LocalDateTime.now(relojInicio), "EN_CURSO", 0,
                                java.time.LocalDateTime.now(relojInicio));

                // Añadimos la matrícula a la lista simulada del estudiante
                java.util.List<Enrollment> listaMatriculasSimuladas = new java.util.ArrayList<>();
                listaMatriculasSimuladas.add(mockEnrollment);

                // Simulamos que el repositorio encuentra al usuario en base de datos
                when(userRepository.findByUsername("Luis")).thenReturn(Optional.of(mockStudent));

                // Simulamos que el método de lectura del Read Path devuelve la lista directa de
                // PostgreSQL
                when(enrollmentRepository.findAllByUserIdWithCourses(mockStudent.getUser_id()))
                                .thenReturn(listaMatriculasSimuladas);

                // 2. SIMULACIÓN DEL AVANCE TEMPORAL (ADELANTAMOS EL RELOJ 3 DÍAS EXACTOS / 72
                // HORAS)
                // Fijamos el reloj del sistema 3 días en el futuro (4 de Enero de 2026 a las
                // 12:00:00 UTC)
                Instant tresDiasDespuesInstant = Instant.parse("2026-01-04T12:00:00Z");
                Clock relojTresDiasDespues = Clock.fixed(tresDiasDespuesInstant, ZoneId.of("UTC"));
                userService.setClock(relojTresDiasDespues);

                // 3. EJECUCIÓN DEL READ PATH (SIMULAMOS LA LLAMADA QUE HACE TU ENDPOINT DEL
                // DASHBOARD)
                Users usuarioAutenticado = userRepository.findByUsername("Luis").get();
                java.util.List<Enrollment> resultadoCursosActivos = userService
                                .getStudentActiveCoursesWithCalculatedProgress(usuarioAutenticado.getUser_id());

                // 4. COMPROBACIÓN ACADÉMICA ESTRICTA (EL TEST QUE DESTAPARÁ EL PUNTO CIEGO)
                Enrollment matriculaLeida = resultadoCursosActivos.get(0);

                // Calculamos de forma matemática pura cuánto debería ser el progreso real al
                // vuelo (72h pasadas sobre 2652.8h totales)
                int progresoMatematicoEsperado = userService.calculateCurrentProgress(matriculaLeida);
                assertTrue(progresoMatematicoEsperado > 0,
                                "El progreso matemático real tras 3 días transcurridos debería ser superior a 0%.");

                // [PUNTO CIEGO AFIRMACIÓN]: Este assertion va a fallar (dará Rojo) demostrando
                // que los datos que viajan
                // desde el camino de lectura de PostgreSQL se quedan estancados en el 0%
                // original del objeto persistido.
                assertEquals(progresoMatematicoEsperado, matriculaLeida.getProgress_percentage(),
                                "FALLO EN EL READ PATH: Las matrículas se leen directo de la DB sin calcular el porcentaje dinámico al vuelo.");
        }

}
