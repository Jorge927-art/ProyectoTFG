package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "admin_global_top_course_history")
@Getter
@Setter
public class AdminGlobalTopCourseHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "history_id", nullable = false)
    private AdminGlobalStatsHistory history;

    @Column(name = "rank_position", nullable = false)
    private Integer rankPosition;

    @Column(name = "course_id")
    private Long courseId;

    @Column(name = "course_title", nullable = false)
    private String courseTitle;

    @Column(name = "enrolled_students", nullable = false)
    private Integer enrolledStudents;
}
