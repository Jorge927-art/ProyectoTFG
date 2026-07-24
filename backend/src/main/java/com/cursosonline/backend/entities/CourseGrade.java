package com.cursosonline.backend.entities; // <- AJUSTADO A TU PAQUETE REAL

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

/**
 * Entidad relacional para la persistencia de calificaciones académicas
 * [ADR-39].
 * Se vincula mediante una relación de muchos a uno con la matrícula
 * (Enrollment) del alumno.
 */
@Entity
@Table(name = "course_grades")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseGrade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "grade_id")
    private Long gradeId;

    @Column(name = "title", nullable = false)
    private String title; // Ej: "Examen Parcial", "Trabajo Fin de Curso"

    @Column(name = "score", nullable = false, precision = 10, scale = 2)
    private BigDecimal score; // Ej: 8.5, 10

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment; // Vinculación física con la matrícula del alumno
}
