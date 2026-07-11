package com.cursosonline.backend.dto;

/**
 * DTO Inmutable para transportar las alertas del estudiante.
 * Alineado con el estándar de agregación analítica de solo lectura.
 */
public record NotificationDTO(
        String type, // 'DOCUMENT_INBOX' o 'COURSE_PROGRESS'
        String title, // Título descriptivo (ej: "Nuevo documento recibido")
        String message, // Mensaje detallado para el alumno
        String redirectUrl // Ruta interna del frontend para redirigir al hacer clic
) {
}
