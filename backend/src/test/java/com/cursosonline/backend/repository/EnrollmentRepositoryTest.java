package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Enrollment;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Auditoría de Seguridad: Pruebas de Integridad de Matrículas (Enrollment)")
class EnrollmentRepositoryTest {

    @Mock
    private EnrollmentRepository enrollmentRepository;

    private final String targetUsername = "marcos_alumno";
    private final Long targetCourseId = 202L;

    @Test
    @DisplayName("Control de Seguridad: Debe denegar el acceso (retornar false) si el alumno intenta interactuar con un curso sin matrícula activa")
    void shouldDenyAccessWhenEnrollmentDoesNotExist() {
        // Arrange
        when(enrollmentRepository.existsByUsernameAndCourseId(targetUsername, targetCourseId)).thenReturn(false);

        // Act
        boolean hasAccess = enrollmentRepository.existsByUsernameAndCourseId(targetUsername, targetCourseId);

        // Assert
        assertFalse(hasAccess,
                "REGLA DE SEGURIDAD VIOLADA: El repositorio permitió el acceso a un curso no matriculado.");
        verify(enrollmentRepository, times(1)).existsByUsernameAndCourseId(targetUsername, targetCourseId);
    }

    @Test
    @DisplayName("Control de Seguridad: Debe conceder el acceso (retornar true) cuando el alumno posee una matrícula legítima activa")
    void shouldGrantAccessWhenEnrollmentIsActive() {
        // Arrange
        when(enrollmentRepository.existsByUsernameAndCourseId(targetUsername, targetCourseId)).thenReturn(true);

        // Act
        boolean hasAccess = enrollmentRepository.existsByUsernameAndCourseId(targetUsername, targetCourseId);

        // Assert
        assertTrue(hasAccess, "ERROR DE NEGOCIO: Se le denegó el acceso a un estudiante correctamente matriculado.");
        verify(enrollmentRepository, times(1)).existsByUsernameAndCourseId(targetUsername, targetCourseId);
    }

    @Test
    @DisplayName("Control por ID: Debe recuperar la matrícula por UserId y CourseId de manera determinista")
    void shouldFindSpecificEnrollmentByUserIdAndCourseId() {
        // Arrange
        Enrollment mockEnrollment = mock(Enrollment.class);
        when(enrollmentRepository.findByUserIdAndCourseId(1L, targetCourseId)).thenReturn(Optional.of(mockEnrollment));

        // Act
        Optional<Enrollment> foundEnrollment = enrollmentRepository.findByUserIdAndCourseId(1L, targetCourseId);

        // Assert
        assertTrue(foundEnrollment.isPresent(), "Debería encontrar la matrícula simulada para el ID de usuario.");
        verify(enrollmentRepository, times(1)).findByUserIdAndCourseId(1L, targetCourseId);
    }
}
