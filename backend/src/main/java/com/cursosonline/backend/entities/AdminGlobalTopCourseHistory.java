package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Entidad que representa un curso más popular en un registro histórico de
 * estadísticas globales.
 * Se utiliza para almacenar información sobre los cursos más populares en un
 * momento específico del tiempo.
 * AdminGlobalTopCourseHistory
 */
@Entity
@Table(name = "admin_global_top_course_history")
@Getter
@Setter
public class AdminGlobalTopCourseHistory {

    // Identificador único del curso más popular en el registro histórico
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Relación con la entidad AdminGlobalStatsHistory para asociar el curso más
    // popular con un registro histórico específico
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "history_id", nullable = false)
    private AdminGlobalStatsHistory history;

    // Posición del curso en el ranking de popularidad (1 = más popular)
    @Column(name = "rank_position", nullable = false)
    private Integer rankPosition;

    // ID del curso más popular en el registro histórico
    @Column(name = "course_id")
    private Long courseId;

    // Título del curso más popular en el registro histórico
    @Column(name = "course_title", nullable = false)
    private String courseTitle;

    // Número de estudiantes inscritos en el curso más popular en el registro
    // histórico
    @Column(name = "enrolled_students", nullable = false)
    private Integer enrolledStudents;
}
