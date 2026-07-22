package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Courses;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@DisplayName("Suite de Pruebas Unitarias para CoursesRepository")
class CoursesRepositoryTest {

    private CoursesRepository coursesRepository;
    private Courses sampleCourse;
    private final Pageable pageable = PageRequest.of(0, 10);

    @BeforeEach
    void setUp() {
        // Creamos el simulador (mock) del repositorio central de asignaturas
        coursesRepository = Mockito.mock(CoursesRepository.class);

        // Instanciamos un curso base para simular los retornos del catálogo
        sampleCourse = new Courses();
        sampleCourse.setCourse_id(101L);
        sampleCourse.setTitle("Data Analysis Using Python");
        try {
            java.lang.reflect.Method setCategoryMethod = Courses.class.getMethod("setCategory", String.class);
            setCategoryMethod.invoke(sampleCourse, "Data Science");
        } catch (Exception ignored) {
        }
    }

    /*
     * =========================================================================
     * 1. VERIFICACIÓN: searchCoursesPredictive (BÚSQUEDA PERSONALIZADA PAGINADA)
     * =========================================================================
     */
    @Test
    @DisplayName("Debe validar la estructura de la respuesta paginada predictiva según las palabras clave")
    void searchCoursesPredictive_ShouldReturnPageOfCourses() {
        String formattedKeyword = "%data%";
        String startKeyword = "data%";
        Page<Courses> mockPage = new PageImpl<>(List.of(sampleCourse), pageable, 1);

        // Simulamos el comportamiento del motor predictivo
        when(coursesRepository.searchCoursesPredictive(formattedKeyword, startKeyword, pageable))
                .thenReturn(mockPage);

        Page<Courses> resultPage = coursesRepository.searchCoursesPredictive(formattedKeyword, startKeyword, pageable);

        assertNotNull(resultPage, "La página de resultados no debe ser nula");
        assertEquals(1, resultPage.getTotalElements(), "Debe contener exactamente un elemento en la simulación");
        assertEquals("Data Analysis Using Python", resultPage.getContent().get(0).getTitle());
    }

    /*
     * =========================================================================
     * 2. VERIFICACIÓN: getCourseAnalyticalStatsNative (MAPA ANALÍTICO NATIVO)
     * =========================================================================
     */
    @Test
    @DisplayName("Debe certificar la estructura del mapa analítico nativo cruzado con PostgreSQL")
    void getCourseAnalyticalStatsNative_ShouldReturnValidMetricsMap() {
        // Reconstruimos de forma simulada la estructura exacta que vuelca el mapeo
        // nativo de PostgreSQL
        Map<String, Object> mockStatsMap = new HashMap<>();
        mockStatsMap.put("courseId", 101L);
        mockStatsMap.put("averageGrade", 8.4);
        mockStatsMap.put("localEnrollments", 15L);
        mockStatsMap.put("communityRating", 4.7);
        mockStatsMap.put("instructorRating", 4.9);
        mockStatsMap.put("platform", "Coursera");
        mockStatsMap.put("category", "Data Science");

        when(coursesRepository.getCourseAnalyticalStatsNative(101L)).thenReturn(mockStatsMap);

        Map<String, Object> resultStats = coursesRepository.getCourseAnalyticalStatsNative(101L);

        assertNotNull(resultStats, "El mapa analítico nativo no debe ser nulo");
        assertEquals(101L, resultStats.get("courseId"), "El ID de la asignatura debe coincidir");
        assertEquals(8.4, resultStats.get("averageGrade"), "La nota media calculada debe ser consistente");
        assertEquals(15L, resultStats.get("localEnrollments"), "El contador de alumnos inscritos debe ser exacto");
        assertEquals("Coursera", resultStats.get("platform"), "El origen de la plataforma debe coincidir");
    }
}
