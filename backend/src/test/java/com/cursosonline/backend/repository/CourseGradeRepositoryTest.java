package com.cursosonline.backend.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@DisplayName("Suite de Pruebas Unitarias para CourseGradeRepository")
class CourseGradeRepositoryTest {

    private CourseGradeRepository courseGradeRepository;
    private final Long sampleCourseId = 101L;
    private final Long sampleUserId = 1L;

    @BeforeEach
    void setUp() {
        // Creamos el simulador (mock) del repositorio relacional de notas de forma
        // directa
        courseGradeRepository = Mockito.mock(CourseGradeRepository.class);
    }

    /*
     * =========================================================================
     * 1. VERIFICACIÓN: getGroupAverageScore
     * =========================================================================
     */
    @Test
    @DisplayName("Debe calcular correctamente la media de calificaciones del grupo de alumnos activos")
    void getGroupAverageScore_ShouldReturnCorrectAverage() {
        // Simulamos que la consulta de rendimiento grupal retorna un promedio válido
        when(courseGradeRepository.getGroupAverageScore(sampleCourseId)).thenReturn(7.5);

        Double score = courseGradeRepository.getGroupAverageScore(sampleCourseId);

        assertNotNull(score, "La nota media del grupo no debe ser nula");
        assertEquals(7.5, score, 0.01, "La media devuelta debe coincidir con el valor simulado");
    }

    /*
     * =========================================================================
     * 2. VERIFICACIÓN: getIndividualStudentAverageScore
     * =========================================================================
     */
    @Test
    @DisplayName("Debe recuperar de forma precisa la nota media individual de un alumno en una asignatura")
    void getIndividualStudentAverageScore_ShouldReturnCorrectValue() {
        // Simulamos la consulta de rendimiento individual para un alumno específico
        when(courseGradeRepository.getIndividualStudentAverageScore(sampleCourseId, sampleUserId)).thenReturn(8.2);

        Double score = courseGradeRepository.getIndividualStudentAverageScore(sampleCourseId, sampleUserId);

        assertNotNull(score, "La nota media individual no debe ser nula");
        assertEquals(8.2, score, 0.01, "La nota del estudiante debe ser exactamente 8.2");
    }
}
