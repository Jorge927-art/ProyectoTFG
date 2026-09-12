package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.AdminCourseStatsHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AdminCourseStatsHistoryRepository extends JpaRepository<AdminCourseStatsHistory, Long> {
    @Query("SELECT h FROM AdminCourseStatsHistory h WHERE h.course.course_id = :courseId AND h.snapshotYear = :year")
    Optional<AdminCourseStatsHistory> findByCourseAndYear(@Param("courseId") Long courseId, @Param("year") int year);

    @Query("SELECT h FROM AdminCourseStatsHistory h WHERE h.course.course_id = :courseId AND h.snapshotYear IN :years")
    List<AdminCourseStatsHistory> findAllByCourseAndYears(@Param("courseId") Long courseId,
            @Param("years") List<Integer> years);
}
