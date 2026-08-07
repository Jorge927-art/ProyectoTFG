package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidad que representa un registro histórico de estadísticas globales del
 * sistema, utilizado para auditoría y análisis de tendencias a lo largo del
 * tiempo.
 * AdminGlobalStatsHistory
 */
@Entity
@Table(name = "admin_global_stats_history")
@Getter
@Setter
public class AdminGlobalStatsHistory {

    // Identificador único del registro histórico
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Año del registro histórico, utilizado para identificar el período de tiempo
    @Column(name = "snapshot_year", nullable = false, unique = true)
    private Integer snapshotYear;

    // Mes del registro histórico, utilizado para identificar el período de tiempo
    @Column(name = "total_students", nullable = false)
    private Integer totalStudents;

    // Número total de cursos en el sistema en el momento del registro histórico
    @Column(name = "total_professors", nullable = false)
    private Integer totalProfessors;

    // Número total de profesores en el sistema en el momento del registro histórico
    @Column(name = "top_course_enrollment", nullable = false)
    private Integer topCourseEnrollment;

    // Número total de inscripciones en el curso más popular en el momento del
    // registro histórico
    @Column(name = "real_data", nullable = false)
    private boolean realData;

    // Fecha y hora en que se generó el registro histórico, utilizada para auditoría
    // y seguimiento

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt = LocalDateTime.now();

    // Relación con la entidad AdminGlobalTopCourseHistory para almacenar los cursos
    // más populares en el momento del registro histórico
    @OneToMany(mappedBy = "history", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AdminGlobalTopCourseHistory> topCourses = new ArrayList<>();

    /**
     * Reemplaza la lista de cursos más populares en el registro histórico con una
     * nueva lista de elementos.
     * 
     * @param newItems Nueva lista de cursos más populares.
     */
    public void replaceTopCourses(List<AdminGlobalTopCourseHistory> newItems) {
        this.topCourses.clear();
        if (newItems == null || newItems.isEmpty()) {
            return;
        }

        for (AdminGlobalTopCourseHistory item : newItems) {
            item.setHistory(this);
            this.topCourses.add(item);
        }
    }
}
