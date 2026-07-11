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

        // 2. Configurar catálogo de cursos (Dataset de Coursera) [3]
        course1 = new Courses();
        course1.setCourse_id(101L);
        course1.setTitle("Data Science Avanzado");
        course1.setCategory("Ciencia de Datos");
        course1.setInstructors("Profesor A");

        course2 = new Courses();
        course2.setCourse_id(102L);
        course2.setTitle("Introducción al Marketing");
        course2.setCategory("Negocios");
        course2.setInstructors("Profesor B");

        // 3. Configurar intereses del alumno [4, 5]
        userInterests = new Interest();
        userInterests.setUser(mockUser);
        userInterests.setCategory(new ArrayList<>(Arrays.asList("Ciencia de Datos")));
    }

    @Test
    @DisplayName("Debe recomendar cursos basados en la categoría de interés")
    void getRecommendations_Success() {
        // Arrange
        when(userRepository.findByUsername("luis")).thenReturn(Optional.of(mockUser));
        when(interestRepository.findByUser_Username("luis")).thenReturn(Optional.of(userInterests));
        when(enrollmentRepository.findAllByUserIdWithCourses(1L)).thenReturn(new ArrayList<>()); // Sin matrículas previas
        when(coursesRepository.findAll()).thenReturn(Arrays.asList(course1, course2));

        // Act
        List<RecommendationDTO> results = recommendationService.getRecommendations("luis");

        // Assert
        assertNotNull(results);
        assertFalse(results.isEmpty());
        assertEquals("Data Science Avanzado", results.get(0).title());
        assertTrue(results.get(0).reason().contains("Ciencia de Datos"), "El motivo debe mencionar la categoría");
        assertEquals(101L, results.get(0).id());
    }

    @Test
    @DisplayName("Debe excluir estrictamente cursos donde el alumno ya está matriculado [ADR-32]")
    void getRecommendations_ExcludesEnrolled() {
        // Arrange
        Enrollment existingEnrollment = new Enrollment();
        existingEnrollment.setCourse(course1); // El alumno ya está en el curso 101

        when(userRepository.findByUsername("luis")).thenReturn(Optional.of(mockUser));
        when(interestRepository.findByUser_Username("luis")).thenReturn(Optional.of(userInterests));
        when(enrollmentRepository.findAllByUserIdWithCourses(1L)).thenReturn(Arrays.asList(existingEnrollment));
        when(coursesRepository.findAll()).thenReturn(Arrays.asList(course1, course2));

        // Act
        List<RecommendationDTO> results = recommendationService.getRecommendations("luis");

        // Assert
        // Solo debe quedar el curso 2 (Marketing), aunque no sea su interés principal, 
        // porque el curso 1 (Data Science) debe ser excluido.
        boolean containsEnrolled = results.stream().anyMatch(r -> r.id().equals(101L));
        assertFalse(containsEnrolled, "No debe recomendar cursos ya matriculados");
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
}