package com.cursosonline.backend.config;

import com.cursosonline.backend.security.jwt.JwtAuthenticationFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.lang.reflect.Field;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@DisplayName("Suite de Pruebas Unitarias para SecurityConfig")
class SecurityConfigTest {

    private SecurityConfig securityConfig;
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @BeforeEach
    void setUp() throws Exception {
        // 1. Crear mock puro del filtro JWT requerido en el constructor
        jwtAuthenticationFilter = Mockito.mock(JwtAuthenticationFilter.class);

        // 2. Instanciar la clase de configuración de seguridad de forma nativa
        securityConfig = new SecurityConfig(jwtAuthenticationFilter);

        // 3. Inyectar mediante reflexión el valor de la propiedad @Value de los Origins
        // Esto previene que allowedOrigins sea nulo al inicializarse fuera del contexto
        // de Spring
        Field allowedOriginsField = SecurityConfig.class.getDeclaredField("allowedOrigins");
        allowedOriginsField.setAccessible(true);
        allowedOriginsField.set(securityConfig, List.of("http://localhost:5173", "http://127.0.0.1:5173"));
    }

    /*
     * =========================================================================
     * 1. VERIFICACIÓN DEL CODIFICADOR DE CONTRASEÑAS (PasswordEncoder)
     * =========================================================================
     */
    @Test
    @DisplayName("Debe instanciar correctamente BCrypt como el codificador de contraseñas")
    void passwordEncoder_ShouldReturnBCryptInstance() {
        PasswordEncoder encoder = securityConfig.passwordEncoder();

        assertNotNull(encoder, "El codificador no debe ser nulo");
        assertTrue(encoder instanceof BCryptPasswordEncoder, "Debe ser una instancia de BCrypt");
    }

    /*
     * =========================================================================
     * 2. VERIFICACIÓN DE LA CONFIGURACIÓN CORS (CorsConfigurationSource)
     * =========================================================================
     */
    @Test
    @DisplayName("Debe configurar de forma exacta los métodos, cabeceras y orígenes de la política CORS")
    void corsConfigurationSource_ShouldHaveCorrectSettings() {
        CorsConfigurationSource source = securityConfig.corsConfigurationSource();
        assertNotNull(source, "La fuente CORS no debe ser nula");

        // Evaluamos la configuración registrada para la ruta raíz global
        CorsConfiguration config = source
                .getCorsConfiguration(new org.springframework.mock.web.MockHttpServletRequest());
        assertNotNull(config, "La configuración CORS para /** no debe ser nula");

        // Validamos la correspondencia exacta con las propiedades inyectadas de
        // producción
        assertEquals(2, config.getAllowedOrigins().size(), "Debe contener los 2 orígenes configurados en el setUp");
        assertTrue(config.getAllowedOrigins().contains("http://localhost:5173"));
        assertTrue(config.getAllowCredentials(), "Debe permitir credenciales explícitas (Cookies/Headers)");
        // Validamos la lista de verbos HTTP soportados por la arquitectura
        List<String> expectedMethods = List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
        assertTrue(config.getAllowedMethods().containsAll(expectedMethods),
                "Debe soportar todos los métodos HTTP estándar");
    }

    /*
     * =========================================================================
     * 3. VERIFICACIÓN DEL ADMINISTRADOR DE AUTENTICACIÓN (AuthenticationManager)
     * =========================================================================
     */
    @Test
    @DisplayName("Debe delegar correctamente la resolución del AuthenticationManager en la configuración de Spring")
    void authenticationManager_ShouldDelegateToConfiguration() throws Exception {
        AuthenticationConfiguration mockConfig = Mockito.mock(AuthenticationConfiguration.class);
        AuthenticationManager mockManager = Mockito.mock(AuthenticationManager.class);

        when(mockConfig.getAuthenticationManager()).thenReturn(mockManager);

        AuthenticationManager resultManager = securityConfig.authenticationManager(mockConfig);

        assertNotNull(resultManager, "El AuthenticationManager resuelto no debe ser nulo");
        assertEquals(mockManager, resultManager, "Debe retornar exactamente la instancia provista por Spring Security");
    }
}
