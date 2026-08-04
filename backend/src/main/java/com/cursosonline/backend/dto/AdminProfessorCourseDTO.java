package com.cursosonline.backend.dto;

public record AdminProfessorCourseDTO(
        Long courseId,
        String title,
        Long currentProfessorUserId,
        String currentProfessorUsername) {
}
