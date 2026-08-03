package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "admin_global_stats_history")
@Getter
@Setter
public class AdminGlobalStatsHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "snapshot_year", nullable = false, unique = true)
    private Integer snapshotYear;

    @Column(name = "total_students", nullable = false)
    private Integer totalStudents;

    @Column(name = "total_professors", nullable = false)
    private Integer totalProfessors;

    @Column(name = "top_course_enrollment", nullable = false)
    private Integer topCourseEnrollment;

    @Column(name = "real_data", nullable = false)
    private boolean realData;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "history", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AdminGlobalTopCourseHistory> topCourses = new ArrayList<>();

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
