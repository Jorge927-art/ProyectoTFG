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

    @Id
    private Long id; // No usa @GeneratedValue porque hereda el ID exacto del usuario

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId // Vincula este registro directamente al ID de la tabla users
    @JoinColumn(name = "user_id")
    private Users user;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "interest_categories", joinColumns = @JoinColumn(name = "interest_id"))
    @Column(name = "category")
    private List<String> category = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "interest_course_types", joinColumns = @JoinColumn(name = "interest_id"))
    @Column(name = "course_type") // Sincronizado con el nivel (Principiante, Intermedio, Avanzado)
    private List<String> course_type = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "interest_durations", joinColumns = @JoinColumn(name = "interest_id"))
    @Column(name = "duration")
    private List<String> duration = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "interest_languages", joinColumns = @JoinColumn(name = "interest_id"))
    @Column(name = "language")
    private List<String> language = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "interest_subtitle_languages", joinColumns = @JoinColumn(name = "interest_id"))
    @Column(name = "subtitle_languages") // Sincronizado con la disponibilidad de subtítulos
    private List<String> subtitle_languages = new ArrayList<>();
}
