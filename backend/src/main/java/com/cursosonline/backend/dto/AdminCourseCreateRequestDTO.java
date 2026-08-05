package com.cursosonline.backend.dto;

public record AdminCourseCreateRequestDTO(
        String title,
        String url,
        String shortIntro,
        String category,
        String subCategory,
        String courseType,
        String language,
        String subtitleLanguages,
        String skills,
        String instructors,
        Float rating,
        Integer numOfViewers,
        Float duration) {
}
