package com.cursosonline.backend.services;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import java.util.List;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

import com.cursosonline.backend.dto.InterestDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.DocumentMetadata;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.UserSystemNotification;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ResourceNotFoundException;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.repository.CourseGradeRepository;

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

        @Mock
        private EnrollmentRepository enrollmentRepository;

        @Mock
        private CourseGradeRepository courseGradeRepository;

        @Mock
        private com.cursosonline.backend.repository.InterestRepository interestRepository;

        @Mock
        private com.cursosonline.backend.repository.CoursesRepository coursesRepository;

        @Mock
        private com.cursosonline.backend.repository.DocumentMetadataRepository documentMetadataRepository;

        @Mock
        private JdbcTemplate jdbcTemplate;

        @Mock
        private AdminCourseCatalogService adminCourseCatalogService;

        @Mock
        private com.cursosonline.backend.repository.AcademicEvaluationRepository academicEvaluationRepository;

        @Mock
        private com.cursosonline.backend.repository.UserProfileRepository userProfileRepository;

        @Mock
        private com.cursosonline.backend.repository.UserSystemNotificationRepository userSystemNotificationRepository;

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
        void deleteUserPermanently_DebeRechazarAutoEliminacion() {
                Users user = new Users(1L, "Luis", "jki", Role.STUDENT, "jose.gmail.com", true,
                                new java.util.ArrayList<>());
                user.setUsername("Luis");

                when(userRepository.findByUsername("Luis")).thenReturn(Optional.of(user));

                ServicesException exception = assertThrows(ServicesException.class,
                                () -> userService.deleteUserPermanently("Luis", "Luis"));

                assertTrue(exception.getMessage().contains("Acción denegada"));
                verify(userRepository, never()).delete(any(Users.class));
        }

        @Test
        void deleteUserPermanently_DebeRechazarCuentaProtegida() {
                ReflectionTestUtils.setField(userService, "protectedUsername", "admin_cole");

                Users protectedUser = new Users(2L, "admin_cole", "enc", Role.ADMIN, "admin@example.com", true,
                                new java.util.ArrayList<>());

                when(userRepository.findByUsername("admin_cole")).thenReturn(Optional.of(protectedUser));

                ServicesException exception = assertThrows(ServicesException.class,
                                () -> userService.deleteUserPermanently("admin_cole", "otro_admin"));

                assertTrue(exception.getMessage().contains("protegida"));
                verify(userRepository, never()).delete(any(Users.class));
        }

        @Test
        void getUserNotifications_DebeAgregarAlertasDeDocumentoSistemaYProgreso() {
                Users student = new Users(20L, "student_alerts", "enc", Role.STUDENT, "student_alerts@example.com",
                                true, new java.util.ArrayList<>());
                student.setRole(Role.STUDENT);

                DocumentMetadata unreadDoc = new DocumentMetadata();
                unreadDoc.setRead(false);

                UserSystemNotification systemNotification = new UserSystemNotification();
                systemNotification.setType("SYSTEM_ALERT");
                systemNotification.setTitle("Nueva función");
                systemNotification.setMessage("Explora la nueva funcionalidad");
                systemNotification.setRedirectUrl("/student");

                Courses course = new Courses();
                course.setCourse_id(200L);
                course.setTitle("Curso de progreso");
                course.setDuration(1.0f);

                Enrollment enrollment = new Enrollment();
                enrollment.setCourse(course);
                enrollment.setStarted_at(
                                LocalDateTime.ofInstant(Instant.parse("2024-01-01T00:00:00Z"), ZoneId.of("UTC")));
                enrollment.setProgress_percentage(0);

                when(userRepository.findByUsername("student_alerts")).thenReturn(Optional.of(student));
                when(documentMetadataRepository.findUnreadReceivedDocumentsByUsername("student_alerts"))
                                .thenReturn(List.of(unreadDoc));
                when(userSystemNotificationRepository.findUnreadByUsername("student_alerts"))
                                .thenReturn(List.of(systemNotification));
                when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(2);
                when(enrollmentRepository.findAllByUserIdWithCourses(20L)).thenReturn(List.of(enrollment));

                userService.setClock(Clock.fixed(Instant.parse("2024-01-01T00:57:00Z"), ZoneId.of("UTC")));

                List<com.cursosonline.backend.dto.NotificationDTO> alerts = userService
                                .getUserNotifications("student_alerts");

                assertEquals(3, alerts.size());
                assertTrue(alerts.stream().anyMatch(alert -> "DOCUMENT_INBOX".equals(alert.type())));
                assertTrue(alerts.stream().anyMatch(alert -> "SYSTEM_ALERT".equals(alert.type())));
                assertTrue(alerts.stream().anyMatch(alert -> "COURSE_PROGRESS".equals(alert.type())));
        }

        @Test
        void dismissUserNotifications_DebeAplicarFallbackYMarcarAckCuandoLasAlertasLleganAlUmbral() {
                Users student = new Users(21L, "student_ack", "enc", Role.STUDENT, "student_ack@example.com", true,
                                new java.util.ArrayList<>());

                DocumentMetadata unreadDoc = new DocumentMetadata();
                unreadDoc.setRead(false);

                Courses course = new Courses();
                course.setCourse_id(201L);
                course.setTitle("Curso de ack");
                course.setDuration(1.0f);

                Enrollment enrollment = new Enrollment();
                enrollment.setCourse(course);
                enrollment.setStarted_at(
                                LocalDateTime.ofInstant(Instant.parse("2024-01-01T00:00:00Z"), ZoneId.of("UTC")));
                enrollment.setProgress_percentage(0);

                when(userRepository.findByUsername("student_ack")).thenReturn(Optional.of(student));
                when(documentMetadataRepository.markAllReceivedAsRead("student_ack"))
                                .thenThrow(new RuntimeException("bulk-failure"));
                when(documentMetadataRepository.findUnreadReceivedDocumentsByUsername("student_ack"))
                                .thenReturn(List.of(unreadDoc));
                when(documentMetadataRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
                when(userSystemNotificationRepository.markAllAsReadByUsername("student_ack")).thenReturn(1);
                when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(2);
                when(enrollmentRepository.findAllByUserIdWithCourses(21L)).thenReturn(List.of(enrollment));

                userService.setClock(Clock.fixed(Instant.parse("2024-01-01T00:57:00Z"), ZoneId.of("UTC")));

                userService.dismissUserNotifications("student_ack");

                assertTrue(unreadDoc.isRead());
                verify(documentMetadataRepository).saveAll(anyList());
                verify(enrollmentRepository).save(enrollment);
                verify(userSystemNotificationRepository).markAllAsReadByUsername("student_ack");
        }

        @Test
        void deleteByUsername_DebeAlternarEstadoEnabled() {
                Users user = new Users(1L, "Luis", "jki", Role.STUDENT, "jose.gmail.com", true,
                                new java.util.ArrayList<>());
                user.setFailedLoginAttempts(2);
                when(userRepository.findByUsername("Luis")).thenReturn(Optional.of(user));
                when(userRepository.saveAndFlush(any(Users.class))).thenAnswer(invocation -> invocation.getArgument(0));

                Users firstResult = userService.deleteByUsername("Luis");
                assertFalse(firstResult.isEnabled());

                Users secondResult = userService.deleteByUsername("Luis");
                assertTrue(secondResult.isEnabled());
                assertEquals(0, secondResult.getFailedLoginAttempts());
        }

        @Test
        void findByUsername_ReturnEmpty() {
                String username_does_not_exist = "usuario_no_existe";
                when(userRepository.findByUsername(username_does_not_exist)).thenReturn(Optional.empty());
                Optional<Users> resultado = userService.findByUsername(username_does_not_exist);
                assertFalse(resultado.isPresent(), "El resultado debería ser un Optional vacío");
                assertTrue(resultado.isEmpty());
                verify(userRepository, times(1)).findByUsername(username_does_not_exist);
        }

        @Test
        void findByUsername_DebeResolverCoincidenciaCaseInsensitiveYEmailFallback() {
                Users caseUser = new Users(2L, "Luis", "enc", Role.STUDENT, "luis@demo.com", true,
                                new java.util.ArrayList<>());
                Users emailUser = new Users(3L, "correo", "enc", Role.STUDENT, "correo@demo.com", true,
                                new java.util.ArrayList<>());

                when(userRepository.findByUsername("Luis")).thenReturn(Optional.empty());
                when(userRepository.findByUsernameIgnoreCase("Luis")).thenReturn(Optional.of(caseUser));

                Optional<Users> caseResult = userService.findByUsername("Luis");
                assertTrue(caseResult.isPresent());
                assertEquals(2L, caseResult.get().getUser_id());

                when(userRepository.findByUsername("correo@demo.com")).thenReturn(Optional.empty());
                when(userRepository.findByUsernameIgnoreCase("correo@demo.com")).thenReturn(Optional.empty());
                when(userRepository.findByEmailIgnoreCase("correo@demo.com")).thenReturn(Optional.of(emailUser));

                Optional<Users> emailResult = userService.findByUsername("correo@demo.com");
                assertTrue(emailResult.isPresent());
                assertEquals(3L, emailResult.get().getUser_id());
        }

        @Test
        void login_DebeRechazarUsuarioNoEncontrado() {
                when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

                ServicesException ex = assertThrows(ServicesException.class, () -> userService.login("ghost", "pw"));

                assertTrue(ex.getMessage().contains("Usuario no encontrado"));
        }

        @Test
        void login_DebeRechazarCuentaDeshabilitada() {
                Users disabledUser = new Users(4L, "disabled", "enc", Role.STUDENT, "d@demo.com", false,
                                new java.util.ArrayList<>());
                when(userRepository.findByUsername("disabled")).thenReturn(Optional.of(disabledUser));

                ServicesException ex = assertThrows(ServicesException.class, () -> userService.login("disabled", "pw"));

                assertTrue(ex.getMessage().contains("Acceso denegado"));
        }

        @Test
        void login_DebeRechazarPasswordIncorrecta() {
                Users user = new Users(5L, "luis", "encoded", Role.STUDENT, "luis@demo.com", true,
                                new java.util.ArrayList<>());
                user.setFailedLoginAttempts(0);
                when(userRepository.findByUsername("luis")).thenReturn(Optional.of(user));
                when(passwordEncoder.matches("wrong", "encoded")).thenReturn(false);
                when(userRepository.saveAndFlush(any(Users.class))).thenAnswer(invocation -> invocation.getArgument(0));

                ServicesException ex = assertThrows(ServicesException.class, () -> userService.login("luis", "wrong"));

                assertEquals("Contraseña incorrecta. Quedan 2 intentos", ex.getMessage());
                assertEquals(1, user.getFailedLoginAttempts());
                verify(userRepository).saveAndFlush(user);
        }

        @Test
        void login_DebeAvisarUltimoIntentoEnSegundoFallo() {
                Users user = new Users(51L, "luis2", "encoded", Role.STUDENT, "luis2@demo.com", true,
                                new java.util.ArrayList<>());
                user.setFailedLoginAttempts(1);
                when(userRepository.findByUsername("luis2")).thenReturn(Optional.of(user));
                when(passwordEncoder.matches("wrong", "encoded")).thenReturn(false);
                when(userRepository.saveAndFlush(any(Users.class))).thenAnswer(invocation -> invocation.getArgument(0));

                ServicesException ex = assertThrows(ServicesException.class, () -> userService.login("luis2", "wrong"));

                assertEquals("Contraseña incorrecta. Queda 1 intento", ex.getMessage());
                assertEquals(2, user.getFailedLoginAttempts());
                verify(userRepository).saveAndFlush(user);
        }

        @Test
        void login_DebeBloquearUsuarioEnTercerFallo() {
                Users user = new Users(52L, "luis3", "encoded", Role.STUDENT, "luis3@demo.com", true,
                                new java.util.ArrayList<>());
                user.setFailedLoginAttempts(2);
                when(userRepository.findByUsername("luis3")).thenReturn(Optional.of(user));
                when(passwordEncoder.matches("wrong", "encoded")).thenReturn(false);
                when(userRepository.saveAndFlush(any(Users.class))).thenAnswer(invocation -> invocation.getArgument(0));

                ServicesException ex = assertThrows(ServicesException.class, () -> userService.login("luis3", "wrong"));

                assertEquals("Usuario bloqueado. Póngase en contacto con el administrador", ex.getMessage());
                assertFalse(user.isEnabled());
                assertEquals(3, user.getFailedLoginAttempts());
                verify(userRepository).saveAndFlush(user);
        }

        @Test
        void login_DebeResetearIntentosTrasAutenticacionCorrecta() {
                Users user = new Users(53L, "luis4", "encoded", Role.STUDENT, "luis4@demo.com", true,
                                new java.util.ArrayList<>());
                user.setFailedLoginAttempts(2);
                when(userRepository.findByUsername("luis4")).thenReturn(Optional.of(user));
                when(passwordEncoder.matches("correct", "encoded")).thenReturn(true);
                when(userRepository.saveAndFlush(any(Users.class))).thenAnswer(invocation -> invocation.getArgument(0));

                Users loggedUser = userService.login("luis4", "correct");

                assertEquals("luis4", loggedUser.getUsername());
                assertEquals(0, user.getFailedLoginAttempts());
                verify(userRepository).saveAndFlush(user);
        }

        @Test
        void updateUserRole_DebeActualizarElRolYPersistirCambio() {
                Users user = new Users(6L, "teacher", "enc", Role.STUDENT, "teacher@demo.com", true,
                                new java.util.ArrayList<>());
                when(userRepository.findByUsername("teacher")).thenReturn(Optional.of(user));
                when(userRepository.save(any(Users.class))).thenAnswer(invocation -> invocation.getArgument(0));

                Users updated = userService.updateUserRole("teacher", Role.PROFESSOR);

                assertEquals(Role.PROFESSOR, updated.getRole());
                verify(userRepository).save(user);
        }

        @Test
        void saveUserInterests_DebeCrearRegistroNuevoCuandoNoExiste() {
                Users user = new Users(7L, "nuevo", "enc", Role.STUDENT, "nuevo@demo.com", true,
                                new java.util.ArrayList<>());
                InterestDTO dto = new InterestDTO(List.of("Datos"), List.of("Básico"), List.of("1 semana"),
                                List.of("Español"), List.of("Subtítulos"));

                when(userRepository.findByUsername("nuevo")).thenReturn(Optional.of(user));
                when(interestRepository.findById(7L)).thenReturn(Optional.empty());
                when(interestRepository.save(any(com.cursosonline.backend.entities.Interest.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));
                when(interestRepository.saveAndFlush(any(com.cursosonline.backend.entities.Interest.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                userService.saveUserInterests("nuevo", dto);

                verify(interestRepository).save(any(com.cursosonline.backend.entities.Interest.class));
                verify(interestRepository).saveAndFlush(any(com.cursosonline.backend.entities.Interest.class));
        }

        @Test
        void startCourseSecure_DebeNoGuardarSiLaMatriculaYaHabiaSidoIniciada() {
                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(77L);
                enrollment.setStarted_at(LocalDateTime.now());

                when(enrollmentRepository.findByEnrollmentidAndUserUsername(77L, "Luis"))
                                .thenReturn(Optional.of(enrollment));

                userService.startCourseSecure(77L, "Luis");

                verify(enrollmentRepository, never()).save(any(Enrollment.class));
        }

        @Test
        void startCourseSecure_DebeGuardarInicioYEstadoCuandoLaMatriculaNoHabiaSidoIniciada() {
                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(78L);
                enrollment.setStarted_at(null);
                enrollment.setStatus("PENDIENTE");

                when(enrollmentRepository.findByEnrollmentidAndUserUsername(78L, "Luis"))
                                .thenReturn(Optional.of(enrollment));
                when(enrollmentRepository.save(any(Enrollment.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                userService.startCourseSecure(78L, "Luis");

                assertNotNull(enrollment.getStarted_at());
                assertEquals("EN_CURSO", enrollment.getStatus());
                verify(enrollmentRepository).save(enrollment);
        }

        @Test
        void enrollStudentInCourse_DebeRechazarMatriculaDuplicadaSinPersistir() {
                Users student = new Users(11L, "student_dup", "enc", Role.STUDENT, "dup@example.com", true,
                                new java.util.ArrayList<>());
                Courses course = new Courses();
                course.setCourse_id(55L);

                when(userRepository.findByUsername("student_dup")).thenReturn(Optional.of(student));
                when(coursesRepository.findById(55L)).thenReturn(Optional.of(course));
                when(enrollmentRepository.findByUserIdAndCourseId(11L, 55L))
                                .thenReturn(Optional.of(new Enrollment()));

                ServicesException ex = assertThrows(ServicesException.class,
                                () -> userService.enrollStudentInCourse("student_dup", 55L));

                assertTrue(ex.getMessage().contains("Ya te encuentras matriculado"));
                verify(enrollmentRepository, never()).saveAndFlush(any(Enrollment.class));
                verify(adminCourseCatalogService, never()).markCourseAsEverUsed(anyLong());
        }

        @Test
        void assignUserToCourse_DebeRechazarUsuariosNoProfesores() {
                Users student = new Users(12L, "student_assign", "enc", Role.STUDENT, "assign@example.com", true,
                                new java.util.ArrayList<>());

                when(userRepository.findByUsername("student_assign")).thenReturn(Optional.of(student));

                ServicesException ex = assertThrows(ServicesException.class,
                                () -> userService.assignUserToCourse("student_assign", 77L));

                assertTrue(ex.getMessage().contains("solo las cuentas PROFESSOR"));
                verify(coursesRepository, never()).findById(anyLong());
        }

        @Test
        void assignUserToCourse_DebeRechazarCursosYaAsignados() {
                Users professor = new Users(13L, "prof_assign", "enc", Role.PROFESSOR, "prof@example.com", true,
                                new java.util.ArrayList<>());
                Courses course = new Courses();
                course.setCourse_id(78L);
                course.setAssignedUser(new Users(99L, "other", "enc", Role.PROFESSOR, "other@example.com", true,
                                new java.util.ArrayList<>()));

                when(userRepository.findByUsername("prof_assign")).thenReturn(Optional.of(professor));
                when(coursesRepository.findById(78L)).thenReturn(Optional.of(course));

                ServicesException ex = assertThrows(ServicesException.class,
                                () -> userService.assignUserToCourse("prof_assign", 78L));

                assertTrue(ex.getMessage().contains("gestionado por Administración"));
                verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
        }

        @Test
        void assignUserToCourse_DebeAsignarCursoCorrectamente() {
                Users professor = new Users(14L, "prof_ok", "enc", Role.PROFESSOR, "prof_ok@example.com", true,
                                new java.util.ArrayList<>());
                Courses course = new Courses();
                course.setCourse_id(79L);
                course.setAssignedUser(null);
                course.setInstructors("Por asignar");

                when(userRepository.findByUsername("prof_ok")).thenReturn(Optional.of(professor));
                when(coursesRepository.findById(79L)).thenReturn(Optional.of(course));
                when(coursesRepository.saveAndFlush(any(Courses.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                Courses savedCourse = userService.assignUserToCourse("prof_ok", 79L);

                assertSame(course, savedCourse);
                assertEquals(professor, course.getAssignedUser());
                assertEquals("prof_ok", course.getInstructors());
                verify(coursesRepository).saveAndFlush(course);
                verify(adminCourseCatalogService).markCourseAsEverUsed(79L);
        }

        @Test
        void assignUserToCourse_DebeRechazarCursosConInstructorHeredado() {
                Users professor = new Users(15L, "prof_legacy", "enc", Role.PROFESSOR, "prof_legacy@example.com", true,
                                new java.util.ArrayList<>());
                Courses course = new Courses();
                course.setCourse_id(80L);
                course.setAssignedUser(null);
                course.setInstructors("Instructor legado");

                when(userRepository.findByUsername("prof_legacy")).thenReturn(Optional.of(professor));
                when(coursesRepository.findById(80L)).thenReturn(Optional.of(course));

                ServicesException ex = assertThrows(ServicesException.class,
                                () -> userService.assignUserToCourse("prof_legacy", 80L));

                assertTrue(ex.getMessage().contains("instructor heredado"));
                verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
                verify(adminCourseCatalogService, never()).markCourseAsEverUsed(anyLong());
        }

        @Test
        void calculateCurrentProgress_DebeAcotarElProgresoEntreCeroYCien() {
                Clock fixedClockNow = Clock.fixed(Instant.parse("2026-01-01T12:00:00Z"), ZoneId.of("UTC"));
                userService.setClock(fixedClockNow);

                Users user = new Users(8L, "Luis", "pwd", Role.STUDENT, "luis@example.com", true,
                                new java.util.ArrayList<>());
                Courses course = new Courses();
                course.setCourse_id(88L);
                course.setDuration(1.0f);

                Clock fixedClockStart = Clock.fixed(Instant.parse("2026-01-01T10:00:00Z"), ZoneId.of("UTC"));
                Enrollment enrollment = new Enrollment(1005L, user, course, null, "EN_CURSO", 0,
                                java.time.LocalDateTime.now(fixedClockStart));

                int progress = userService.calculateCurrentProgress(enrollment);

                assertEquals(100, progress);
        }

        @Test
        void getStudentActiveCoursesWithCalculatedProgress_DebeIgnorarMatriculasSinIdYDejarNotasVacias() {
                Users user = new Users(9L, "student", "pwd", Role.STUDENT, "student@example.com", true,
                                new java.util.ArrayList<>());
                Courses course = new Courses();
                course.setCourse_id(90L);
                course.setDuration(1.0f);

                Enrollment validEnrollment = new Enrollment();
                validEnrollment.setEnrollmentid(900L);
                validEnrollment.setUser(user);
                validEnrollment.setCourse(course);
                validEnrollment.setStarted_at(LocalDateTime.of(2026, 1, 1, 11, 30));
                userService.setClock(Clock.fixed(Instant.parse("2026-01-01T12:00:00Z"), ZoneId.of("UTC")));

                Enrollment invalidEnrollment = new Enrollment();
                invalidEnrollment.setEnrollmentid(null);
                invalidEnrollment.setUser(user);
                invalidEnrollment.setCourse(course);

                when(enrollmentRepository.findAllByUserIdWithCourses(9L))
                                .thenReturn(List.of(validEnrollment, invalidEnrollment));
                when(courseGradeRepository.findAllByEnrollmentIdsOrderByGradeIdAsc(List.of(900L)))
                                .thenReturn(List.of());

                List<Enrollment> result = userService.getStudentActiveCoursesWithCalculatedProgress(9L);

                assertEquals(2, result.size());
                assertEquals(50, result.get(0).getProgress_percentage());
                assertNotNull(result.get(0).getGrades());
                assertTrue(result.get(0).getGrades().isEmpty());
        }

        @Test
        void getAssignedCoursesForProfessor_DebeRetornarSoloAsignacionesRelacionales() {
                Users professor = new Users(30L, "Juan Pérez", "enc", Role.PROFESSOR, "juan.perez@academy.edu", true,
                                new java.util.ArrayList<>());

                when(userRepository.findByUsername("Juan Pérez")).thenReturn(Optional.of(professor));

                Courses directCourse = new Courses();
                directCourse.setCourse_id(400L);
                directCourse.setTitle("Curso directo");
                when(coursesRepository.findAllByAssignedUser_UserIdOrderByTitleAsc(30L))
                                .thenReturn(List.of(directCourse));

                List<Courses> result = userService.getAssignedCoursesForProfessor("Juan Pérez");

                assertEquals(1, result.size());
                assertEquals(400L, result.get(0).getCourse_id());
                verify(coursesRepository).findAllByAssignedUser_UserIdOrderByTitleAsc(30L);
        }

        @Test
        void getUserNotifications_DebeIgnorarAlertasDeProgresoSiElProfesorNoTieneCursosAsignados() {
                Users professor = new Users(10L, "profesor", "pwd", Role.PROFESSOR, "profe@example.com", true,
                                new java.util.ArrayList<>());
                when(userRepository.findByUsername("profesor")).thenReturn(Optional.of(professor));
                when(documentMetadataRepository.findUnreadReceivedDocumentsByUsername("profesor"))
                                .thenReturn(List.of());
                when(userSystemNotificationRepository.findUnreadByUsername("profesor")).thenReturn(List.of());
                when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(2);
                when(coursesRepository.findAllByAssignedUser_UserIdOrderByTitleAsc(10L)).thenReturn(List.of());

                List<com.cursosonline.backend.dto.NotificationDTO> alerts = userService
                                .getUserNotifications("profesor");

                assertTrue(alerts.isEmpty());
        }

        @Test
        void getUserNotifications_DebeAgregarAlertaDeProgresoParaEstudianteAl95Porciento() {
                Clock fixedClockNow = Clock.fixed(Instant.parse("2026-01-01T12:00:00Z"), ZoneId.of("UTC"));
                userService.setClock(fixedClockNow);

                Users student = new Users(40L, "student_95", "pwd", Role.STUDENT, "student@example.com", true,
                                new java.util.ArrayList<>());
                Courses course = new Courses();
                course.setCourse_id(500L);
                course.setTitle("Curso crítico");
                course.setDuration(1.0f);

                Enrollment enrollment = new Enrollment();
                enrollment.setCourse(course);
                enrollment.setProgressAlertStudentAck(false);
                Clock fixedClockStart = Clock.fixed(Instant.parse("2026-01-01T11:03:00Z"), ZoneId.of("UTC"));
                enrollment.setStarted_at(LocalDateTime.now(fixedClockStart));

                when(userRepository.findByUsername("student_95")).thenReturn(Optional.of(student));
                when(documentMetadataRepository.findUnreadReceivedDocumentsByUsername("student_95"))
                                .thenReturn(List.of());
                when(userSystemNotificationRepository.findUnreadByUsername("student_95")).thenReturn(List.of());
                when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(2);
                when(enrollmentRepository.findAllByUserIdWithCourses(40L)).thenReturn(List.of(enrollment));

                List<com.cursosonline.backend.dto.NotificationDTO> alerts = userService
                                .getUserNotifications("student_95");

                assertEquals(1, alerts.size());
                assertEquals("COURSE_PROGRESS", alerts.get(0).type());
        }

        @Test
        void getUserNotifications_DebeSeguirConLasAlertasDeDocumentoYSistemaCuandoLasAlertasDeProgresoFallan() {
                Users student = new Users(44L, "student_progress_failure", "pwd", Role.STUDENT,
                                "student_progress_failure@example.com", true, new java.util.ArrayList<>());

                com.cursosonline.backend.entities.DocumentMetadata unreadDoc = new com.cursosonline.backend.entities.DocumentMetadata();
                unreadDoc.setRead(false);

                com.cursosonline.backend.entities.UserSystemNotification systemNotification = new com.cursosonline.backend.entities.UserSystemNotification();
                systemNotification.setType("SYSTEM_ALERT");
                systemNotification.setTitle("Aviso del sistema");
                systemNotification.setMessage("Hay una incidencia");
                systemNotification.setRedirectUrl("/student");

                when(userRepository.findByUsername("student_progress_failure")).thenReturn(Optional.of(student));
                when(documentMetadataRepository.findUnreadReceivedDocumentsByUsername("student_progress_failure"))
                                .thenReturn(List.of(unreadDoc));
                when(userSystemNotificationRepository.findUnreadByUsername("student_progress_failure"))
                                .thenReturn(List.of(systemNotification));
                when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(2);
                when(enrollmentRepository.findAllByUserIdWithCourses(44L))
                                .thenThrow(new RuntimeException("boom-progress"));

                List<com.cursosonline.backend.dto.NotificationDTO> alerts = userService
                                .getUserNotifications("student_progress_failure");

                assertEquals(2, alerts.size());
                assertTrue(alerts.stream().anyMatch(alert -> "DOCUMENT_INBOX".equals(alert.type())));
                assertTrue(alerts.stream().anyMatch(alert -> "SYSTEM_ALERT".equals(alert.type())));
        }

        @Test
        void dismissUserNotifications_DebeHacerFallbackPorEntidadSiElBulkUpdateFalla() {
                Users user = new Users(11L, "alumno", "pwd", Role.STUDENT, "alumno@example.com", true,
                                new java.util.ArrayList<>());
                com.cursosonline.backend.entities.DocumentMetadata unreadDoc = new com.cursosonline.backend.entities.DocumentMetadata();
                unreadDoc.setRead(false);

                when(userRepository.findByUsername("alumno")).thenReturn(Optional.of(user));
                doThrow(new RuntimeException("bulk-fail"))
                                .when(documentMetadataRepository).markAllReceivedAsRead("alumno");
                when(documentMetadataRepository.findUnreadReceivedDocumentsByUsername("alumno"))
                                .thenReturn(List.of(unreadDoc));
                when(documentMetadataRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
                when(userSystemNotificationRepository.markAllAsReadByUsername("alumno")).thenReturn(1);
                when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(0);

                userService.dismissUserNotifications("alumno");

                assertTrue(unreadDoc.isRead());
                verify(documentMetadataRepository).saveAll(List.of(unreadDoc));
        }

        @Test
        void dismissUserNotifications_DebeIgnorarErroDeAckDeProgresoYSeguirMarcandoNotificaciones() {
                Users student = new Users(45L, "student_ack_failure", "pwd", Role.STUDENT,
                                "student_ack_failure@example.com", true, new java.util.ArrayList<>());

                when(userRepository.findByUsername("student_ack_failure")).thenReturn(Optional.of(student));
                doThrow(new RuntimeException("ack-progress-fail"))
                                .when(documentMetadataRepository)
                                .markAllReceivedAsRead("student_ack_failure");
                when(documentMetadataRepository.findUnreadReceivedDocumentsByUsername("student_ack_failure"))
                                .thenReturn(List.of());
                when(userSystemNotificationRepository.markAllAsReadByUsername("student_ack_failure")).thenReturn(1);
                when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(2);

                assertDoesNotThrow(() -> userService.dismissUserNotifications("student_ack_failure"));
                verify(userSystemNotificationRepository).markAllAsReadByUsername("student_ack_failure");
        }

        @Test
        void getUserNotifications_DebeRetornarListaVaciaCuandoElUsuarioNoExiste() {
                when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

                List<com.cursosonline.backend.dto.NotificationDTO> alerts = userService.getUserNotifications("ghost");

                assertTrue(alerts.isEmpty());
                verify(documentMetadataRepository, never()).findUnreadReceivedDocumentsByUsername(anyString());
                verify(userSystemNotificationRepository, never()).findUnreadByUsername(anyString());
        }

        @Test
        void dismissUserNotifications_DebeIgnorarUsuarioInexistenteSinLanzarExcepcion() {
                when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

                assertDoesNotThrow(() -> userService.dismissUserNotifications("ghost"));
                verify(documentMetadataRepository).markAllReceivedAsRead("ghost");
                verify(userSystemNotificationRepository).markAllAsReadByUsername("ghost");
        }

        @Test
        void getUserNotifications_DebeOmitirAlertasDeProgresoCuandoElEsquemaNoEstaDisponible() {
                Users student = new Users(41L, "student_schema", "pwd", Role.STUDENT, "schema@example.com", true,
                                new java.util.ArrayList<>());

                when(userRepository.findByUsername("student_schema")).thenReturn(Optional.of(student));
                when(documentMetadataRepository.findUnreadReceivedDocumentsByUsername("student_schema"))
                                .thenReturn(List.of());
                when(userSystemNotificationRepository.findUnreadByUsername("student_schema")).thenReturn(List.of());
                when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class)))
                                .thenThrow(new RuntimeException("schema-down"));

                List<com.cursosonline.backend.dto.NotificationDTO> alerts = userService
                                .getUserNotifications("student_schema");

                assertTrue(alerts.isEmpty());
        }

        @Test
        void dismissUserNotifications_DebeMarcarAckDeProfesorCuandoLaAlertaEstaCercaDelUmbral() {
                Users professor = new Users(42L, "prof_ack", "enc", Role.PROFESSOR, "prof_ack@example.com", true,
                                new java.util.ArrayList<>());
                Users student = new Users(43L, "student_prof", "enc", Role.STUDENT, "student_prof@example.com", true,
                                new java.util.ArrayList<>());

                Courses course = new Courses();
                course.setCourse_id(601L);
                course.setTitle("Curso de profesor");
                course.setDuration(1.0f);

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(701L);
                enrollment.setUser(student);
                enrollment.setCourse(course);
                enrollment.setProgressAlertProfessorAck(false);
                enrollment.setStarted_at(LocalDateTime.of(2026, 1, 1, 11, 6));

                when(userRepository.findByUsername("prof_ack")).thenReturn(Optional.of(professor));
                when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(2);
                when(coursesRepository.findAllByAssignedUser_UserIdOrderByTitleAsc(42L)).thenReturn(List.of(course));
                when(enrollmentRepository.findActiveStudentEnrollmentsByCourseIds(List.of(601L)))
                                .thenReturn(List.of(enrollment));
                userService.setClock(Clock.fixed(Instant.parse("2026-01-01T12:00:00Z"), ZoneId.of("UTC")));

                userService.dismissUserNotifications("prof_ack");

                assertTrue(enrollment.isProgressAlertProfessorAck());
                verify(enrollmentRepository).save(enrollment);
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
                when(courseGradeRepository.findAllByEnrollmentIdsOrderByGradeIdAsc(List.of(2001L)))
                                .thenReturn(List.of());

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

        // =========================================================================
        // NUEVOS TESTS DE AUDITORÍA: VALIDACIÓN DE INTERESES EN LOGIN Y REGISTRO
        // (MÉTODO REAL)
        // =========================================================================

        @Test
        void login_DebeVerificarFielmenteLasCredencialesYRetornarUsuario_CuandoElLoginEsExitoso() {
                // 1. Configuración del escenario base para el Alumno Luis
                String username = "Luis";
                Users mockUser = new Users(1L, username, "encoded_pwd", Role.STUDENT, "luis@gmail.com", true,
                                new java.util.ArrayList<>());

                // Sincronizamos los mocks según el flujo real de tu método login()
                when(userRepository.findByUsername(username)).thenReturn(Optional.of(mockUser));
                when(passwordEncoder.matches("pwd_valida", "encoded_pwd")).thenReturn(true);

                // 2. Ejecución de la acción real expuesta en tu capa de servicio
                Users result = userService.login(username, "pwd_valida");

                // 3. Verificaciones asertivas del contrato de negocio
                assertNotNull(result, "El usuario retornado tras el login no puede ser nulo.");
                assertEquals(username, result.getUsername());
                assertTrue(result.isEnabled(), "La cuenta debe estar activa para superar el login.");

                verify(userRepository, times(1)).findByUsername(username);
                verify(passwordEncoder, times(1)).matches("pwd_valida", "encoded_pwd");
        }

        @Test
        void getUserInterests_DebeMitigarError500RetornandoColeccionesVacias_CuandoElUsuarioCareceDeIntereses() {
                // 1. Configuración del escenario límite: Un alumno nuevo sin registro en la
                // tabla de intereses
                String username = "NuevoAlumno";
                Users mockUser = new Users(2L, username, "encoded_pwd", Role.STUDENT, "nuevo@gmail.com", true,
                                new java.util.ArrayList<>());

                when(userRepository.findByUsername(username)).thenReturn(Optional.of(mockUser));

                // REGLA MOCKITO CRÍTICA: Simulamos que la tabla de intereses responde un
                // Optional vacío (no se encuentra fila)
                when(interestRepository.findById(2L)).thenReturn(Optional.empty());

                // 2. Ejecución del flujo crítico de hidratación que preocupaba a NotebookLM
                com.cursosonline.backend.dto.InterestDTO resultInterests = userService.getUserInterests(username);

                // 3. Verificación estricta de la mitigación de nulos y el ADR-31
                assertNotNull(resultInterests, "MITIGACIÓN DE ERRORES: El DTO de intereses jamás debe retornar nulo.");

                verify(userRepository, times(1)).findByUsername(username);
                verify(interestRepository, times(1)).findById(2L);
        }

        @Test
        void calculateCurrentProgress_DebeRetornarCero_CuandoEnrollmentEsNulo() {
                assertEquals(0, userService.calculateCurrentProgress(null));
        }

        @Test
        void calculateCurrentProgress_DebeReflejarAvanceEnCursosCortosAntesDeUnaHoraCompleta() {
                Clock fixedClockNow = Clock.fixed(Instant.parse("2026-01-01T12:00:00Z"), ZoneId.of("UTC"));
                userService.setClock(fixedClockNow);

                Users user = new Users(1L, "Luis", "pwd", Role.STUDENT, "luis@example.com", true,
                                new java.util.ArrayList<>());
                Courses shortCourse = new Courses();
                shortCourse.setCourse_id(99L);
                shortCourse.setDuration(1.0f); // 1 hora

                Clock fixedClockStart = Clock.fixed(Instant.parse("2026-01-01T11:30:00Z"), ZoneId.of("UTC"));
                Enrollment enrollment = new Enrollment(1004L, user, shortCourse, null, "EN_CURSO", 0,
                                java.time.LocalDateTime.now(fixedClockStart));

                int progress = userService.calculateCurrentProgress(enrollment);

                assertEquals(50, progress);
        }

        @Test
        void calculateCurrentProgress_DebeRetornarCero_CuandoCursoODuracionNoEstanDisponibles() {
                Users user = new Users(1L, "Luis", "pwd", Role.STUDENT, "luis@example.com", true,
                                new java.util.ArrayList<>());

                Enrollment sinCurso = new Enrollment(1001L, user, null, null, "EN_CURSO", 0,
                                java.time.LocalDateTime.now());
                assertEquals(0, userService.calculateCurrentProgress(sinCurso));

                Courses cursoSinDuracion = new Courses();
                cursoSinDuracion.setCourse_id(11L);
                cursoSinDuracion.setDuration(null);
                Enrollment sinDuracion = new Enrollment(1002L, user, cursoSinDuracion, null, "EN_CURSO", 0,
                                java.time.LocalDateTime.now());
                assertEquals(0, userService.calculateCurrentProgress(sinDuracion));

                Courses cursoDuracionCero = new Courses();
                cursoDuracionCero.setCourse_id(12L);
                cursoDuracionCero.setDuration(0f);
                Enrollment duracionNoValida = new Enrollment(1003L, user, cursoDuracionCero, null, "EN_CURSO", 0,
                                java.time.LocalDateTime.now());
                assertEquals(0, userService.calculateCurrentProgress(duracionNoValida));
        }

        @Test
        void getUserNotifications_DebeDevolverAlertaDeDocumentos_AunSinColumnasDeProgreso() {
                Users admin = new Users(9L, "admin_verif", "pwd", Role.ADMIN, "admin@example.com", true,
                                new java.util.ArrayList<>());

                when(userRepository.findByUsername("admin_verif")).thenReturn(Optional.of(admin));
                when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(1);

                com.cursosonline.backend.entities.DocumentMetadata doc = mock(
                                com.cursosonline.backend.entities.DocumentMetadata.class);
                when(documentMetadataRepository.findUnreadReceivedDocumentsByUsername("admin_verif"))
                                .thenReturn(java.util.List.of(doc));

                java.util.List<com.cursosonline.backend.dto.NotificationDTO> alerts = userService
                                .getUserNotifications("admin_verif");

                assertEquals(1, alerts.size());
                assertEquals("DOCUMENT_INBOX", alerts.get(0).type());
                assertEquals("/admin", alerts.get(0).redirectUrl());
        }

        @Test
        void getUserNotifications_DebeIncluirNotificacionesDeSistemaNoLeidas() {
                Users professor = new Users(12L, "profesor_alertado", "pwd", Role.PROFESSOR, "profe@example.com", true,
                                new java.util.ArrayList<>());

                when(userRepository.findByUsername("profesor_alertado")).thenReturn(Optional.of(professor));
                when(documentMetadataRepository.findUnreadReceivedDocumentsByUsername("profesor_alertado"))
                                .thenReturn(java.util.List.of());
                when(userSystemNotificationRepository.findUnreadByUsername("profesor_alertado"))
                                .thenReturn(java.util.List.of(buildSystemNotification(
                                                professor,
                                                "Cambio de titularidad",
                                                "Has sido desvinculado de una asignatura.",
                                                false)));
                when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(0);

                java.util.List<com.cursosonline.backend.dto.NotificationDTO> alerts = userService
                                .getUserNotifications("profesor_alertado");

                assertEquals(1, alerts.size());
                assertEquals("COURSE_ASSIGNMENT_CHANGE", alerts.get(0).type());
                assertEquals("Cambio de titularidad", alerts.get(0).title());
                assertEquals("/professor", alerts.get(0).redirectUrl());
        }

        @Test
        void dismissUserNotifications_DebeAplicarFallbackSiFallaBulkUpdate() {
                Users student = new Users(1L, "Luis", "pwd", Role.STUDENT, "luis@example.com", true,
                                new java.util.ArrayList<>());

                when(userRepository.findByUsername("Luis")).thenReturn(Optional.of(student));
                doThrow(new RuntimeException("bulk failed"))
                                .when(documentMetadataRepository)
                                .markAllReceivedAsRead("Luis");

                com.cursosonline.backend.entities.DocumentMetadata doc1 = mock(
                                com.cursosonline.backend.entities.DocumentMetadata.class);
                com.cursosonline.backend.entities.DocumentMetadata doc2 = mock(
                                com.cursosonline.backend.entities.DocumentMetadata.class);
                when(documentMetadataRepository.findUnreadReceivedDocumentsByUsername("Luis"))
                                .thenReturn(java.util.List.of(doc1, doc2));

                when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(0);

                userService.dismissUserNotifications("Luis");

                verify(documentMetadataRepository).markAllReceivedAsRead("Luis");
                verify(documentMetadataRepository).findUnreadReceivedDocumentsByUsername("Luis");
                verify(doc1).setRead(true);
                verify(doc2).setRead(true);
                verify(documentMetadataRepository).saveAll(anyList());
                verify(userSystemNotificationRepository).markAllAsReadByUsername("Luis");
        }

        @Test
        void dismissUserNotifications_DebeMarcarAckDeProgresoParaProfesorAl90Porciento() {
                Clock fixedClockNow = Clock.fixed(Instant.parse("2026-01-01T12:00:00Z"), ZoneId.of("UTC"));
                userService.setClock(fixedClockNow);

                Users professor = new Users(41L, "prof_ack", "pwd", Role.PROFESSOR, "prof@example.com", true,
                                new java.util.ArrayList<>());
                Courses assignedCourse = new Courses();
                assignedCourse.setCourse_id(600L);
                assignedCourse.setTitle("Curso asignado");
                assignedCourse.setDuration(1.0f);

                Users student = new Users(42L, "student_ack", "pwd", Role.STUDENT, "student@example.com", true,
                                new java.util.ArrayList<>());
                Enrollment enrollment = new Enrollment();
                enrollment.setUser(student);
                enrollment.setCourse(assignedCourse);
                enrollment.setProgressAlertProfessorAck(false);
                Clock fixedClockStart = Clock.fixed(Instant.parse("2026-01-01T11:06:00Z"), ZoneId.of("UTC"));
                enrollment.setStarted_at(LocalDateTime.now(fixedClockStart));

                when(userRepository.findByUsername("prof_ack")).thenReturn(Optional.of(professor));
                when(coursesRepository.findAllByAssignedUser_UserIdOrderByTitleAsc(41L))
                                .thenReturn(List.of(assignedCourse));
                when(enrollmentRepository.findActiveStudentEnrollmentsByCourseIds(List.of(600L)))
                                .thenReturn(List.of(enrollment));
                when(userSystemNotificationRepository.markAllAsReadByUsername("prof_ack")).thenReturn(1);
                when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(2);

                userService.dismissUserNotifications("prof_ack");

                assertTrue(enrollment.isProgressAlertProfessorAck());
                verify(enrollmentRepository).save(enrollment);
        }

        /*
         * =========================================================================
         * SUITE: deleteUserPermanently (BAJA PERMANENTE / BORRADO FÍSICO)
         * =========================================================================
         */

        @Test
        void deleteUserPermanently_DebeLanzarExcepcion_CuandoElAdminIntentaAutoeliminarse() {
                when(userRepository.findByUsername("root_admin")).thenReturn(
                                Optional.of(new Users(1L, "root_admin", "enc", Role.ADMIN, "a@a.com", true,
                                                new java.util.ArrayList<>())));

                assertThrows(ServicesException.class,
                                () -> userService.deleteUserPermanently("root_admin", "root_admin"));

                verify(userRepository, never()).delete(any());
        }

        @Test
        void deleteUserPermanently_DebeLanzarExcepcion_CuandoElUsuarioObjetivoEsElAdminProtegido() {
                org.springframework.test.util.ReflectionTestUtils.setField(userService, "protectedUsername",
                                "admin_cole");

                when(userRepository.findByUsername("admin_cole")).thenReturn(
                                Optional.of(new Users(2L, "admin_cole", "enc", Role.ADMIN, "cole@a.com", true,
                                                new java.util.ArrayList<>())));

                assertThrows(ServicesException.class,
                                () -> userService.deleteUserPermanently("admin_cole", "otro_admin"));

                verify(userRepository, never()).delete(any());
        }

        @Test
        void deleteUserPermanently_CasoEstudiante_DebeAnonimizarEvaluacionesYBorrarMatriculasYDocumentos() {
                Users student = new Users(10L, "laura_student", "enc", Role.STUDENT, "laura@a.com", true,
                                new java.util.ArrayList<>());
                when(userRepository.findByUsername("laura_student")).thenReturn(Optional.of(student));

                com.cursosonline.backend.entities.AcademicEvaluation evaluation = new com.cursosonline.backend.entities.AcademicEvaluation();
                evaluation.setUser(student);
                when(academicEvaluationRepository.findByUserId(10L)).thenReturn(List.of(evaluation));

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(500L);
                enrollment.setUser(student);
                when(enrollmentRepository.findAllByUserIdWithCourses(10L)).thenReturn(List.of(enrollment));

                userService.deleteUserPermanently("laura_student", "root_admin");

                // 1. Documentos enviados/recibidos borrados
                verify(documentMetadataRepository, times(1)).deleteAllBySenderOrReceiver(10L);
                verify(userSystemNotificationRepository, times(1)).deleteAllByReceiverUserId(10L);

                // 2. Evaluación anonimizada (NO borrada), no eliminada de la tabla
                assertNull(evaluation.getUser(), "La evaluación debe quedar anonimizada, no borrada");
                verify(academicEvaluationRepository, times(1)).save(evaluation);
                verify(academicEvaluationRepository, never()).delete(any());

                // 3. Matrículas propias borradas (arrastra CourseGrade por cascada JPA)
                verify(enrollmentRepository, times(1)).deleteAll(List.of(enrollment));

                // 4. Perfil/intereses y usuario final eliminados
                verify(userProfileRepository, times(1)).findById(10L);
                verify(interestRepository, times(1)).findById(10L);
                verify(userRepository, times(1)).delete(student);
        }

        @Test
        void deleteUserPermanently_CasoProfesor_DebeDesasignarCursosSinBorrarlosYNoTocarMatriculas() {
                Users professor = new Users(20L, "laura_teacher", "enc", Role.PROFESSOR, "laura.t@a.com", true,
                                new java.util.ArrayList<>());
                when(userRepository.findByUsername("laura_teacher")).thenReturn(Optional.of(professor));

                Courses course = new Courses();
                course.setCourse_id(300L);
                course.setAssignedUser(professor);

                when(coursesRepository.findAllByAssignedUser_UserIdOrderByTitleAsc(20L)).thenReturn(List.of(course));

                userService.deleteUserPermanently("laura_teacher", "root_admin");

                // 1. Documentos borrados igual que para cualquier rol
                verify(documentMetadataRepository, times(1)).deleteAllBySenderOrReceiver(20L);
                verify(userSystemNotificationRepository, times(1)).deleteAllByReceiverUserId(20L);

                // 2. El curso se desasigna, pero NUNCA se borra
                assertNull(course.getAssignedUser(), "El curso debe quedar sin profesor asignado");
                verify(coursesRepository, times(1)).save(course);
                verify(coursesRepository, never()).delete(any());

                // 3. No se tocan evaluaciones ni matrículas (no son del profesor)
                verify(academicEvaluationRepository, never()).findByUserId(any());
                verify(enrollmentRepository, never()).deleteAll(any());

                // 4. Usuario finalmente eliminado
                verify(userRepository, times(1)).delete(professor);
        }

        @Test
        void deleteUserPermanently_DebeLanzarResourceNotFoundException_CuandoElUsuarioNoExiste() {
                when(userRepository.findByUsername("fantasma")).thenReturn(Optional.empty());

                assertThrows(ResourceNotFoundException.class,
                                () -> userService.deleteUserPermanently("fantasma", "root_admin"));
        }

        @Test
        void deleteUserPermanently_DebeTraducirViolacionDeIntegridadAErrorDeNegocioControlado() {
                Users student = new Users(10L, "laura_student", "enc", Role.STUDENT, "laura@a.com", true,
                                new java.util.ArrayList<>());
                when(userRepository.findByUsername("laura_student")).thenReturn(Optional.of(student));
                when(academicEvaluationRepository.findByUserId(10L)).thenReturn(List.of());
                when(enrollmentRepository.findAllByUserIdWithCourses(10L)).thenReturn(List.of());

                doThrow(new DataIntegrityViolationException("fk users"))
                                .when(userRepository)
                                .flush();

                ServicesException exception = assertThrows(ServicesException.class,
                                () -> userService.deleteUserPermanently("laura_student", "root_admin"));

                assertEquals(
                                "No se pudo eliminar permanentemente al usuario por dependencias activas en la base de datos.",
                                exception.getMessage());
        }

        @Test
        void searchCourses_DebeUsarFindAllCuandoKeywordEsNuloOVacio() {
                Courses c1 = new Courses();
                c1.setCourse_id(1L);
                c1.setTitle("Curso A");

                when(coursesRepository.findAll(any(org.springframework.data.domain.Pageable.class)))
                                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(c1)));

                List<Courses> resultNull = userService.searchCourses(null);
                List<Courses> resultBlank = userService.searchCourses("   ");

                assertEquals(1, resultNull.size());
                assertEquals(1, resultBlank.size());
                verify(coursesRepository, times(2)).findAll(any(org.springframework.data.domain.Pageable.class));
                verify(coursesRepository, never()).searchCoursesPredictive(
                                anyString(),
                                anyString(),
                                any(org.springframework.data.domain.Pageable.class));
        }

        @Test
        void searchCourses_DebeUsarBusquedaPredictivaCuandoKeywordTieneContenido() {
                Courses c1 = new Courses();
                c1.setCourse_id(2L);
                c1.setTitle("Data Science");

                when(coursesRepository.searchCoursesPredictive(
                                eq("%data%"),
                                eq("data%"),
                                any(org.springframework.data.domain.Pageable.class)))
                                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(c1)));

                List<Courses> result = userService.searchCourses("  data  ");

                assertEquals(1, result.size());
                assertEquals("Data Science", result.get(0).getTitle());
                verify(coursesRepository, never()).findAll(any(org.springframework.data.domain.Pageable.class));
        }

        @Test
        void getCourseStats_DebeRetornarNullCuandoNoHayFila() {
                when(coursesRepository.getCourseAnalyticalStatsNative(99L)).thenReturn(null);

                com.cursosonline.backend.dto.CourseStatsDTO result = userService.getCourseStats(99L);

                assertNull(result);
        }

        @Test
        void getCourseStats_DebeMapearValoresConNulosParciales() {
                java.util.Map<String, Object> row = new java.util.HashMap<>();
                row.put("courseId", 12L);
                row.put("averageGrade", 8.25d);
                row.put("localEnrollments", 15L);
                row.put("communityRating", null);
                row.put("instructorRating", 4.5d);
                row.put("platform", "COLE");
                row.put("category", "Ingeniería");

                when(coursesRepository.getCourseAnalyticalStatsNative(12L)).thenReturn(row);

                com.cursosonline.backend.dto.CourseStatsDTO result = userService.getCourseStats(12L);

                assertNotNull(result);
                assertEquals(12L, result.courseId());
                assertEquals(8.25d, result.averageGrade());
                assertEquals(15L, result.localEnrollments());
                assertNull(result.communityRating());
                assertEquals(4.5d, result.instructorRating());
                assertEquals("COLE", result.platform());
                assertEquals("Ingeniería", result.category());
        }

        private com.cursosonline.backend.entities.UserSystemNotification buildSystemNotification(
                        Users receiver,
                        String title,
                        String message,
                        boolean read) {
                com.cursosonline.backend.entities.UserSystemNotification notification = new com.cursosonline.backend.entities.UserSystemNotification();
                notification.setReceiver(receiver);
                notification.setType("COURSE_ASSIGNMENT_CHANGE");
                notification.setTitle(title);
                notification.setMessage(message);
                notification.setRedirectUrl("/professor");
                notification.setRead(read);
                notification.setCreatedAt(java.time.LocalDateTime.now());
                return notification;
        }

}
