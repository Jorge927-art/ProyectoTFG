package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.RecommendationDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Interest;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.InterestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Suite de pruebas unitarias y de comportamiento para el Motor de
 * Recomendaciones [ADR-26].
 * Valida la precisión matemática de la matriz de pesos del algoritmo de
 * Filtrado Basado en Contenido.
 */
@ExtendWith(MockitoExtension.class)
class RecommendationServiceTest {

    @Mock
    private CoursesRepository coursesRepository;

    @Mock
    private InterestRepository interestRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @InjectMocks
    private RecommendationService recommendationService;

    private Interest sampleInterests;
    private Courses course1;
    private Courses course2;
    private Courses course3;

    @BeforeEach
    void setUp() {
        // 1. Configurar intereses simulados del alumno (Ciencia de Datos, Corto,
        // Español)
        sampleInterests = new Interest();
        sampleInterests.setCategory(Arrays.asList("Ciencia de Datos", "Programación"));
        sampleInterests.setCourse_type(Collections.singletonList("Principiante / Básico"));
        sampleInterests.setLanguage(Collections.singletonList("Español"));
        sampleInterests.setSubtitle_languages(Collections.singletonList("Español"));
        sampleInterests.setDuration(Collections.singletonList("Corto (< 1 semana)"));

        // 2. Instanciar Curso 1: Afinidad Máxima (Debe ganar y tener la mayor
        // puntuación)
        course1 = new Courses();
        course1.setCourse_id(10L);
        course1.setTitle("Python para Ciencia de Datos");
        course1.setCategory("Ciencia de Datos");
        course1.setCourseType("Principiante / Básico");
        course1.setLanguage("Español");
        course1.setSubtitleLanguages("Español");
        course1.setDuration(5f);
        course1.setRating(5.0f);

        course1.setInstructors("Dr. Aranda");

        // 3. Instanciar Curso 2: Afinidad Nula (Suma 0 puntos y debe ser descartado por
        // el umbral)
        course2 = new Courses();
        course2.setCourse_id(20L);
        course2.setTitle("Introducción a las Finanzas");
        course2.setCategory("Negocios"); // No coincide (0 pts)
        course2.setCourseType("Avanzado / Experto"); // CORRECCIÓN: No coincide con el interés (0 pts)
        course2.setLanguage("Inglés"); // No coincide (0 pts)
        course2.setSubtitleLanguages("Francés"); // No coincide (0 pts)
        course2.setDuration(12f); // Medio - No coincide (0 pts)
        course2.setRating(0.0f); // 0 estrellas (0 pts)

        // 4. Instanciar Curso 3: Curso en el que el alumno ya está matriculado (Debe
        // ser EXCLUIDO)
        course3 = new Courses();
        course3.setCourse_id(30L);
        course3.setTitle("Bases de Datos Relacionales");
        course3.setCategory("Programación");
        course3.setCourseType("Principiante / Básico");
    }

    @Test
    @DisplayName("Debe calcular la afinidad y ordenar las sugerencias de forma predictiva excluyendo matriculados")
    void shouldCalculateAffinityAndOrderRecommendationsCorrectly() {
        Long userId = 1L;

        // Configuración de mocks (Mapeamos las llamadas de red simuladas)
        when(interestRepository.findById(userId)).thenReturn(Optional.of(sampleInterests));
        when(enrollmentRepository.findEnrolledCourseIdsByUserId(userId)).thenReturn(Collections.singletonList(30L)); // Alumno
                                                                                                                     // ya
                                                                                                                     // matriculado
                                                                                                                     // en
                                                                                                                     // Curso
                                                                                                                     // 3
        when(coursesRepository.findAll()).thenReturn(Arrays.asList(course1, course2, course3));

        // Ejecución del método del servicio real
        List<RecommendationDTO> result = recommendationService.getRecommendationsForUser(userId);

        // Aserciones y Validaciones Rigurosas
        assertNotNull(result, "El resultado de las recomendaciones no debe ser nulo");
        assertFalse(result.isEmpty(), "Debe devolver al menos una recomendación válida");

        // 1. Validación de Exclusión: El curso 3 (ID 30) debe haber sido omitido por el
        // filtro de matriculados
        boolean containsExcludedCourse = result.stream().anyMatch(dto -> dto.id().equals(30L));
        assertFalse(containsExcludedCourse,
                "El algoritmo falló: Recomendó un curso en el que el usuario ya está inscrito");

        // 2. Validación de Umbral Mínimo: El curso 2 no sumó los suficientes puntos
        // (>10) y debe haber sido descartado
        boolean containsLowAffinityCourse = result.stream().anyMatch(dto -> dto.id().equals(20L));
        assertFalse(containsLowAffinityCourse,
                "El algoritmo falló: Se incluyó un curso que no supera el umbral mínimo de relevancia");

        // 3. Validación de Afinidad y Ordenación: El curso 1 cumple todos los
        // criterios, supera el filtro y es el Top 1
        assertEquals(1, result.size(), "La lista filtrada debe contener exactamente 1 sugerencia óptima");
        RecommendationDTO topRecommendation = result.get(0);
        assertEquals(10L, topRecommendation.id());
        assertEquals("Python para Ciencia de Datos", topRecommendation.title());
        assertEquals("Dr. Aranda", topRecommendation.instructor());
        assertTrue(topRecommendation.score() > 50, "El score del curso con afinidad máxima debe ser elevado");
        assertTrue(topRecommendation.reason().contains("Coincide con tus categorías preferidas"),
                "La explicación semántica debe ser inyectada");

        // Verificación de llamadas a repositorios para garantizar aislamiento de
        // infraestructura
        verify(interestRepository, times(1)).findById(userId);
        verify(enrollmentRepository, times(1)).findEnrolledCourseIdsByUserId(userId);
        verify(coursesRepository, times(1)).findAll();
    }
}
