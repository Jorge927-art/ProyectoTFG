package com.cursosonline.backend.dto;

import java.math.BigDecimal;

/**
 * Contrato de transferencia (DTO) para que el profesor transmita
 * de forma segura la calificación de un alumno.
 */
public record TeacherGradeRequest(
        Long enrollmentId,
        String title, // "Trabajo Académico Escrito" o "Examen Final"
        BigDecimal score, // Ej: 8.5
        String feedback) {
}
