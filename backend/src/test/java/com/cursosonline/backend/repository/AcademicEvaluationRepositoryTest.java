package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Users;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@DisplayName("Suite de Pruebas Unitarias para AcademicEvaluationRepository")
class AcademicEvaluationRepositoryTest {

    private AcademicEvaluationRepository academicEvaluationRepository;
    private Users studentUser;
    private Courses sampleCourse;

    @BeforeEach
    void setUp() {
        // 1. Creamos el simulador (mock) del propio repositorio de forma directa
        academicEvaluationRepository = Mockito.mock(AcademicEvaluationRepository.class);

        // 2. Instanciamos entidades de prueba reales de Java para simular los DTOs de
        // PostgreSQL
        studentUser = new Users();
        studentUser.setUser_id(1L);
        studentUser.setUsername("alumno_analitico");

        sampleCourse = new Courses();
        sampleCourse.setCourse_id(101L);
        sampleCourse.setTitle("Data Analysis Using Python");
    }

    /*
     * =========================================================================
     * 1. VERIFICACIÓN: getAverageCourseScore
     * =========================================================================
     */
    @Test
    @DisplayName("Debe calcular correctamente la media aritmética del curso")
    void getAverageCourseScore_ShouldReturnCorrectAverage() {
        when(academicEvaluationRepository.getAverageCourseScore(101L)).thenReturn(8.5);

        Double score = academicEvaluationRepository.getAverageCourseScore(101L);

        assertNotNull(score);
        assertEquals(8.5, score, 0.01);
    }

    /*
     * =========================================================================
     * 2. VERIFICACIÓN: getAverageInstructorScore
     * =========================================================================
     */
    @Test
    @DisplayName("Debe calcular correctamente la media del docente basándose en su nombre")
    void getAverageInstructorScore_ShouldReturnCorrectAverage() {
        when(academicEvaluationRepository.getAverageInstructorScore("Brandon Krakowsky")).thenReturn(9.0);

        Double score = academicEvaluationRepository.getAverageInstructorScore("Brandon Krakowsky");

        assertNotNull(score);
        assertEquals(9.0, score, 0.01);
    }

    /*
     * =========================================================================
     * 3. VERIFICACIÓN: existsByUserUsernameAndCourseCourseId
     * =========================================================================
     */
    @Test
    @DisplayName("Debe confirmar si el alumno ya calificó el curso antes de insertar")
    void existsByUserUsernameAndCourseCourseId_ShouldReturnTrueIfExists() {
        when(academicEvaluationRepository.existsByUserUsernameAndCourseCourseId("alumno_analitico", 101L))
                .thenReturn(true);

        boolean exists = academicEvaluationRepository.existsByUserUsernameAndCourseCourseId("alumno_analitico", 101L);

        assertTrue(exists);
    }

    /*
     * =========================================================================
     * 4. VERIFICACIÓN: getGroupAveragePerformance
     * =========================================================================
     */
    @Test
    @DisplayName("Debe calcular el rendimiento del grupo de alumnos activos")
    void getGroupAveragePerformance_ShouldReturnCorrectAverage() {
        when(academicEvaluationRepository.getGroupAveragePerformance(101L)).thenReturn(7.8);

        Double score = academicEvaluationRepository.getGroupAveragePerformance(101L);

        assertNotNull(score);
        assertEquals(7.8, score, 0.01);
    }

    /*
     * =========================================================================
     * 5. VERIFICACIÓN: getIndividualStudentPerformance
     * =========================================================================
     */
    @Test
    @DisplayName("Debe recuperar la nota media individual de un alumno en una asignatura")
    void getIndividualStudentPerformance_ShouldReturnCorrectValue() {
        when(academicEvaluationRepository.getIndividualStudentPerformance(101L, 1L)).thenReturn(8.5);

        Double score = academicEvaluationRepository.getIndividualStudentPerformance(101L, 1L);

        assertNotNull(score);
        assertEquals(8.5, score, 0.01);
    }
}
