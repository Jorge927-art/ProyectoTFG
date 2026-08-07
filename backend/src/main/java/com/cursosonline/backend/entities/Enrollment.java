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
import java.util.List;

/**
 * Entidad que representa la matrícula de un estudiante en un curso.
 * Contiene información sobre el progreso del estudiante, el estado de la
 * matrícula y las calificaciones asociadas.
 * Se vincula mediante relaciones de muchos a uno con las entidades Users y
 * Courses.
 * Enrollment
 */
@Entity
@Table(name = "enrollment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Enrollment {

    // Identificador único de la matrícula
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long enrollmentid;

    // Relación de muchos a uno con la entidad Users, que representa al estudiante
    // matriculado en el curso
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private Users user;

    // Relación de muchos a uno con la entidad Courses, que representa el curso en
    // el que el estudiante está matriculado
    @JsonProperty("course")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Courses course;

    // Fecha y hora en que se realizó la matrícula, utilizada para auditoría y
    // seguimiento
    @Column(name = "enrolled_at", nullable = false)
    private LocalDateTime enrolled_at = LocalDateTime.now();

    // Estado de la matrícula, que puede ser "EN_PROGRESO", "COMPLETADO" o
    // "CANCELADO"
    @Column(nullable = false)
    private String status = "EN_PROGRESO";

    // Porcentaje de progreso del estudiante en el curso, representado como un
    // entero entre 0 y 100
    @Column(name = "progress", nullable = false)
    private int progress_percentage = 0;

    // Fecha y hora en que el estudiante comenzó el curso, utilizada para
    // seguimiento del progreso
    @Column(name = "started_at")
    private LocalDateTime started_at;

    // Indica si el estudiante ha reconocido la alerta de progreso del curso
    @Column(name = "progress_alert_student_ack", nullable = false)
    private boolean progressAlertStudentAck = false;

    // Indica si el profesor ha reconocido la alerta de progreso del curso
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

    /**
     * Elimina una calificación del curso de la lista de calificaciones asociadas a
     * esta matrícula.
     * También establece la referencia de la calificación a null para mantener la
     * integridad de la relación bidireccional.
     * 
     * @param grade La calificación del curso que se desea eliminar de la matrícula.
     */
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
