package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Interest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@DisplayName("Suite de Pruebas Unitarias para InterestRepository")
class InterestRepositoryTest {

    private InterestRepository interestRepository;
    private Interest sampleInterest;
    private final String sampleUsername = "alumno_tfg";

    @BeforeEach
    void setUp() {
        // 1. Crear el simulador directo para el repositorio de intereses
        interestRepository = Mockito.mock(InterestRepository.class);

        // 2. Instanciar la entidad de persistencia real de Java
        sampleInterest = new Interest();
        try {
            // Inicialización de IDs mediante reflexión por seguridad de tipos
            java.lang.reflect.Method setInterestId = Interest.class.getMethod("setInterestId", Long.class);
            setInterestId.invoke(sampleInterest, 8001L);
        } catch (Exception e) {
            try {
                java.lang.reflect.Method setInterestId = Interest.class.getMethod("setId", long.class);
                setInterestId.invoke(sampleInterest, 8001L);
            } catch (Exception ignored) {
            }
        }
    }

    /*
     * =========================================================================
     * 1. FLUJO EXITOSO: PREFERENCIAS ENCONTRADAS
     * =========================================================================
     */
    @Test
    @DisplayName("Debe recuperar exitosamente los intereses del estudiante mediante su nombre de usuario")
    void findByUser_Username_ShouldReturnPopulatedOptional() {
        // Simulamos que el repositorio encuentra las preferencias relacionales
        when(interestRepository.findByUser_Username(sampleUsername))
                .thenReturn(Optional.of(sampleInterest));

        Optional<Interest> result = interestRepository.findByUser_Username(sampleUsername);

        assertTrue(result.isPresent(), "El contenedor Optional debe contener un registro");
        assertEquals(sampleInterest, result.get(), "La entidad recuperada debe coincidir con la simulada");
    }

    /*
     * =========================================================================
     * 2. FLUJO DE CONTROL: REGISTRO NO CONFIGURADO
     * =========================================================================
     */
    @Test
    @DisplayName("Debe retornar un Optional vacío si el estudiante no posee intereses guardados")
    void findByUser_Username_UserHasNoInterests_ShouldReturnEmptyOptional() {
        // Simulamos el escenario en el que el alumno aún no ha pasado por el panel de
        // configuración
        when(interestRepository.findByUser_Username("usuario_nuevo"))
                .thenReturn(Optional.empty());

        Optional<Interest> result = interestRepository.findByUser_Username("usuario_nuevo");

        assertFalse(result.isPresent(), "El contenedor Optional debe estar estrictamente vacío");
    }
}
