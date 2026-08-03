package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.AdminGlobalStatsHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AdminGlobalStatsHistoryRepository extends JpaRepository<AdminGlobalStatsHistory, Long> {

    Optional<AdminGlobalStatsHistory> findBySnapshotYear(Integer snapshotYear);

    @Query("SELECT DISTINCT h FROM AdminGlobalStatsHistory h " +
            "LEFT JOIN FETCH h.topCourses tc " +
            "WHERE h.snapshotYear IN :years ORDER BY h.snapshotYear DESC, tc.rankPosition ASC")
    List<AdminGlobalStatsHistory> findAllBySnapshotYearInWithTopCourses(@Param("years") List<Integer> years);
}
