package com.cursosonline.backend.exception;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data // Genera Getters y Setters
@AllArgsConstructor // Genera constructor con todos los campos
@NoArgsConstructor // Genera constructor vacío
public class ErrorResponse {
    private int status;
    private String message;
    private long timestamp;
    private Map<String, String> errors;

    // Constructor manual para cuando no hay errores de validación (el mapa es null)
    public ErrorResponse(int status, String message, long timestamp) {
        this.status = status;
        this.message = message;
        this.timestamp = timestamp;
        this.errors = null;
    }
}
