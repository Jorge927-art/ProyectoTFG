package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "courses")
@Data // Genera getters, setters, toString, etc. automáticamente
@NoArgsConstructor // Constructor vacío para JPA
@AllArgsConstructor // Constructor con todos los campos
/**
 * Entidad que representa a los cursos disponibles en la plataforma.
 * Contiene campos para el ID, título, URL, introducción, categoría,
 * subcategoría, tipo de curso, idioma, idiomas de subtítulos, habilidades,
 * instructores, calificación, número de espectadores, duración y sitio web.
 */

public class Courses {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long course_id;

    @Column(nullable = true)
    private String title;

    @Column(nullable = true, columnDefinition = "TEXT")
    private String url;

    @Column(name = "short_intro", nullable = true, columnDefinition = "TEXT")
    private String shortIntro;

    @Column(nullable = true)
    private String category;

    @Column(name = "sub-category", nullable = true)
    private String subCategory;

    @Column(name = "course_type", nullable = true)
    private String courseType;

    @Column(nullable = true)
    private String language;

    @Column(name = "subtitle_languages", nullable = true, columnDefinition = "TEXT")
    private String subtitleLanguages;

    @Column(nullable = true, columnDefinition = "TEXT")
    private String skills;

    @Column(nullable = true, columnDefinition = "TEXT")
    private String instructors;

    @Column(nullable = true)
    private Float rating;

    @Column(name = "num of viewers", nullable = true)
    private Integer numOfViewers;

    @Column(nullable = true)
    private Float duration;

    @Column(nullable = true)
    private String site;
}
