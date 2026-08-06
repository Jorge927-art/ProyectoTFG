package com.cursosonline.backend.dto;

public record AdminCourseCatalogItemDTO(
                Long courseId,
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
                Float duration,
                String site,
                boolean used) {
}
