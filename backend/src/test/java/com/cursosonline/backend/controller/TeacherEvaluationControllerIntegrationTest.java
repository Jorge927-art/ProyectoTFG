package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.StudentPerformanceDTO;
import com.cursosonline.backend.dto.CourseMetricsDTO;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.CourseGradeRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.ResponseEntity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class TeacherEvaluationControllerIntegrationTest {

    @Autowired
    private TeacherEvaluationController teacherEvaluationController;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private CourseGradeRepository courseGradeRepository;

    @MockitoBean
    private EnrollmentRepository enrollmentRepository;

    private Users mockStudent;
    private final Long courseId = 1L;

    @BeforeEach
    void setUp() {
        mockStudent = new Users();
        mockStudent.setUser_id(101L);
        mockStudent.setUsername("Luis Nuevo");
        mockStudent.setEmail("luisNuevo@yahoo.es");
        mockStudent.setEnabled(true);
    }

    @Test
    @WithMockUser(authorities = "PROFESSOR")
    void debeRetornarListaDeAlumnosConCalificacionesCalculadasCorrectamente() {
        Enrollment mockEnrollment = new Enrollment();
        mockEnrollment.setEnrollmentid(555L);
        mockEnrollment.setUser(mockStudent);

        when(enrollmentRepository.findActiveStudentEnrollmentsByCourseId(courseId)).thenReturn(List.of(mockEnrollment));
        when(courseGradeRepository.getGroupAverageScore(courseId)).thenReturn(6.5);
        when(courseGradeRepository.getIndividualStudentAverageScore(courseId, mockStudent.getUser_id()))
                .thenReturn(8.5);

        ResponseEntity<List<StudentPerformanceDTO>> response = teacherEvaluationController
                .getCourseStudentsPerformance(courseId);

        assertNotNull(response.getBody());
        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, response.getBody().size());

        StudentPerformanceDTO dto = response.getBody().get(0);
        assertEquals(555L, dto.enrollmentId());
        assertEquals(101L, dto.userId());
        assertEquals("Luis Nuevo", dto.username());
        assertEquals("luisNuevo@yahoo.es", dto.email());
        assertEquals(8.5, dto.individualGrade());
        assertEquals(6.5, dto.groupAverage());
    }

    @Test
    @WithMockUser(authorities = "PROFESSOR")
    void debeRetornarMetricasGlobalesDelCursoCorrectamente() {
        when(userRepository.findActiveStudentsByCourseId(courseId)).thenReturn(List.of(mockStudent));
        when(courseGradeRepository.getGroupAverageScore(courseId)).thenReturn(7.2);

        ResponseEntity<CourseMetricsDTO> response = teacherEvaluationController.getCourseManagementMetrics(courseId);

        assertNotNull(response.getBody());
        assertEquals(200, response.getStatusCode().value());

        CourseMetricsDTO metricsDto = response.getBody();
        assertEquals(1, metricsDto.activeStudentsCount());
        assertEquals(7.2, metricsDto.groupAverageGrade());
        assertEquals(0L, metricsDto.pendingSubmissionsCount());
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void debeDenegarElAccesoSiElUsuarioNoTieneElRolDeProfesor() {
        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> teacherEvaluationController.getCourseStudentsPerformance(courseId));
    }

    @Test
    @WithMockUser(authorities = "PROFESSOR")
    void debeEstabilizarElCalculoDeLaMediaGeneralSiExistenAlumnosSinCalificacionesAun() {
        Long mockCourseId = 5L;

        // 1. Simulamos un escenario crítico: el repositorio devuelve null porque la
        // consulta posicional AVG() no encuentra registros
        when(userRepository.findActiveStudentsByCourseId(mockCourseId)).thenReturn(java.util.List.of(mockStudent));
        when(courseGradeRepository.getGroupAverageScore(mockCourseId)).thenReturn(null);

        // 2. Invocamos el método analítico del controlador
        ResponseEntity<com.cursosonline.backend.dto.CourseMetricsDTO> response = teacherEvaluationController
                .getCourseManagementMetrics(mockCourseId);

        // 3. Aserción de Calidad [ADR-055]: Verificamos que el cortocircuito del
        // backend asigna 0.0 de forma segura
        assertNotNull(response.getBody());
        assertEquals(200, response.getStatusCode().value());
        assertEquals(0.0, response.getBody().groupAverageGrade(),
                "El backend debe estabilizar a 0.0 si el promedio relacional es nulo");
    }

    @Test
    @WithMockUser(authorities = "PROFESSOR")
    void debeRetornarListaVaciaSiElCursoNoTieneAlumnosMatriculados() {
        Long emptyCourseId = 999L;

        when(enrollmentRepository.findActiveStudentEnrollmentsByCourseId(emptyCourseId)).thenReturn(List.of());
        when(courseGradeRepository.getGroupAverageScore(emptyCourseId)).thenReturn(null);

        ResponseEntity<List<StudentPerformanceDTO>> response = teacherEvaluationController
                .getCourseStudentsPerformance(emptyCourseId);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isEmpty(),
                "Si no hay matrículas activas el endpoint debe devolver una colección vacía");

        verify(courseGradeRepository, never()).getIndividualStudentAverageScore(anyLong(), anyLong());
    }

    @Test
    @WithMockUser(authorities = "PROFESSOR")
    void debeRetornarMetricasEnCeroSiElCursoNoTieneAlumnosMatriculados() {
        Long emptyCourseId = 1000L;

        when(userRepository.findActiveStudentsByCourseId(emptyCourseId)).thenReturn(List.of());
        when(courseGradeRepository.getGroupAverageScore(emptyCourseId)).thenReturn(null);

        ResponseEntity<CourseMetricsDTO> response = teacherEvaluationController
                .getCourseManagementMetrics(emptyCourseId);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());

        CourseMetricsDTO metrics = response.getBody();
        assertEquals(0, metrics.activeStudentsCount(),
                "Sin matrículas activas, el contador de alumnos debe permanecer en cero");
        assertEquals(0.0, metrics.groupAverageGrade(),
                "Sin calificaciones, la media general debe estabilizarse a 0.0");
        assertEquals(0L, metrics.pendingSubmissionsCount(),
                "El número de entregas pendientes se mantiene en cero en este flujo estabilizado");
    }
}
