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

    // Identificador único del curso
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long course_id;

    // Título del curso
    @Column(nullable = true)
    private String title;

    // Clave única para el título del curso, utilizada para búsquedas y referencias
    @Column(name = "title_key", nullable = true)
    private String titleKey;

    // URL del curso, que puede ser un enlace a la página del curso en la plataforma
    @Column(nullable = true, columnDefinition = "TEXT")
    private String url;

    // Breve introducción al curso, que puede incluir una descripción resumida
    @Column(name = "short_intro", nullable = true, columnDefinition = "TEXT")
    private String shortIntro;

    // Categoría del curso, que puede ser utilizada para clasificar los cursos
    @Column(nullable = true)
    private String category;

    // Subcategoría del curso, que puede ser utilizada para clasificar los cursos de
    // manera más específica
    @Column(name = "sub-category", nullable = true)
    private String subCategory;

    // Tipo de curso, que puede indicar si es un curso en línea, presencial,
    // híbrido, etc.
    @Column(name = "course_type", nullable = true)
    private String courseType;

    // Idioma del curso, que puede ser utilizado para filtrar cursos por idioma
    @Column(nullable = true)
    private String language;

    // Idiomas de los subtítulos del curso
    @Column(name = "subtitle_languages", nullable = true, columnDefinition = "TEXT")
    private String subtitleLanguages;

    // Habilidades que se adquieren al completar el curso, que pueden ser utilizadas
    // para filtrar cursos por habilidades
    @Column(nullable = true, columnDefinition = "TEXT")
    private String skills;

    // Instructores del curso, que pueden ser utilizados para filtrar cursos por
    // instructor
    @Column(nullable = true, columnDefinition = "TEXT")
    private String instructors;

    // Profesor asignado al curso (relación opcional para cursos internos)
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_user_id", nullable = true)
    private Users assignedUser;

    // Número de espectadores del curso, que puede ser utilizado para filtrar cursos
    // por popularidad
    @Column(name = "num_of_viewers", nullable = true)
    private Integer numOfViewers;

    // Calificación del curso, que puede ser utilizada para filtrar cursos por
    // calificación
    @Column(nullable = true)
    private Float rating;

    // Duración del curso en horas, que puede ser utilizada para filtrar cursos por
    // duración
    @Column(nullable = true)
    private Float duration;

    // Sitio web del curso, que puede ser utilizado para filtrar cursos por sitio
    // web
    @Column(nullable = true)
    private String site;

    // Indica si el curso ha sido utilizado alguna vez, que puede ser utilizada para
    // filtrar cursos por uso
    @Column(name = "ever_used", nullable = false)
    private boolean everUsed = false;
}
