package com.cursosonline.backend.dto;

import com.cursosonline.backend.entities.Courses;

/**
 * DTO de transferencia unificado para el motor de sugerencias algorítmicas
 * [ADR-30].
 * Sincronizado milimétricamente con el tipo RecommendedCourse del frontend.
 */
public record RecommendationDTO(
        Long id,
        String title,
        String instructor,
        String category,
        Double rating,
        String reason,
        int score) {
    /**
     * Constructor compacto para la desestructuración semántica del algoritmo en
     * memoria.
     * Garantiza el flujo de Explicabilidad Avanzada inyectando el argumento real
     * del motor.
     */
    public RecommendationDTO(Courses course, int score, String reason) {
        this(
                course.getCourse_id(),
                course.getTitle(),
                course.getInstructors() != null ? course.getInstructors() : "Por asignar",
                course.getCategory() != null ? course.getCategory() : "General",
                course.getRating() != null ? course.getRating() : 5.0,
                /*
                 * CORRECCIÓN CRÍTICA DE FLUJO: Se mapea la variable 'reason' calculada
                 * por la concatenación atómica en lugar de la columna estática de la entidad.
                 */
                reason == null || reason.trim().isEmpty() ? "Sugerencia personalizada basada en tu perfil."
                        : reason.trim(),
                score);
    }
}
