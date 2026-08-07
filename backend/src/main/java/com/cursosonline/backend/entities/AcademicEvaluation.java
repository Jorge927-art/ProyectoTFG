package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "academic_evaluations", uniqueConstraints = {
        // Impide estrictamente que un alumno
        // duplique evaluaciones para la misma asignatura matriculada.
        @UniqueConstraint(columnNames = { "user_id", "course_id" })
})

/**
 * Representa una evaluación académica de un curso por parte de un estudiante.
 * Contiene puntuaciones numéricas y comentarios opcionales tanto para el curso
 * como para el instructor.
 * Además, almacena metadatos como la fecha de evaluación y referencias a las
 * entidades de usuario y curso.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AcademicEvaluation {

    // Identificador único de la evaluación académica
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long evaluationid;

    // --- RATING DE ASIGNATURA ---
    @Column(nullable = false)
    private Integer course_score; // Puntuación numérica local (1-5 estrellas)

    // Retroalimentación textual opcional sobre el curso
    @Column(name = "course_comment", columnDefinition = "TEXT")
    private String courseComment; // Retroalimentación textual opcional sobre el curso

    // --- RATING DE DOCENTE / INSTRUCTOR ---
    @Column(nullable = false)
    private Integer instructor_score; // Puntuación numérica local (1-5 estrellas)

    // Retroalimentación textual opcional sobre el instructor
    @Column(name = "instructor_comment", columnDefinition = "TEXT")
    private String instructorComment; // Retroalimentación textual opcional sobre el profesor

    // --- METADATOS ---
    @Column(nullable = false)
    private LocalDateTime evaluation_date = LocalDateTime.now();

    // Relaciones con otras entidades
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true) // nullable: permite anonimizar tras baja permanente
    private Users user; // El estudiante autenticado que emite el voto(puede ser null si la cuenta fue
                        // eliminada)

    // Relación con la entidad Courses para obtener información del curso evaluado
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Courses course; // El curso asociado (sirve como ancla y contiene el String de instructores)
}
