package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.AdminCourseStatsHistory;
import com.cursosonline.backend.entities.Courses;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test-ci")
@Transactional
@DisplayName("Suite de persistencia para el histórico de estadísticas por curso")
class AdminCourseStatsHistoryRepositoryTest {

    @Autowired
    private AdminCourseStatsHistoryRepository historyRepository;

    @Autowired
    private CoursesRepository coursesRepository;

    @Test
    @DisplayName("findByCourseAndYear debe filtrar por curso y año exactos")
    void findByCourseAndYear_ShouldReturnOnlyExactSnapshot() {
        Courses courseAlpha = saveCourse("Arquitectura de Software");
        Courses courseBeta = saveCourse("Programación Avanzada");
        saveSnapshot(courseAlpha, 2024, 12);
        AdminCourseStatsHistory expected = saveSnapshot(courseAlpha, 2025, 18);
        saveSnapshot(courseBeta, 2025, 99);

        Optional<AdminCourseStatsHistory> result = historyRepository.findByCourseAndYear(
                courseAlpha.getCourse_id(), 2025);

        assertTrue(result.isPresent());
        assertEquals(expected.getId(), result.get().getId());
        assertEquals(18, result.get().getActiveStudentsInCourse());
    }

    @Test
    @DisplayName("findByCourseAndYear debe devolver vacío para otro curso o año")
    void findByCourseAndYear_ShouldReturnEmptyForNonMatchingFilters() {
        Courses course = saveCourse("Curso de prueba");
        saveSnapshot(course, 2025, 10);

        assertTrue(historyRepository.findByCourseAndYear(course.getCourse_id(), 2024).isEmpty());
        assertTrue(historyRepository.findByCourseAndYear(course.getCourse_id() + 9999, 2025).isEmpty());
    }

    @Test
    @DisplayName("findAllByCourseAndYears debe devolver solo los años solicitados del curso")
    void findAllByCourseAndYears_ShouldFilterCourseAndYearSet() {
        Courses courseAlpha = saveCourse("Curso histórico");
        Courses courseBeta = saveCourse("Otro curso");
        saveSnapshot(courseAlpha, 2023, 3);
        saveSnapshot(courseAlpha, 2024, 4);
        saveSnapshot(courseAlpha, 2025, 5);
        saveSnapshot(courseBeta, 2024, 40);

        List<AdminCourseStatsHistory> result = historyRepository.findAllByCourseAndYears(
                courseAlpha.getCourse_id(), List.of(2023, 2025));

        assertEquals(List.of(3, 5), result.stream()
                .map(snapshot -> snapshot.getActiveStudentsInCourse())
                .sorted()
                .toList());
        assertTrue(result.stream().allMatch(snapshot -> snapshot.getCourse().getCourse_id()
                .equals(courseAlpha.getCourse_id())));
    }

    @Test
    @DisplayName("findAllByCourseAndYears debe devolver vacío sin coincidencias")
    void findAllByCourseAndYears_ShouldReturnEmptyWithoutMatches() {
        Courses course = saveCourse("Curso histórico");
        saveSnapshot(course, 2025, 7);

        assertTrue(historyRepository.findAllByCourseAndYears(course.getCourse_id(), List.of(2022, 2023)).isEmpty());
    }

    private Courses saveCourse(String title) {
        Courses course = new Courses();
        course.setTitle(title);
        course.setCategory("Ingenieria");
        course.setSite("COLE");
        course.setEverUsed(false);
        return coursesRepository.saveAndFlush(course);
    }

    private AdminCourseStatsHistory saveSnapshot(Courses course, int year, int activeStudents) {
        AdminCourseStatsHistory snapshot = new AdminCourseStatsHistory();
        snapshot.setCourse(course);
        snapshot.setSnapshotYear(year);
        snapshot.setActiveStudentsInCourse(activeStudents);
        snapshot.setCourseAverageProgressPercentage(70);
        snapshot.setApprovalIndexPercentage(80);
        snapshot.setRealData(true);
        return historyRepository.saveAndFlush(snapshot);
    }
}