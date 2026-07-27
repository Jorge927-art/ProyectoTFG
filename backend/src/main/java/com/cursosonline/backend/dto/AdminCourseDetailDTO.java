package com.cursosonline.backend.dto;

import java.util.List;

/**
 * DTO para representar los detalles de un curso en el panel de administración.
 * AdminCourseDetailDTO
 * 
 * @param courseId  El ID del curso.
 * @param title     El título del curso.
 * @param professor El profesor asignado al curso (puede ser null si no hay
 *                  ninguno).
 * @param students  La lista de alumnos inscritos en el curso.
 */
public record AdminCourseDetailDTO(
        Long courseId,
        String title,
        AdminEnrolledUserDTO professor, // null si el curso no tiene profesor asignado
        List<AdminEnrolledUserDTO> students) {
}
