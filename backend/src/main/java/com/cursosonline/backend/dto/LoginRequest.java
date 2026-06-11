package com.cursosonline.backend.dto;

/**
 * Record que modela el contrato de entrada para las peticiones de inicio de
 * sesión.
 * Centraliza la captura de credenciales enviadas por el frontend.
 */
public record LoginRequest(String username, String password) {
}
