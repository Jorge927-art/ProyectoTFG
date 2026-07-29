package com.cursosonline.backend.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty; // Importación obligatoria para el contrato JSON
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List; // Soporte para colecciones relacionales

@Entity
@Table(name = "enrollment")
@Getter
@Setter
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

    @Column(name = "started_at")
    private LocalDateTime started_at;

    @Column(name = "progress_alert_student_ack", nullable = false)
    private boolean progressAlertStudentAck = false;

    @Column(name = "progress_alert_professor_ack", nullable = false)
    private boolean progressAlertProfessorAck = false;

    /**
     * Relación bidireccional con las calificaciones del curso [ADR-39].
     * Mapeado por el campo 'enrollment' de la entidad CourseGrade.
     * Se mantiene como una colección estable y se evita orphanRemoval para no
     * corromper la matrícula ni las notas al persistir una evaluación nueva.
     */
    @JsonIgnore
    @OneToMany(mappedBy = "enrollment", cascade = { CascadeType.PERSIST, CascadeType.MERGE }, fetch = FetchType.LAZY)
    private List<CourseGrade> grades = new ArrayList<>();

    public void addGrade(CourseGrade grade) {
        if (grade == null) {
            return;
        }
        if (this.grades == null) {
            this.grades = new ArrayList<>();
        }
        if (!this.grades.contains(grade)) {
            this.grades.add(grade);
        }
        grade.setEnrollment(this);
    }

    public void removeGrade(CourseGrade grade) {
        if (grade == null || this.grades == null) {
            return;
        }
        this.grades.remove(grade);
        if (grade.getEnrollment() == this) {
            grade.setEnrollment(null);
        }
    }

    /**
     * Getter explícito para la salida JSON del frontend de asignaturas en curso
     * [ADR-39].
     * Al llamarse diferente, Jackson lo serializa como "grades" en la API de cursos
     * activos,
     * pero no interfiere de ninguna manera en las subconsultas del repositorio de
     * evaluaciones.
     */
    @JsonProperty("grades")
    public List<CourseGrade> getGradesForFrontend() {
        return this.grades;
    }

    /**
     * Constructor explícito de compatibilidad hacia atrás.
     * Evita que la suite de tests existente (UserServiceTest, etc.) falle al exigir
     * el nuevo parámetro 'grades' añadido por la anotación @AllArgsConstructor.
     */
    public Enrollment(Long enrollmentid, Users user, Courses course, LocalDateTime enrolled_at, String status,
            int progress_percentage, LocalDateTime started_at) {
        this.enrollmentid = enrollmentid;
        this.user = user;
        this.course = course;
        this.enrolled_at = enrolled_at != null ? enrolled_at : LocalDateTime.now();
        this.status = status != null ? status : "EN_PROGRESO";
        this.progress_percentage = progress_percentage;
        this.started_at = started_at;
        this.grades = new ArrayList<>();
    }
}
