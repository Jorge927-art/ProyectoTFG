package com.cursosonline.backend.dto;

public record AdminCourseProfessorReassignmentResultDTO(
        String message,
        Long courseId,
        String courseTitle,
        Long previousProfessorUserId,
        String previousProfessorUsername,
        Long newProfessorUserId,
        String newProfessorUsername) {
}
