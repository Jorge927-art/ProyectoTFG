package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "professor_course_alerts", uniqueConstraints = {
        @UniqueConstraint(name = "uk_prof_alert_enrollment_type_checkpoint", columnNames = { "enrollment_id",
                "alert_type", "checkpoint_index" })
})
@Getter
@Setter
@NoArgsConstructor
public class ProfessorCourseAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "alert_id")
    private Long alertId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "professor_user_id", nullable = false)
    private Users professor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_user_id", nullable = false)
    private Users student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Courses course;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_type", nullable = false, length = 32)
    private ProfessorAlertType alertType;

    @Column(name = "checkpoint_index", nullable = false)
    private int checkpointIndex;

    @Column(name = "checkpoint_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal checkpointPercent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ProfessorAlertStatus status = ProfessorAlertStatus.PENDING;

    @Column(name = "bell_dismissed", nullable = false)
    private boolean bellDismissed = false;

    @Column(name = "title", nullable = false, length = 180)
    private String title;

    @Column(name = "message", nullable = false, length = 600)
    private String message;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
