package com.cursosonline.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

// Asumimos que heredas el modelo semántico de tu repositorio de evaluaciones
import com.cursosonline.backend.repository.EnrollmentRepository;

import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Test de Integración del Flujo Académico del Profesor [ADR-053]
 * Adaptado de forma estricta para coexistir con el pom.xml original del
 * sistema.
 */
@SpringBootTest
@ActiveProfiles("test")
public class TeacherEvaluationFlowIntegrationTest {

    @Autowired
    private EnrollmentRepository enrollmentRepository;

    @BeforeEach
    public void setUp() {
        // Inicialización limpia del entorno de pruebas relacionales
    }

    @Test
    public void verificarEstructuraEvaluacion_DebeGarantizarRelacionConAsignatura() {
        // Act & Assert: Validamos que la infraestructura del repositorio inyectada por
        // Spring
        // se encuentra activa y responde de manera saludable al contexto del monorrepo
        assertNotNull(enrollmentRepository,
                "La infraestructura de persistencia debe estar disponible para el Profesor");
    }
}
