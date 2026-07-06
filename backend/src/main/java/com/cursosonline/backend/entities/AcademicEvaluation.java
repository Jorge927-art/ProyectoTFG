package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "academic_evaluations", uniqueConstraints = {
        // [BLINDAJE DE IDENTIDAD TFG]: Impide estrictamente que un alumno
        // duplique evaluaciones para la misma asignatura matriculada.
        @UniqueConstraint(columnNames = { "user_id", "course_id" })
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AcademicEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long evaluationid;

    // --- RATING DE ASIGNATURA ---
    @Column(nullable = false)
    private Integer course_score; // Puntuación numérica local (1-5 estrellas)

    @Column(name = "course_comment", columnDefinition = "TEXT")
    private String courseComment; // Retroalimentación textual opcional sobre el curso

    // --- RATING DE DOCENTE / INSTRUCTOR ---
    @Column(nullable = false)
    private Integer instructor_score; // Puntuación numérica local (1-5 estrellas)

    @Column(name = "instructor_comment", columnDefinition = "TEXT")
    private String instructorComment; // Retroalimentación textual opcional sobre el profesor

    // --- METADATOS ---
    @Column(nullable = false)
    private LocalDateTime evaluation_date = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user; // El estudiante autenticado que emite el voto

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Courses course; // El curso asociado (sirve como ancla y contiene el String de instructores)
}
