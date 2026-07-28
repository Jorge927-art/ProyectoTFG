package com.cursosonline.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Manejador global de excepciones para la aplicación. Captura y maneja
 * excepciones específicas y genéricas, proporcionando respuestas HTTP adecuadas
 * GlobalExceptionHandler
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Maneja excepciones de tipo ResourceNotFoundException y devuelve una
     * respuesta HTTP con el código de estado 404 (Not Found) y un mensaje de error.
     * 
     * @param ex La excepción ResourceNotFoundException lanzada.
     * @return ResponseEntity con el error y el código de estado 404.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                ex.getMessage(),
                System.currentTimeMillis());
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    /**
     * Maneja excepciones de tipo UserAlreadyExistsException y devuelve una
     * respuesta HTTP con el código de estado 409 (Conflict) y un mensaje de error.
     * 
     * @param ex La excepción UserAlreadyExistsException lanzada.
     * @return ResponseEntity con el error y el código de estado 409.
     */
    @ExceptionHandler(UserAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleConflict(UserAlreadyExistsException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                ex.getMessage(),
                System.currentTimeMillis());
        return new ResponseEntity<>(error, HttpStatus.CONFLICT);
    }

    /**
     * Maneja excepciones de tipo ServicesException y devuelve una
     * respuesta HTTP con el código de estado 400 (Bad Request) y un mensaje de
     * error.
     * 
     * @param ex La excepción ServicesException lanzada.
     * @return ResponseEntity con el error y el código de estado 400.
     */
    @ExceptionHandler(ServicesException.class)
    public ResponseEntity<ErrorResponse> handleBusinessError(ServicesException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage(),
                System.currentTimeMillis());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    /**
     * Maneja excepciones de tipo AuthenticationException y devuelve una
     * respuesta HTTP con el código de estado 401 (Unauthorized) y un mensaje de
     * error.
     * 
     * @param ex La excepción AuthenticationException lanzada.
     * @return ResponseEntity con el error y el código de estado 401.
     */
    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationError(
            org.springframework.security.core.AuthenticationException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                "Credenciales de acceso inválidas.", // Mensaje seguro para el login
                System.currentTimeMillis());
        return new ResponseEntity<>(error, HttpStatus.UNAUTHORIZED);
    }

    /**
     * Maneja excepciones de tipo AccessDeniedException y devuelve una
     * respuesta HTTP con el código de estado 403 (Forbidden) y un mensaje de error.
     * 
     * @param ex La excepción AccessDeniedException lanzada.
     * @return ResponseEntity con el error y el código de estado 403.
     */
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            org.springframework.security.access.AccessDeniedException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.FORBIDDEN.value(),
                "Acceso denegado: No posee los privilegios requeridos para este recurso.",
                System.currentTimeMillis());
        return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
    }

    /**
     * Maneja excepciones de tipo IllegalArgumentException y devuelve una
     * respuesta HTTP con el código de estado 400 (Bad Request) y un mensaje de
     * error.
     * 
     * @param ex La excepción IllegalArgumentException lanzada.
     * @return ResponseEntity con el error y el código de estado 400.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage(), // Envía "Rol inválido..." o "El campo role es requerido"
                System.currentTimeMillis());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    /**
     * Maneja cualquier otra excepción no capturada específicamente y devuelve una
     * respuesta HTTP con el código de estado 500 (Internal Server Error) y un
     * mensaje de error genérico.
     * 
     * @param ex La excepción Exception lanzada.
     * @return ResponseEntity con el error y el código de estado 500.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneralError(Exception ex) {
        ex.printStackTrace(); // Mantiene tu traza de depuración en la consola del servidor
        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Error interno en el servidor.",
                System.currentTimeMillis());
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
