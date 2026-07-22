package com.cursosonline.backend.security;

import com.cursosonline.backend.security.jwt.JwtAuthenticationFilter;
import com.cursosonline.backend.security.jwt.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DisplayName("Suite de Pruebas Unitarias para JwtAuthenticationFilter")
class JwtAuthenticationFilterTest {

    private JwtService jwtService;
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    private FilterChain mockFilterChain;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();

        jwtService = mock(JwtService.class);
        mockFilterChain = mock(FilterChain.class);

        jwtAuthenticationFilter = new JwtAuthenticationFilter(jwtService);

        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    /*
     * =========================================================================
     * 1. FLUJO SIN TOKEN: CABECERA AUSENTE
     * =========================================================================
     */
    @Test
    @DisplayName("Debe ignorar la autenticación y continuar la cadena si no se provee cabecera Authorization")
    void doFilterInternal_WithoutAuthorizationHeader_ShouldContinueChain() throws Exception {
        // Invocación segura mediante reflexión o uso directo si los paquetes lo
        // permiten
        try {
            java.lang.reflect.Method method = JwtAuthenticationFilter.class.getDeclaredMethod(
                    "doFilterInternal",
                    jakarta.servlet.http.HttpServletRequest.class,
                    jakarta.servlet.http.HttpServletResponse.class,
                    jakarta.servlet.FilterChain.class

            );
            method.setAccessible(true);
            method.invoke(jwtAuthenticationFilter, request, response, mockFilterChain);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        verify(mockFilterChain, times(1)).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication(), "El contexto debe permanecer anónimo");
    }

    /*
     * =========================================================================
     * 2. FLUJO DE RECHAZO: TOKEN INVÁLIDO O EXPIRADO (401)
     * =========================================================================
     */
    @Test
    @DisplayName("Debe interrumpir la cadena y retornar 401 si el token es inválido o ha expirado")
    void doFilterInternal_InvalidToken_ShouldReturn401() throws Exception {
        request.addHeader("Authorization", "Bearer token-invalido-123");
        when(jwtService.isTokenValid("token-invalido-123")).thenReturn(false);

        try {
            java.lang.reflect.Method method = JwtAuthenticationFilter.class.getDeclaredMethod(
                    "doFilterInternal",
                    jakarta.servlet.http.HttpServletRequest.class,
                    jakarta.servlet.http.HttpServletResponse.class,
                    jakarta.servlet.FilterChain.class);
            method.setAccessible(true);
            method.invoke(jwtAuthenticationFilter, request, response, mockFilterChain);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        assertEquals(HttpServletResponse.SC_UNAUTHORIZED, response.getStatus());
        assertEquals("application/json", response.getContentType());
        assertTrue(response.getContentAsString().contains("Token expirado o inválido"));

        verify(mockFilterChain, never()).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    /*
     * =========================================================================
     * 3. FLUJO EXITOSO: AUTENTICACIÓN COMPLETA E INYECCIÓN EN CONTEXTO
     * =========================================================================
     */
    @Test
    @DisplayName("Debe autenticar al usuario y poblar el contexto si el token es 100% válido")
    void doFilterInternal_ValidToken_ShouldAuthenticateAndPopulateContext() throws Exception {
        request.addHeader("Authorization", "Bearer token-valido-xyz");
        when(jwtService.isTokenValid("token-valido-xyz")).thenReturn(true);
        when(jwtService.extractUsername("token-valido-xyz")).thenReturn("alumno_tfg");
        when(jwtService.extractRole("token-valido-xyz")).thenReturn("ROLE_STUDENT");

        try {
            java.lang.reflect.Method method = JwtAuthenticationFilter.class.getDeclaredMethod(
                    "doFilterInternal",
                    jakarta.servlet.http.HttpServletRequest.class,
                    jakarta.servlet.http.HttpServletResponse.class,
                    jakarta.servlet.FilterChain.class);
            method.setAccessible(true);
            method.invoke(jwtAuthenticationFilter, request, response, mockFilterChain);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        verify(mockFilterChain, times(1)).doFilter(request, response);

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication, "El contexto de seguridad no debe estar vacío");
        assertEquals("alumno_tfg", authentication.getName());
        assertTrue(authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT")), "Debe poseer la autoridad asignada en el JWT");
    }

    /*
     * =========================================================================
     * 4. SALVAGUARDA ANTE EXCEPCIONES CRIPTOGRÁFICAS
     * =========================================================================
     */
    @Test
    @DisplayName("Debe limpiar el contexto y responder con 401 ante cualquier fallo inesperado de la biblioteca JWT")
    void doFilterInternal_ServiceException_ShouldClearContextAndReturn401() throws Exception {
        request.addHeader("Authorization", "Bearer token-corrupto");
        when(jwtService.isTokenValid("token-corrupto")).thenThrow(new RuntimeException("Firma alterada ilegalmente"));

        try {
            java.lang.reflect.Method method = JwtAuthenticationFilter.class.getDeclaredMethod(
                    "doFilterInternal",
                    jakarta.servlet.http.HttpServletRequest.class,
                    jakarta.servlet.http.HttpServletResponse.class,
                    jakarta.servlet.FilterChain.class);
            method.setAccessible(true);
            method.invoke(jwtAuthenticationFilter, request, response, mockFilterChain);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        assertEquals(HttpServletResponse.SC_UNAUTHORIZED, response.getStatus());
        assertTrue(response.getContentAsString().contains("Error de autenticación criptográfica"));
        verify(mockFilterChain, never()).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
}
