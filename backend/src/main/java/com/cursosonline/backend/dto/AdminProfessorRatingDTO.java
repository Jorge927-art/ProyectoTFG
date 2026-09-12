package com.cursosonline.backend.dto;

public record AdminProfessorRatingDTO(
        Long professorId,
        String username,
        Double averageRating) {
}
