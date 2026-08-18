package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.AdminGlobalStatsHistory;
import com.cursosonline.backend.entities.AdminGlobalTopCourseHistory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test-ci")
@Transactional
@DisplayName("Suite de persistencia para histórico de estadísticas globales")
class AdminGlobalStatsHistoryRepositoryTest {

    @Autowired
    private AdminGlobalStatsHistoryRepository historyRepository;

    @Test
    @DisplayName("findAllBySnapshotYearInWithTopCourses debe cargar cursos, eliminar duplicados y ordenar por año")
    void findAllBySnapshotYearInWithTopCourses_ShouldFetchDistinctHistoriesOrderedByYearAndRank() {
        AdminGlobalStatsHistory older = saveHistory(2024,
                topCourse(2, "Curso 2024 segundo"),
                topCourse(1, "Curso 2024 primero"));
        AdminGlobalStatsHistory newer = saveHistory(2025,
                topCourse(2, "Curso 2025 segundo"),
                topCourse(1, "Curso 2025 primero"));
        saveHistory(2023, topCourse(1, "Curso fuera del filtro"));

        List<AdminGlobalStatsHistory> result = historyRepository.findAllBySnapshotYearInWithTopCourses(
                List.of(2024, 2025));

        assertEquals(List.of(newer.getId(), older.getId()), result.stream()
                .map(history -> history.getId())
                .toList());
        assertEquals(2, result.size());
        assertEquals(List.of(1, 2), result.get(0).getTopCourses().stream()
                .map(topCourse -> topCourse.getRankPosition())
                .sorted()
                .toList());
        assertEquals(List.of(1, 2), result.get(1).getTopCourses().stream()
                .map(topCourse -> topCourse.getRankPosition())
                .sorted()
                .toList());
    }

    @Test
    @DisplayName("findAllBySnapshotYearInWithTopCourses debe conservar históricos sin cursos top por LEFT JOIN")
    void findAllBySnapshotYearInWithTopCourses_ShouldIncludeHistoryWithoutTopCourses() {
        AdminGlobalStatsHistory emptyHistory = saveHistory(2026);

        List<AdminGlobalStatsHistory> result = historyRepository.findAllBySnapshotYearInWithTopCourses(
                List.of(2026));

        assertEquals(1, result.size());
        assertEquals(emptyHistory.getId(), result.get(0).getId());
        assertTrue(result.get(0).getTopCourses().isEmpty());
    }

    @Test
    @DisplayName("findAllBySnapshotYearInWithTopCourses debe devolver vacío para años no solicitados")
    void findAllBySnapshotYearInWithTopCourses_ShouldReturnEmptyForUnknownYears() {
        saveHistory(2025, topCourse(1, "Curso histórico"));

        List<AdminGlobalStatsHistory> result = historyRepository.findAllBySnapshotYearInWithTopCourses(
                List.of(2022, 2023));

        assertTrue(result.isEmpty());
        assertFalse(historyRepository.findBySnapshotYear(2023).isPresent());
    }

    private AdminGlobalStatsHistory saveHistory(int year, AdminGlobalTopCourseHistory... topCourses) {
        AdminGlobalStatsHistory history = new AdminGlobalStatsHistory();
        history.setSnapshotYear(year);
        history.setTotalStudents(100);
        history.setTotalProfessors(10);
        history.setTopCourseEnrollment(25);
        history.setRealData(true);
        history.setGeneratedAt(LocalDateTime.now());
        history.replaceTopCourses(List.of(topCourses));
        return historyRepository.saveAndFlush(history);
    }

    private AdminGlobalTopCourseHistory topCourse(int rank, String title) {
        AdminGlobalTopCourseHistory topCourse = new AdminGlobalTopCourseHistory();
        topCourse.setRankPosition(rank);
        topCourse.setCourseId((long) rank);
        topCourse.setCourseTitle(title);
        topCourse.setEnrolledStudents(20 - rank);
        return topCourse;
    }
}