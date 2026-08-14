package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_course_stats_history", uniqueConstraints = @UniqueConstraint(columnNames = { "course_id",
        "snapshot_year" }))
@Getter
@Setter
@NoArgsConstructor
public class AdminCourseStatsHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Courses course;

    @Column(name = "snapshot_year", nullable = false)
    private int snapshotYear;
    private int activeStudentsInCourse;
    private int courseAverageProgressPercentage;
    private int approvalIndexPercentage;
    private Double averageCourseRating;
    private Double averageInstructorRating;
    private Double averageGrade;
    private Double averageWorkGrade;
    private Double averageFinalExamGrade;
    private boolean realData;
    private LocalDateTime generatedAt;

    @PrePersist
    void onCreate() {
        if (generatedAt == null)
            generatedAt = LocalDateTime.now();
    }
}
