package com.cursosonline.backend.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty; // Importación obligatoria para el contrato JSON
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "enrollment")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Enrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long enrollmentid;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private Users user;

    /**
     * Relación con el curso.
     * Se fuerza mediante @JsonProperty que la propiedad JSON sea "course" (en
     * singular)
     * para asegurar compatibilidad absoluta con la interfaz de TypeScript del
     * Frontend,
     * independientemente del tipo de clase 'Courses' en plural del compilador.
     */
    @JsonProperty("course")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Courses course;

    @Column(nullable = false)
    private LocalDateTime enrolled_at = LocalDateTime.now();

    @Column(nullable = false)
    private String status = "EN_PROGRESO";

    @Column(name = "progress", nullable = false)
    private int progress_percentage = 0;
}
