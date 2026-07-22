package com.cursosonline.backend.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;

import java.lang.reflect.Field;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@DisplayName("Suite de Pruebas Unitarias para WebConfig")
class WebConfigTest {

    private WebConfig webConfig;
    private ResourceHandlerRegistry mockRegistry;
    private ResourceHandlerRegistration mockRegistration;
    private final String mockUploadDir = "/var/www/uploads";

    @BeforeEach
    void setUp() throws Exception {
        // 1. Instanciar de forma nativa la clase de configuración
        webConfig = new WebConfig();

        // 2. Inyectar el valor de la propiedad uploadDir mediante reflexión
        Field uploadDirField = WebConfig.class.getDeclaredField("uploadDir");
        uploadDirField.setAccessible(true);
        uploadDirField.set(webConfig, mockUploadDir);

        // 3. Crear los simuladores (mocks) para la fluent API de Spring MVC
        mockRegistry = mock(ResourceHandlerRegistry.class);
        mockRegistration = mock(ResourceHandlerRegistration.class);
    }

    /*
     * =========================================================================
     * 1. VERIFICACIÓN DEL REGISTRO DE RECURSOS (addResourceHandlers)
     * =========================================================================
     */
    @Test
    @DisplayName("Debe mapear la ruta /uploads/** hacia la localización física en el disco")
    void addResourceHandlers_ShouldRegisterCorrectRouteAndLocation() {
        // Configuramos el comportamiento encadenado (Fluent API) de Spring MVC
        when(mockRegistry.addResourceHandler("/uploads/**")).thenReturn(mockRegistration);
        when(mockRegistration.addResourceLocations(anyString())).thenReturn(mockRegistration);

        // Ejecutamos la lógica bajo prueba
        webConfig.addResourceHandlers(mockRegistry);

        // Verificamos de forma secuencial que se llamaron a los métodos con las rutas
        // exactas
        verify(mockRegistry, times(1)).addResourceHandler("/uploads/**");
        verify(mockRegistration, times(1)).addResourceLocations("file:" + mockUploadDir + "/");
    }
}
