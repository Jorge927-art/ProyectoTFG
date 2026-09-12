package com.cursosonline.backend.entities;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;

class AdminStatisticsEntitiesTest {

    @Test
    void adminCourseStatsHistorySetsGeneratedAtOnlyWhenMissing() {
        AdminCourseStatsHistory history = new AdminCourseStatsHistory();

        history.onCreate();

        assertNotNull(history.getGeneratedAt());
        LocalDateTime generatedAt = history.getGeneratedAt();
        history.onCreate();
        assertEquals(generatedAt, history.getGeneratedAt());
    }

    @Test
    void adminGlobalStatsHistoryReplacesTopCoursesAndMaintainsBackReference() {
        AdminGlobalStatsHistory history = new AdminGlobalStatsHistory();
        AdminGlobalTopCourseHistory first = topCourse(1, "Java");
        AdminGlobalTopCourseHistory second = topCourse(2, "Spring");

        history.replaceTopCourses(List.of(first, second));

        assertEquals(List.of(first, second), history.getTopCourses());
        assertSame(history, first.getHistory());
        assertSame(history, second.getHistory());

        history.replaceTopCourses(List.of());

        assertEquals(List.of(), history.getTopCourses());
    }

    @Test
    void adminGlobalStatsHistoryClearsTopCoursesWhenReplacementIsNull() {
        AdminGlobalStatsHistory history = new AdminGlobalStatsHistory();
        history.replaceTopCourses(List.of(topCourse(1, "Java")));

        history.replaceTopCourses(null);

        assertEquals(List.of(), history.getTopCourses());
    }

    @Test
    void courseMaterialDispatchConfigInitializesCreationTimeAndPreservesIt() {
        CourseMaterialDispatchConfig config = new CourseMaterialDispatchConfig();

        config.onCreate();

        assertNotNull(config.getCreatedAt());
        LocalDateTime createdAt = config.getCreatedAt();
        assertEquals(new BigDecimal("90.00"), config.getExamThreshold());
        config.onCreate();
        assertEquals(createdAt, config.getCreatedAt());
    }

    private AdminGlobalTopCourseHistory topCourse(int rank, String title) {
        AdminGlobalTopCourseHistory topCourse = new AdminGlobalTopCourseHistory();
        topCourse.setRankPosition(rank);
        topCourse.setCourseTitle(title);
        topCourse.setEnrolledStudents(10);
        return topCourse;
    }
}