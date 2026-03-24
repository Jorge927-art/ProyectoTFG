package com.cursosonline.backend.exception;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data // Genera getters, setters, toString, etc. automáticamente
@AllArgsConstructor
@NoArgsConstructor

/**
 * Clase que representa la estructura de la respuesta de error para las
 * excepciones
 * personalizadas. Contiene el código de estado HTTP, un mensaje descriptivo, un
 */
public class ErrorResponse {
    private int status;
    private String message;
    private long timestamp;
    private Map<String, String> errors;

    /**
     * Constructor para crear una instancia de ErrorResponse sin errores de
     * validación.
     * 
     * @param status
     * @param message
     * @param timestamp
     */
    public ErrorResponse(int status, String message, long timestamp) {
        this.status = status;
        this.message = message;
        this.timestamp = timestamp;
        this.errors = null;
    }
}
