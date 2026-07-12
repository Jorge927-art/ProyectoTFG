package com.cursosonline.backend.dto;

import java.util.List;

/**
 * Contrato de transferencia de datos (DTO) genérico para capturar las
 * preferencias del estudiante desde el frontend de React.
 */
public record InterestDTO(
                List<String> categories,
                List<String> levels,
                List<String> durations,
                List<String> languages,
                List<String> subtitles) {

        public InterestDTO {
                categories = categories != null ? List.copyOf(categories) : List.of();
                levels = levels != null ? List.copyOf(levels) : List.of();
                durations = durations != null ? List.copyOf(durations) : List.of();
                languages = languages != null ? List.copyOf(languages) : List.of();
                subtitles = subtitles != null ? List.copyOf(subtitles) : List.of();
        }

        public static InterestDTO empty() {
                return new InterestDTO(List.of(), List.of(), List.of(), List.of(), List.of());
        }
}
