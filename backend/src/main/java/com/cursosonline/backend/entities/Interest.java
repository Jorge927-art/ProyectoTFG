package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "interests")
@Data
@NoArgsConstructor
@AllArgsConstructor
/**
 * Entidad que persiste las preferencias y criterios de filtrado de los
 * estudiantes.
 * Utiliza @MapsId para compartir la clave primaria de forma unidireccional con
 * Users.
 * Sus campos respetan estrictamente la nomenclatura de la entidad Courses para
 * optimizar las futuras consultas del motor de recomendación inteligente.
 */
public class Interest {

    // Identificador único de la entidad Interest, que coincide con el ID del
    // usuario
    @Id
    private Long id;

    // Relación de uno a uno con la entidad Users, compartiendo la misma clave
    // primaria
    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private Users user;

    // Lista de categorías de interés del estudiante, que pueden incluir temas como
    // "Programación", "Diseño", "Marketing", etc.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "interest_categories", joinColumns = @JoinColumn(name = "interest_id"))
    @Column(name = "category")
    private List<String> category = new ArrayList<>();

    // Lista de tipos de cursos preferidos por el estudiante, que pueden incluir
    // modalidades como "Video", "Texto", "Interactivo", etc.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "interest_course_types", joinColumns = @JoinColumn(name = "interest_id"))
    @Column(name = "course_type") // Sincronizado con el nivel (Principiante, Intermedio, Avanzado)
    private List<String> course_type = new ArrayList<>();

    // Lista de niveles de dificultad preferidos por el estudiante, que pueden
    // incluir niveles como "Principiante", "Intermedio", "Avanzado", etc.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "interest_durations", joinColumns = @JoinColumn(name = "interest_id"))
    @Column(name = "duration")
    private List<String> duration = new ArrayList<>();

    // Lista de idiomas preferidos por el estudiante, que pueden incluir idiomas
    // como "Español", "Inglés", "Francés", etc.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "interest_languages", joinColumns = @JoinColumn(name = "interest_id"))
    @Column(name = "language")
    private List<String> language = new ArrayList<>();

    // Lista de idiomas de subtítulos preferidos por el estudiante, que pueden
    // incluir idiomas como "Español", "Inglés", "Francés", etc.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "interest_subtitle_languages", joinColumns = @JoinColumn(name = "interest_id"))
    @Column(name = "subtitle_language") // Sincronizado con la disponibilidad de subtítulos
    private List<String> subtitle_languages = new ArrayList<>();
}
