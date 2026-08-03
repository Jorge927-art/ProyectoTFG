package com.cursosonline.backend.dto;

/**
 * DTO de curso con mayor número de alumnos inscritos.
 *
 * @param courseId         ID del curso.
 * @param courseTitle      Título del curso.
 * @param enrolledStudents Número de alumnos inscritos.
 */
public record AdminGlobalTopCourseDTO(
        Long courseId,
        String courseTitle,
        int enrolledStudents) {
}
