package com.cursosonline.backend.entities; // <- AJUSTADO A TU PAQUETE REAL

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Entidad relacional para la persistencia de calificaciones académicas
 * [ADR-39].
 * Se vincula mediante una relación de muchos a uno con la matrícula
 * (Enrollment) del alumno.
 */
@Entity
@Table(name = "course_grades")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CourseGrade {

    // Identificador único de la calificación académica
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "grade_id")
    private Long gradeId;

    // Título de la calificación académica, por ejemplo: "Examen Parcial", "Trabajo
    // Final"
    @Column(name = "title", nullable = false)
    private String title; // Ej: "Examen Parcial", "Trabajo Fin de Curso"

    // Puntuación obtenida en la calificación académica, con precisión de 10 dígitos
    // y 2 decimales
    @Column(name = "score", nullable = false, precision = 10, scale = 2)
    private BigDecimal score; // Ej: 8.5, 10

    // Comentarios opcionales sobre la calificación académica, almacenados como
    // texto
    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    // Relación de muchos a uno con la entidad Enrollment, que representa la
    // matrícula del alumno
    // Se utiliza @JsonIgnore para evitar la serialización de esta relación en las
    // respuestas JSON
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment; // Vinculación física con la matrícula del alumno
}
