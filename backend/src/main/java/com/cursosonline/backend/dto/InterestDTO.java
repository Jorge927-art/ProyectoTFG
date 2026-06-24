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
}
