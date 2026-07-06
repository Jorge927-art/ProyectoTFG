package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.AcademicEvaluation;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.AcademicEvaluationRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.repository.CoursesRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

@DisplayName("Suite de Pruebas Unitarias de Aislamiento: AcademicEvaluationController [TFG Backend]")
public class AcademicEvaluationControllerTest {

    @InjectMocks
    private AcademicEvaluationController academicEvaluationController;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private AcademicEvaluationRepository academicEvaluationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CoursesRepository coursesRepository;

    @Mock
    private Authentication authentication;

    private Users mockUser;
    private Courses mockCourse;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        mockUser = new Users();
        mockUser.setUser_id(1L);
        mockUser.setUsername("luis_student");
        mockUser.setEmail("luis@tfg.com");

        mockCourse = new Courses();
        mockCourse.setCourse_id(101L);
        mockCourse.setTitle("Introduction to Data Science");
        mockCourse.setInstructors("Prof. Andrew Ng");

        // Simulación estándar del contexto de seguridad por Claims
        Mockito.when(authentication.isAuthenticated()).thenReturn(true);
        Mockito.when(authentication.getName()).thenReturn("luis_student");
    }

    @Test
    @DisplayName("Debe retornar HTTP 200 con la lista de asignaturas pendientes asociadas al alumno legítimo")
    void debeRetornarAsignaturasPendientesConExito() {
        Enrollment mockEnrollment = new Enrollment();
        mockEnrollment.setEnrollmentid(50L);
        mockEnrollment.setCourse(mockCourse);
        mockEnrollment.setUser(mockUser);

        Mockito.when(enrollmentRepository.findPendingEvaluationsByUsername("luis_student"))
                .thenReturn(Arrays.asList(mockEnrollment));

        ResponseEntity<?> response = academicEvaluationController.getPendingEvaluations(authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof List);
        List<?> bodyList = (List<?>) response.getBody();
        assertEquals(1, bodyList.size());
    }

    @Test
    @DisplayName("Debe procesar y persistir con éxito (HTTP 200) un formulario granular con estrellas y comentarios válidos")
    void debeProcesarYGuardarEvaluacionLegitima() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("course_id", 101L);
        payload.put("course_score", 5);
        payload.put("course_comment", "Excelente material didáctico.");
        payload.put("instructor_score", 4);
        payload.put("instructor_comment", "Buenas tutorías explicativas.");

        // Simulamos precondiciones de seguridad: está matriculado y no ha votado antes
        Mockito.when(enrollmentRepository.existsByUsernameAndCourseId("luis_student", 101L)).thenReturn(true);
        Mockito.when(academicEvaluationRepository.existsByUserUsernameAndCourseCourseId("luis_student", 101L))
                .thenReturn(false);

        Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockUser));
        Mockito.when(coursesRepository.findById(101L)).thenReturn(Optional.of(mockCourse));

        ResponseEntity<?> response = academicEvaluationController.submitEvaluation(authentication, payload);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
        assertNotNull(bodyMap);
        assertEquals("Evaluación académica guardada y procesada correctamente.", bodyMap.get("message"));

        // Validamos que se invocó el método save del repositorio
        Mockito.verify(academicEvaluationRepository, Mockito.times(1)).save(any(AcademicEvaluation.class));
    }

    @Test
    @DisplayName("Debe denegar el acceso (HTTP 403 Forbidden) si el alumno intenta evaluar una asignatura sin matrícula legítima")
    void debeDenegarEvaluacionSiNoEstaMatriculado() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("course_id", 999L); // Curso pirata sin matrícula
        payload.put("course_score", 5);
        payload.put("instructor_score", 5);

        // Simulamos que la matrícula no existe en PostgreSQL
        Mockito.when(enrollmentRepository.existsByUsernameAndCourseId("luis_student", 999L)).thenReturn(false);

        ResponseEntity<?> response = academicEvaluationController.submitEvaluation(authentication, payload);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
        assertNotNull(bodyMap);
        assertEquals("Acceso denegado: No puedes evaluar una asignatura en la que no estás matriculado.",
                bodyMap.get("error"));

        // Verificamos protección perimetral estricta: nunca debe invocar el método save
        Mockito.verify(academicEvaluationRepository, Mockito.never()).save(any(AcademicEvaluation.class));
    }

    @Test
    @DisplayName("Debe denegar el registro (HTTP 400 Bad Request) si el alumno intenta duplicar una calificación ya emitida")
    void debeRechazarEvaluacionSiYaExisteUnVotoPrevio() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("course_id", 101L);
        payload.put("course_score", 4);
        payload.put("instructor_score", 4);

        Mockito.when(enrollmentRepository.existsByUsernameAndCourseId("luis_student", 101L)).thenReturn(true);
        // Simulamos que ya hay un registro persistido en la tabla
        Mockito.when(academicEvaluationRepository.existsByUserUsernameAndCourseCourseId("luis_student", 101L))
                .thenReturn(true);

        ResponseEntity<?> response = academicEvaluationController.submitEvaluation(authentication, payload);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
        assertNotNull(bodyMap);
        assertEquals("Ya has emitido una calificación para esta asignatura.", bodyMap.get("error"));

        Mockito.verify(academicEvaluationRepository, Mockito.never()).save(any(AcademicEvaluation.class));
    }
}
