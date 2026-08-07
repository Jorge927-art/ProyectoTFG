package com.cursosonline.backend.dto;

/**
 * DTO para la creación de un curso desde el panel de administración.
 * Contiene información relevante sobre un curso, incluyendo su título, URL,
 * introducción breve, categoría, tipo, idioma, habilidades, instructores,
 * valoración, número de visualizaciones y duración.
 * 
 * @param title             Título del curso.
 * @param url               URL del curso.
 * @param shortIntro        Introducción breve del curso.
 * @param category          Categoría del curso.
 * @param subCategory       Subcategoría del curso.
 * @param courseType        Tipo de curso.
 * @param language          Idioma del curso.
 * @param subtitleLanguages Idiomas de los subtítulos.
 * @param skills            Habilidades que se adquieren.
 * @param instructors       Instructores del curso.
 * @param rating            Valoración del curso.
 * @param numOfViewers      Número de visualizaciones.
 * @param duration          Duración del curso.
 */
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
