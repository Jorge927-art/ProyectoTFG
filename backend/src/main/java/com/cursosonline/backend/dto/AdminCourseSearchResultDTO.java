package com.cursosonline.backend.dto;

/**
 * DTO para representar los resultados de búsqueda de cursos en el panel de
 * administración.
 * AdminCourseSearchResultDTO
 * 
 * @param courseId El ID del curso.
 * @param title    El título del curso.
 * @param category La categoría del curso.
 */
public record AdminCourseSearchResultDTO(
        Long courseId,
        String title,
        String category) {
}