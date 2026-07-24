package com.cursosonline.backend.dto;

/**
 * Record que modela el contrato de salida para las peticiones de rendimiento
 * del estudiante.
 * Centraliza la captura de información enviada al frontend.
 * StudentPerformanceDTO
 * 
 * @param enrollmentId
 * @param userId
 * @param username
 * @param email
 * @param individualGrade
 * @param groupAverage
 */
public record StudentPerformanceDTO(
                Long enrollmentId,
                Long userId,
                String username,
                String email,
                Double individualGrade,
                Double groupAverage) {
}
