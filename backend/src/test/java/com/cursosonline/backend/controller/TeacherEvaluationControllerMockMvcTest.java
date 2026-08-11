package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.CourseGrade;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.CourseGradeRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserSystemNotificationRepository;
import com.cursosonline.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.Optional;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("TeacherEvaluationController - MockMvc submit grading")
class TeacherEvaluationControllerMockMvcTest {

        private MockMvc mockMvc;

        @InjectMocks
        private TeacherEvaluationController teacherEvaluationController;

        @Mock
        private EnrollmentRepository enrollmentRepository;

        @Mock
        private CourseGradeRepository courseGradeRepository;

        @Mock
        private UserRepository userRepository;

        @Mock
        private UserSystemNotificationRepository userSystemNotificationRepository;

        @Mock
        private Principal principal;

        @BeforeEach
        void setUp() {
                mockMvc = MockMvcBuilders.standaloneSetup(teacherEvaluationController).build();
        }

        @Test
        @DisplayName("debe mapear feedback del payload JSON y persistirlo en CourseGrade")
        void gradeStudent_shouldMapFeedbackAndPersistGrade() throws Exception {
                Long enrollmentId = 888L;
                String teacherUsername = "profesor_test";
                String feedback = "Buen trabajo, pero revisa normalizacion de datos.";

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(enrollmentId);

                when(principal.getName()).thenReturn(teacherUsername);
                when(enrollmentRepository.isInstructorAuthorizedForEnrollment(enrollmentId, teacherUsername))
                                .thenReturn(true);
                when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(enrollment));
                when(courseGradeRepository.findAllByEnrollmentIdOrderByGradeIdAsc(enrollmentId)).thenReturn(List.of());

                String gradePayload = """
                                {
                                  "enrollmentId": 888,
                                  "title": "Examen Final Modulo 1",
                                  "score": 9.50,
                                  "feedback": "Buen trabajo, pero revisa normalizacion de datos."
                                }
                                """;

                mockMvc.perform(post("/api/v1/teacher/evaluations/submit")
                                .principal(principal)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(gradePayload))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.message")
                                                .value("Calificación registrada con éxito por el docente autorizado."));

                ArgumentCaptor<CourseGrade> captor = ArgumentCaptor.forClass(CourseGrade.class);
                verify(courseGradeRepository, times(1)).save(captor.capture());

                CourseGrade persisted = captor.getValue();
                assertEquals("Examen Final Modulo 1", persisted.getTitle());
                assertEquals(new BigDecimal("9.50"), persisted.getScore());
                assertEquals(feedback, persisted.getComments());
                assertEquals(enrollmentId, persisted.getEnrollment().getEnrollmentid());

                verify(enrollmentRepository, times(1)).isInstructorAuthorizedForEnrollment(eq(enrollmentId),
                                eq(teacherUsername));
        }

        @Test
        @DisplayName("debe devolver 403 y no guardar si el profesor no está autorizado para la matrícula")
        void gradeStudent_shouldReturnForbiddenAndNotPersist_WhenProfessorIsNotAuthorized() throws Exception {
                Long enrollmentId = 999L;
                String teacherUsername = "profesor_test";

                when(principal.getName()).thenReturn(teacherUsername);
                when(enrollmentRepository.isInstructorAuthorizedForEnrollment(enrollmentId, teacherUsername))
                                .thenReturn(false);

                String gradePayload = """
                                {
                                  "enrollmentId": 999,
                                  "title": "Trabajo Integrador",
                                  "score": 7.25,
                                  "feedback": "Necesita mejorar la estructura del informe."
                                }
                                """;

                mockMvc.perform(post("/api/v1/teacher/evaluations/submit")
                                .principal(principal)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(gradePayload))
                                .andExpect(status().isForbidden())
                                .andExpect(jsonPath("$.error").value(
                                                "Acceso denegado: No eres el instructor asignado a esta asignatura o la matrícula no existe."));

                verify(courseGradeRepository, never()).save(org.mockito.ArgumentMatchers.any(CourseGrade.class));
                verify(enrollmentRepository, never()).findById(enrollmentId);
        }

        @Test
        @DisplayName("debe devolver 401 y no guardar si no hay principal autenticado")
        void gradeStudent_shouldReturnUnauthorizedAndNotPersist_WhenPrincipalIsMissing() throws Exception {
                String gradePayload = """
                                {
                                  "enrollmentId": 111,
                                  "title": "Examen Parcial",
                                  "score": 6.75,
                                  "feedback": "Debes reforzar conceptos básicos."
                                }
                                """;

                mockMvc.perform(post("/api/v1/teacher/evaluations/submit")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(gradePayload))
                                .andExpect(status().isUnauthorized())
                                .andExpect(jsonPath("$.error").value("Sesión inválida o expirada."));

                verifyNoInteractions(courseGradeRepository);
                verifyNoInteractions(enrollmentRepository);
        }

        @Test
        @DisplayName("debe devolver las calificaciones existentes de una matrícula autorizada")
        void getEnrollmentGrades_shouldReturnPersistedGrades_WhenProfessorIsAuthorized() throws Exception {
                Long enrollmentId = 301L;
                String teacherUsername = "profesor_test";

                CourseGrade workGrade = new CourseGrade();
                workGrade.setGradeId(1L);
                workGrade.setTitle("Trabajo Académico Escrito");
                workGrade.setScore(new BigDecimal("7.50"));

                CourseGrade examGrade = new CourseGrade();
                examGrade.setGradeId(2L);
                examGrade.setTitle("Examen Final");
                examGrade.setScore(new BigDecimal("8.00"));

                when(principal.getName()).thenReturn(teacherUsername);
                when(enrollmentRepository.isInstructorAuthorizedForEnrollment(enrollmentId, teacherUsername))
                                .thenReturn(true);
                when(courseGradeRepository.findAllByEnrollmentIdOrderByGradeIdAsc(enrollmentId))
                                .thenReturn(List.of(workGrade, examGrade));

                mockMvc.perform(get("/api/v1/teacher/evaluations/enrollments/{enrollmentId}/grades", enrollmentId)
                                .principal(principal)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].gradeId").value(1))
                                .andExpect(jsonPath("$[0].title").value("Trabajo Académico Escrito"))
                                .andExpect(jsonPath("$[0].score").value(7.50))
                                .andExpect(jsonPath("$[1].title").value("Examen Final"));
        }

        @Test
        @DisplayName("debe devolver 403 al consultar calificaciones de una matrícula no autorizada")
        void getEnrollmentGrades_shouldReturnForbidden_WhenProfessorIsNotAuthorized() throws Exception {
                Long enrollmentId = 302L;
                String teacherUsername = "profesor_test";

                when(principal.getName()).thenReturn(teacherUsername);
                when(enrollmentRepository.isInstructorAuthorizedForEnrollment(enrollmentId, teacherUsername))
                                .thenReturn(false);

                mockMvc.perform(get("/api/v1/teacher/evaluations/enrollments/{enrollmentId}/grades", enrollmentId)
                                .principal(principal)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isForbidden())
                                .andExpect(jsonPath("$.error").value(
                                                "Acceso denegado: No eres el instructor asignado a esta asignatura o la matrícula no existe."));

                verify(courseGradeRepository, never()).findAllByEnrollmentIdOrderByGradeIdAsc(anyLong());
        }

        @Test
        @DisplayName("debe devolver 401 si falta principal al consultar calificaciones de matrícula")
        void getEnrollmentGrades_shouldReturnUnauthorized_WhenPrincipalIsMissing() throws Exception {
                mockMvc.perform(get("/api/v1/teacher/evaluations/enrollments/{enrollmentId}/grades", 303L)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isUnauthorized())
                                .andExpect(jsonPath("$.error").value("Sesión inválida o expirada."));

                verifyNoInteractions(courseGradeRepository);
        }

        @Test
        @DisplayName("debe devolver 400 cuando el título de la calificación está vacío")
        void gradeStudent_shouldReturnBadRequest_WhenTitleIsBlank() throws Exception {
                Long enrollmentId = 777L;
                String teacherUsername = "profesor_test";

                when(principal.getName()).thenReturn(teacherUsername);
                when(enrollmentRepository.isInstructorAuthorizedForEnrollment(enrollmentId, teacherUsername))
                                .thenReturn(true);
                when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(new Enrollment()));
                when(courseGradeRepository.findAllByEnrollmentIdOrderByGradeIdAsc(enrollmentId)).thenReturn(List.of());

                String gradePayload = """
                                {
                                  "enrollmentId": 777,
                                  "title": "   ",
                                  "score": 8.50,
                                  "feedback": "Falta el título"
                                }
                                """;

                mockMvc.perform(post("/api/v1/teacher/evaluations/submit")
                                .principal(principal)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(gradePayload))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.error").value("El título de la calificación es obligatorio."));

                verify(courseGradeRepository, never()).save(org.mockito.ArgumentMatchers.any(CourseGrade.class));
        }

        @Test
        @DisplayName("debe devolver 409 cuando la Nota Final de Asignatura ya había sido enviada")
        void gradeStudent_shouldReturnConflict_WhenFinalGradeAlreadySubmitted() throws Exception {
                Long enrollmentId = 778L;
                String teacherUsername = "profesor_test";

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(enrollmentId);

                CourseGrade existingFinal = new CourseGrade();
                existingFinal.setTitle("Nota Final Asignatura");

                when(principal.getName()).thenReturn(teacherUsername);
                when(enrollmentRepository.isInstructorAuthorizedForEnrollment(enrollmentId, teacherUsername))
                                .thenReturn(true);
                when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(enrollment));
                when(courseGradeRepository.findAllByEnrollmentIdOrderByGradeIdAsc(enrollmentId))
                                .thenReturn(List.of(existingFinal));

                String gradePayload = """
                                {
                                  "enrollmentId": 778,
                                  "title": "Nota Final Asignatura",
                                  "score": 9.00,
                                  "feedback": "Cierre del curso"
                                }
                                """;

                mockMvc.perform(post("/api/v1/teacher/evaluations/submit")
                                .principal(principal)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(gradePayload))
                                .andExpect(status().isConflict())
                                .andExpect(jsonPath("$.error").value(
                                                "La Nota Final de la Asignatura ya fue enviada. Es definitiva y no puede modificarse."));

                verify(courseGradeRepository, never()).save(org.mockito.ArgumentMatchers.any(CourseGrade.class));
        }

        @Test
        @DisplayName("debe registrar Nota Final de Asignatura cuando no existía previamente")
        void gradeStudent_shouldPersistFinalCourseGrade_WhenNotPreviouslySubmitted() throws Exception {
                Long enrollmentId = 879L;
                String teacherUsername = "profesor_test";

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(enrollmentId);

                when(principal.getName()).thenReturn(teacherUsername);
                when(enrollmentRepository.isInstructorAuthorizedForEnrollment(enrollmentId, teacherUsername))
                                .thenReturn(true);
                when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(enrollment));
                when(courseGradeRepository.findAllByEnrollmentIdOrderByGradeIdAsc(enrollmentId)).thenReturn(List.of());

                String gradePayload = """
                                {
                                  "enrollmentId": 879,
                                  "title": "Nota Final Asignatura",
                                  "score": 8.90,
                                  "feedback": "Cierre definitivo"
                                }
                                """;

                mockMvc.perform(post("/api/v1/teacher/evaluations/submit")
                                .principal(principal)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(gradePayload))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.message")
                                                .value("Nota Final de Asignatura registrada con éxito. Es definitiva."));

                verify(courseGradeRepository, times(1)).save(org.mockito.ArgumentMatchers.any(CourseGrade.class));
        }

        @Test
        @DisplayName("debe actualizar examen existente cuando llega un nuevo título de examen")
        void gradeStudent_shouldUpdateExistingExamGrade_WhenIncomingTitleIsExam() throws Exception {
                Long enrollmentId = 880L;
                String teacherUsername = "profesor_test";

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(enrollmentId);

                CourseGrade existingExam = new CourseGrade();
                existingExam.setGradeId(10L);
                existingExam.setTitle("Examen Final");
                existingExam.setScore(new BigDecimal("6.00"));

                when(principal.getName()).thenReturn(teacherUsername);
                when(enrollmentRepository.isInstructorAuthorizedForEnrollment(enrollmentId, teacherUsername))
                                .thenReturn(true);
                when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(enrollment));
                when(courseGradeRepository.findAllByEnrollmentIdOrderByGradeIdAsc(enrollmentId))
                                .thenReturn(List.of(existingExam));

                String gradePayload = """
                                {
                                  "enrollmentId": 880,
                                  "title": "Evaluación Final",
                                  "score": 9.25,
                                  "feedback": "Reevaluación"
                                }
                                """;

                mockMvc.perform(post("/api/v1/teacher/evaluations/submit")
                                .principal(principal)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(gradePayload))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.message")
                                                .value("Calificación de examen actualizada con éxito por el docente autorizado."));

                assertEquals("Evaluación Final", existingExam.getTitle());
                assertEquals(new BigDecimal("9.25"), existingExam.getScore());
                verify(courseGradeRepository, times(1)).save(existingExam);
        }

        @Test
        @DisplayName("debe sufijar título repetido en trabajos cuando ya existe el mismo título")
        void gradeStudent_shouldSuffixRepeatedNonExamTitles() throws Exception {
                Long enrollmentId = 881L;
                String teacherUsername = "profesor_test";

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(enrollmentId);

                CourseGrade existingWork = new CourseGrade();
                existingWork.setGradeId(20L);
                existingWork.setTitle("Trabajo Integrador");

                when(principal.getName()).thenReturn(teacherUsername);
                when(enrollmentRepository.isInstructorAuthorizedForEnrollment(enrollmentId, teacherUsername))
                                .thenReturn(true);
                when(enrollmentRepository.findById(enrollmentId)).thenReturn(Optional.of(enrollment));
                when(courseGradeRepository.findAllByEnrollmentIdOrderByGradeIdAsc(enrollmentId))
                                .thenReturn(List.of(existingWork));

                String gradePayload = """
                                {
                                  "enrollmentId": 881,
                                  "title": "Trabajo Integrador",
                                  "score": 7.75,
                                  "feedback": "Segunda entrega"
                                }
                                """;

                mockMvc.perform(post("/api/v1/teacher/evaluations/submit")
                                .principal(principal)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(gradePayload))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true));

                ArgumentCaptor<CourseGrade> captor = ArgumentCaptor.forClass(CourseGrade.class);
                verify(courseGradeRepository).save(captor.capture());
                assertEquals("Trabajo Integrador (2)", captor.getValue().getTitle());
        }

        @Test
        @DisplayName("management/students debe estabilizar medias nulas a cero")
        void getCourseStudentsPerformance_shouldStabilizeNullAverages() throws Exception {
                Long courseId = 700L;

                Users student = new Users();
                student.setUser_id(200L);
                student.setUsername("alumno_1");
                student.setEmail("alumno1@demo.com");

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(3000L);
                enrollment.setUser(student);

                when(enrollmentRepository.findActiveStudentEnrollmentsByCourseId(courseId))
                                .thenReturn(List.of(enrollment));
                when(courseGradeRepository.getGroupAverageScore(courseId)).thenReturn(null);
                when(courseGradeRepository.getIndividualStudentAverageScore(courseId, 200L)).thenReturn(null);

                mockMvc.perform(get("/api/v1/teacher/evaluations/courses/{courseId}/management/students", courseId)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].enrollmentId").value(3000))
                                .andExpect(jsonPath("$[0].individualGrade").value(0.0))
                                .andExpect(jsonPath("$[0].groupAverage").value(0.0));
        }

        @Test
        @DisplayName("management/metrics debe devolver tamaño de alumnos y media estabilizada")
        void getCourseManagementMetrics_shouldReturnStabilizedMetrics() throws Exception {
                Long courseId = 701L;

                Users s1 = new Users();
                s1.setUser_id(1L);
                Users s2 = new Users();
                s2.setUser_id(2L);

                when(userRepository.findActiveStudentsByCourseId(courseId)).thenReturn(List.of(s1, s2));
                when(courseGradeRepository.getGroupAverageScore(courseId)).thenReturn(null);

                mockMvc.perform(get("/api/v1/teacher/evaluations/courses/{courseId}/management/metrics", courseId)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.activeStudentsCount").value(2))
                                .andExpect(jsonPath("$.groupAverageGrade").value(0.0))
                                .andExpect(jsonPath("$.pendingSubmissionsCount").value(0));
        }
}
