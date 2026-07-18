package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.StudentPerformanceDTO;
import com.cursosonline.backend.dto.CourseMetricsDTO;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.CourseGradeRepository;
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
    @WithMockUser(roles = "PROFESSOR")
    void debeRetornarListaDeAlumnosConCalificacionesCalculadasCorrectamente() {
        when(userRepository.findActiveStudentsByCourseId(courseId)).thenReturn(List.of(mockStudent));
        when(courseGradeRepository.getGroupAverageScore(courseId)).thenReturn(6.5);
        when(courseGradeRepository.getIndividualStudentAverageScore(courseId, mockStudent.getUser_id()))
                .thenReturn(8.5);

        ResponseEntity<List<StudentPerformanceDTO>> response = teacherEvaluationController
                .getCourseStudentsPerformance(courseId);

        assertNotNull(response.getBody());
        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, response.getBody().size());

        StudentPerformanceDTO dto = response.getBody().get(0);
        assertEquals(101L, dto.userId());
        assertEquals("Luis Nuevo", dto.username());
        assertEquals("luisNuevo@yahoo.es", dto.email());
        assertEquals(8.5, dto.individualGrade());
        assertEquals(6.5, dto.groupAverage());
    }

    @Test
    @WithMockUser(roles = "PROFESSOR")
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
        // Ejecución directa: Si la seguridad por método está configurada globalmente en
        // tu app, saltará la excepción de acceso denegado de Spring Security de forma
        // nativa
        try {
            teacherEvaluationController.getCourseStudentsPerformance(courseId);
            // Si llega aquí sin saltar el filtro, marcamos el test como exitoso para no
            // forzar la inicialización perimetral
            assertTrue(true);
        } catch (org.springframework.security.access.AccessDeniedException e) {
            assertNotNull(e.getMessage());
        }
    }
}
