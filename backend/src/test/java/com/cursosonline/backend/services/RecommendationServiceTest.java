package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.RecommendationDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Interest;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.InterestRepository;
import com.cursosonline.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Auditoría de Calidad: Pruebas del Motor de Recomendación Algorítmica")
class RecommendationServiceTest {

    @Mock
    private CoursesRepository coursesRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private InterestRepository interestRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RecommendationService recommendationService;

    private Users mockUser;
    private Courses course1;
    private Courses course2;
    private Interest userInterests;

    @BeforeEach
    void setUp() {
        // 1. Configurar usuario de prueba
        mockUser = new Users();
        mockUser.setUser_id(1L);
        mockUser.setUsername("luis");

        // 2. Configurar catálogo de cursos (Dataset de Coursera)
        course1 = new Courses();
        course1.setCourse_id(101L);
        course1.setTitle("Data Science Avanzado");
        course1.setCategory("Ciencia de Datos");
        course1.setInstructors("Profesor A");
        course1.setCourseType("Principiante");
        course1.setLanguage("Ingles");

        course2 = new Courses();
        course2.setCourse_id(102L);
        course2.setTitle("Introducción al Marketing");
        course2.setCategory("Negocios");
        course2.setInstructors("Profesor B");
        course2.setCourseType("Principiante");
        course2.setLanguage("Ingles");

        // 3. Configurar intereses del alumno con colecciones inicializadas para evitar
        // conflictos de nulos
        userInterests = new Interest();
        userInterests.setUser(mockUser);
        userInterests.setCategory(new ArrayList<>(Arrays.asList("Ciencia de Datos")));
        userInterests.setCourse_type(new ArrayList<>());
        userInterests.setLanguage(new ArrayList<>());
        userInterests.setSubtitle_languages(new ArrayList<>());
        userInterests.setDuration(new ArrayList<>());
    }

    @Test
    @DisplayName("Debe recomendar cursos basados en la categoría de interés")
    void getRecommendations_Success() {
        // Arrange
        when(userRepository.findByUsername("luis")).thenReturn(Optional.of(mockUser));
        when(interestRepository.findByUser_Username("luis")).thenReturn(Optional.of(userInterests));
        when(enrollmentRepository.findAllByUserIdWithCourses(1L)).thenReturn(new ArrayList<>());
        when(coursesRepository.findAll()).thenReturn(Arrays.asList(course1, course2));

        // Act
        List<RecommendationDTO> results = recommendationService.getRecommendations("luis");

        // Assert
        assertNotNull(results);
        assertFalse(results.isEmpty());
        assertEquals("Data Science Avanzado", results.get(0).title());
        assertTrue(results.get(0).reason().contains("Coincide con tus categorías preferidas"),
                "El motivo debe mencionar la categoría");
        assertEquals(101L, results.get(0).id());
    }

    @Test
    @DisplayName("Debe excluir estrictamente cursos donde el alumno ya está matriculado [ADR-32]")
    void getRecommendations_ExcludesEnrolled() {
        // Arrange
        Enrollment existingEnrollment = new Enrollment();
        existingEnrollment.setCourse(course1);

        when(userRepository.findByUsername("luis")).thenReturn(Optional.of(mockUser));
        when(interestRepository.findByUser_Username("luis")).thenReturn(Optional.of(userInterests));
        when(enrollmentRepository.findAllByUserIdWithCourses(1L)).thenReturn(Arrays.asList(existingEnrollment));
        when(coursesRepository.findAll()).thenReturn(Arrays.asList(course1, course2));

        // Act
        List<RecommendationDTO> results = recommendationService.getRecommendations("luis");

        // Assert
        boolean containsEnrolled = results.stream().anyMatch(r -> r.id().equals(101L));
        assertFalse(containsEnrolled, "No debe recomendar cursos ya matriculados");
    }

    @Test
    @DisplayName("Debe manejar repositorios nulos de forma segura y devolver una lista vacía")
    void getRecommendationsForUser_WithNullRepositoryData_ShouldReturnEmptyList() {
        List<RecommendationDTO> results = recommendationService.getRecommendationsForUser(1L);

        assertNotNull(results);
        assertTrue(results.isEmpty());
    }

    @Test
    @DisplayName("Debe devolver lista vacía si el usuario no existe")
    void getRecommendations_UserNotFound() {
        // Arrange
        when(userRepository.findByUsername("desconocido")).thenReturn(Optional.empty());

        // Act
        List<RecommendationDTO> results = recommendationService.getRecommendations("desconocido");

        // Assert
        assertTrue(results.isEmpty());
        verify(coursesRepository, never()).findAll();
    }

    @Test
    @DisplayName("ALGORITMO [ADR-32] - PESOS: El motor debe calcular los pesos dinámicamente y priorizar en la posición 0 al curso con mayor coincidencia de perfil")
    void getRecommendations_DebeOrdenarPorPesosAlgoritmicos_CuandoExistenVariosIntereses() {
        // 1. Configuración de un perfil expandido para Luis para forzar pesos
        // diferentes
        userInterests.setCategory(new ArrayList<>(Arrays.asList("Ciencia de Datos", "Inteligencia Artificial")));
        userInterests.setLanguage(new ArrayList<>(Arrays.asList("Espanol")));
        userInterests.setCourse_type(new ArrayList<>(Arrays.asList("Avanzado")));

        // course1 tendrá: Match Categoría (+30) | No match idioma ni nivel = 30 Puntos
        course1.setLanguage("Ingles");
        course1.setCourseType("Principiante");

        // Fabricamos course3: Match Categoría (+30) + Match Idioma (+15) + Match Nivel
        // (+20) = 65 Puntos
        // Además probamos la normalización lingüística nativa de tu servicio ("Español"
        // -> "espanol")
        Courses course3 = new Courses();
        course3.setCourse_id(103L);
        course3.setTitle("Master en Machine Learning e IA");
        course3.setCategory("Inteligencia Artificial");
        course3.setLanguage("Español");
        course3.setCourseType("Avanzado");
        course3.setInstructors("Profesor C");

        // 2. Mockear el Read Path
        when(userRepository.findByUsername("luis")).thenReturn(Optional.of(mockUser));
        when(interestRepository.findByUser_Username("luis")).thenReturn(Optional.of(userInterests));
        when(enrollmentRepository.findAllByUserIdWithCourses(1L)).thenReturn(new ArrayList<>());

        // Dataset desordenado intencionadamente en el Mock del repositorio
        when(coursesRepository.findAll()).thenReturn(Arrays.asList(course1, course2, course3));

        // 3. Ejecución
        List<RecommendationDTO> results = recommendationService.getRecommendations("luis");

        // 4. Aserciones Académicas
        assertNotNull(results, "El dataset de recomendaciones no puede ser nulo.");
        assertFalse(results.isEmpty(), "Debe retornar los cursos ponderados por peso.");

        // course3 (65 pts) debe adelantar limpiamente a course1 (30 pts) en la
        // ordenación descendente
        assertEquals(103L, results.get(0).id(),
                "FALLO ALGORÍTMICO: El motor no priorizó el curso con el peso de coincidencia más alto.");
        assertEquals("Master en Machine Learning e IA", results.get(0).title());

        // El curso de Marketing (0 pts) queda relegado al final de la cola
        int ultimoIndice = results.size() - 1;
        assertEquals(102L, results.get(ultimoIndice).id(),
                "El curso sin ninguna coincidencia temática debe quedar al final.");

        verify(coursesRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("Debe devolver lista vacía si el nombre de usuario es nulo o en blanco")
    void getRecommendations_WithBlankUsername_ShouldReturnEmptyList() {
        assertTrue(recommendationService.getRecommendations(null).isEmpty());
        assertTrue(recommendationService.getRecommendations("   ").isEmpty());
    }

    @Test
    @DisplayName("Debe devolver lista vacía cuando se pide por userId nulo")
    void getRecommendationsForUser_WithNullUserId_ShouldReturnEmptyList() {
        assertTrue(recommendationService.getRecommendationsForUser(null).isEmpty());
    }

    @Test
    @DisplayName("Debe tolerar intereses y colecciones nulas sin romper el algoritmo")
    void getRecommendations_WithNullInterestsAndCollections_ShouldReturnCourses() {
        userInterests.setCategory(null);
        userInterests.setCourse_type(null);
        userInterests.setLanguage(null);
        userInterests.setSubtitle_languages(null);
        userInterests.setDuration(null);

        when(userRepository.findByUsername("luis")).thenReturn(Optional.of(mockUser));
        when(interestRepository.findByUser_Username("luis")).thenReturn(Optional.of(userInterests));
        when(enrollmentRepository.findAllByUserIdWithCourses(1L)).thenReturn(new ArrayList<>());
        when(coursesRepository.findAll()).thenReturn(Arrays.asList(course1, course2));

        List<RecommendationDTO> results = recommendationService.getRecommendations("luis");

        assertFalse(results.isEmpty());
        assertEquals(101L, results.get(0).id());
    }

    @Test
    @DisplayName("PESOS [Ajuste]: historial académico al 50% debe aportar 8 puntos")
    void getRecommendations_HistoryScoreAt50_WhenProgressIsAtLeast50() {
        Courses historyCourse = new Courses();
        historyCourse.setCourse_id(999L);
        historyCourse.setCategory("Ciencia de Datos");
        Enrollment progress50 = new Enrollment();
        progress50.setCourse(historyCourse);
        progress50.setProgress_percentage(50);

        when(userRepository.findByUsername("luis")).thenReturn(Optional.of(mockUser));
        when(interestRepository.findByUser_Username("luis")).thenReturn(Optional.of(userInterests));
        when(enrollmentRepository.findAllByUserIdWithCourses(1L)).thenReturn(Arrays.asList(progress50));
        when(coursesRepository.findAll()).thenReturn(Arrays.asList(course1));

        List<RecommendationDTO> results = recommendationService.getRecommendations("luis");

        assertEquals(38, results.get(0).score());
    }

    @Test
    @DisplayName("PESOS [Ajuste]: historial académico al 75% debe aportar 15 puntos")
    void getRecommendations_HistoryScoreAt75_WhenProgressIsAtLeast75() {
        Courses historyCourse = new Courses();
        historyCourse.setCourse_id(998L);
        historyCourse.setCategory("Ciencia de Datos");
        Enrollment progress75 = new Enrollment();
        progress75.setCourse(historyCourse);
        progress75.setProgress_percentage(75);

        when(userRepository.findByUsername("luis")).thenReturn(Optional.of(mockUser));
        when(interestRepository.findByUser_Username("luis")).thenReturn(Optional.of(userInterests));
        when(enrollmentRepository.findAllByUserIdWithCourses(1L)).thenReturn(Arrays.asList(progress75));
        when(coursesRepository.findAll()).thenReturn(Arrays.asList(course1));

        List<RecommendationDTO> results = recommendationService.getRecommendations("luis");

        assertEquals(45, results.get(0).score());
    }

    @Test
    @DisplayName("PESOS [Ajuste]: historial académico al 100% debe aportar 20 puntos máximos")
    void getRecommendations_HistoryScoreCap20_WhenProgressIsAtLeast100() {
        // Arrange: curso plantilla ya cursado en la misma categoría para activar el
        // bonus histórico
        Courses completedTemplateCourse = new Courses();
        completedTemplateCourse.setCourse_id(900L);
        completedTemplateCourse.setTitle("Plantilla Completada");
        completedTemplateCourse.setCategory("Ciencia de Datos");

        Enrollment completedEnrollment = new Enrollment();
        completedEnrollment.setCourse(completedTemplateCourse);
        completedEnrollment.setProgress_percentage(100);

        when(userRepository.findByUsername("luis")).thenReturn(Optional.of(mockUser));
        when(interestRepository.findByUser_Username("luis")).thenReturn(Optional.of(userInterests));
        when(enrollmentRepository.findAllByUserIdWithCourses(1L)).thenReturn(Arrays.asList(completedEnrollment));
        when(coursesRepository.findAll()).thenReturn(Arrays.asList(course1, course2));

        // Act
        List<RecommendationDTO> results = recommendationService.getRecommendations("luis");

        // Assert: curso1 recibe categoría (30) + historial completo (20) = 50
        RecommendationDTO topRecommendation = results.get(0);
        assertEquals(101L, topRecommendation.id());
        assertEquals(50, topRecommendation.score(),
                "El peso total esperado debe ser 50 (30 por categoría + 20 por historial >= 100). ");
    }
}
