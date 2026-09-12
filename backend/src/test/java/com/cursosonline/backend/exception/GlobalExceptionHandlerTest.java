package com.cursosonline.backend.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.access.AccessDeniedException;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("GlobalExceptionHandler - Mapeo consistente de errores HTTP")
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("Mapea ResourceNotFoundException a 404 conservando mensaje")
    void handleNotFound_ShouldReturn404() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Curso no encontrado");

        ResponseEntity<ErrorResponse> response = handler.handleNotFound(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(404, response.getBody().getStatus());
        assertEquals("Curso no encontrado", response.getBody().getMessage());
        assertTrue(response.getBody().getTimestamp() > 0L);
    }

    @Test
    @DisplayName("Mapea UserAlreadyExistsException a 409")
    void handleConflict_ShouldReturn409() {
        UserAlreadyExistsException ex = new UserAlreadyExistsException("luis");

        ResponseEntity<ErrorResponse> response = handler.handleConflict(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(409, response.getBody().getStatus());
        assertTrue(response.getBody().getMessage().contains("luis"));
    }

    @Test
    @DisplayName("Mapea ServicesException a 400")
    void handleBusinessError_ShouldReturn400() {
        ServicesException ex = new ServicesException("Regla de negocio inválida");

        ResponseEntity<ErrorResponse> response = handler.handleBusinessError(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().getStatus());
        assertEquals("Regla de negocio inválida", response.getBody().getMessage());
    }

    @Test
    @DisplayName("Mapea AuthenticationException a 401 con mensaje seguro")
    void handleAuthenticationError_ShouldReturn401() {
        BadCredentialsException ex = new BadCredentialsException("detalle interno");

        ResponseEntity<ErrorResponse> response = handler.handleAuthenticationError(ex);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(401, response.getBody().getStatus());
        assertEquals("Credenciales de acceso inválidas.", response.getBody().getMessage());
    }

    @Test
    @DisplayName("Mapea AccessDeniedException a 403")
    void handleAccessDenied_ShouldReturn403() {
        AccessDeniedException ex = new AccessDeniedException("forbidden");

        ResponseEntity<ErrorResponse> response = handler.handleAccessDenied(ex);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(403, response.getBody().getStatus());
        assertTrue(response.getBody().getMessage().contains("Acceso denegado"));
    }

    @Test
    @DisplayName("Mapea IllegalArgumentException a 400 propagando mensaje funcional")
    void handleIllegalArgument_ShouldReturn400() {
        IllegalArgumentException ex = new IllegalArgumentException("El campo role es requerido");

        ResponseEntity<ErrorResponse> response = handler.handleIllegalArgument(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().getStatus());
        assertEquals("El campo role es requerido", response.getBody().getMessage());
    }

    @Test
    @DisplayName("Mapea HttpMessageNotReadableException a 400 con mensaje de payload")
    void handleUnreadablePayload_ShouldReturn400() {
        HttpMessageNotReadableException ex = new HttpMessageNotReadableException("bad payload",
                (HttpInputMessage) null);

        ResponseEntity<ErrorResponse> response = handler.handleUnreadablePayload(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().getStatus());
        assertTrue(response.getBody().getMessage().contains("Formato de datos incorrecto"));
    }

    @Test
    @DisplayName("Mapea excepción genérica a 500")
    void handleGeneralError_ShouldReturn500() {
        Exception ex = new Exception("fallo inesperado");

        ResponseEntity<ErrorResponse> response = handler.handleGeneralError(ex);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(500, response.getBody().getStatus());
        assertEquals("Error interno en el servidor.", response.getBody().getMessage());
    }
}
