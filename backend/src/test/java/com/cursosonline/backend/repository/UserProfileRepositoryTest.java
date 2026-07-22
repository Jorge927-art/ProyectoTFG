package com.cursosonline.backend.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Suite de Pruebas Unitarias para UserProfileRepository")
class UserProfileRepositoryTest {

    private UserProfileRepository userProfileRepository;
    private final Long sampleProfileId = 1L;
    private final String samplePhone = "+34600123456";
    private final String sampleAddress = "Calle Mayor 12, Madrid";

    @BeforeEach
    void setUp() {
        // Creamos el simulador directo para el repositorio de perfil de usuario
        userProfileRepository = Mockito.mock(UserProfileRepository.class);
    }

    /*
     * =========================================================================
     * 1. VERIFICACIÓN: updateProfileFieldsDirectly (OPERACIÓN DE MODIFICACIÓN)
     * =========================================================================
     */
    @Test
    @DisplayName("Debe invocar la consulta de actualización directa con los parámetros relacionales correctos")
    void updateProfileFieldsDirectly_ShouldExecuteSuccessfully() {
        // Al ser un método void anotado con @Modifying, configuramos el comportamiento
        // de simulación
        doNothing().when(userProfileRepository).updateProfileFieldsDirectly(sampleProfileId, samplePhone,
                sampleAddress);

        // Ejecutamos la lógica bajo prueba
        userProfileRepository.updateProfileFieldsDirectly(sampleProfileId, samplePhone, sampleAddress);

        // Certificamos de forma atómica que el repositorio invocó la sentencia con los
        // argumentos exactos
        verify(userProfileRepository, times(1)).updateProfileFieldsDirectly(
                eq(sampleProfileId), eq(samplePhone), eq(sampleAddress));
    }
}
