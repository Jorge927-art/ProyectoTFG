package com.cursosonline.backend.dto;

/**
 * DTO inmutable para transportar las alertas del estudiante.
 * Alineado con el estándar de agregación analítica de solo lectura.
 *
 * NotificationDTO
 * 
 * @param type        Tipo de notificación ('DOCUMENT_INBOX', 'COURSE_PROGRESS'
 *                    (alumno) o 'STUDENT_NEAR_COMPLETION' (profesor))
 * @param title       Título descriptivo de la notificación.
 * @param message     Mensaje detallado para el alumno.
 * @param redirectUrl Ruta interna del frontend para redirigir al hacer clic.
 */
public record NotificationDTO(
                String type, // 'DOCUMENT_INBOX', 'COURSE_PROGRESS' (alumno) o 'STUDENT_NEAR_COMPLETION'
                             // (profesor)
                String title, // Título descriptivo (ej: "Nuevo documento recibido")
                String message, // Mensaje detallado para el alumno
                String redirectUrl // Ruta interna del frontend para redirigir al hacer clic
) {
}
