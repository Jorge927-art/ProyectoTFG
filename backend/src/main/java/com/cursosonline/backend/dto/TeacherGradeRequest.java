package com.cursosonline.backend.dto;

/**
 * Contrato de transferencia (DTO) para que el profesor transmita
 * de forma segura la calificación de un alumno.
 */
public record TeacherGradeRequest(
        Long enrollmentId,
        String title, // "Trabajo Académico Escrito" o "Examen Final"
        String score // Ej: "8.5"
) {
}
