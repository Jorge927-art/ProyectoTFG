package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.AdminGlobalStatisticsDTO;
import com.cursosonline.backend.dto.AdminGlobalTopCourseDTO;
import com.cursosonline.backend.dto.AdminGlobalYearComparisonDTO;
import com.cursosonline.backend.entities.AdminGlobalStatsHistory;
import com.cursosonline.backend.entities.AdminGlobalTopCourseHistory;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.repository.AdminGlobalStatsHistoryRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Servicio del panel estadístico global de administración.
 * El año en curso se calcula en vivo y los años cerrados se leen del histórico.
 */
@Service
@RequiredArgsConstructor
public class AdminGlobalStatisticsService {

    private static final int TOP_COURSES_LIMIT = 10;

    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AdminGlobalStatsHistoryRepository historyRepository;

    private Clock clock = Clock.systemDefaultZone();

    @Transactional
    public AdminGlobalStatisticsDTO getGlobalStatistics() {
        int currentYear = Year.now(clock).getValue();

        CurrentGlobalSnapshot current = calculateCurrentSnapshot();
        ensureFictitiousHistoryIfMissing(currentYear - 1, current, 0.93);
        ensureFictitiousHistoryIfMissing(currentYear - 2, current, 0.86);

        List<AdminGlobalStatsHistory> historyRows = historyRepository.findAllBySnapshotYearInWithTopCourses(
                List.of(currentYear - 1, currentYear - 2));

        Map<Integer, AdminGlobalStatsHistory> byYear = new HashMap<>();
        for (AdminGlobalStatsHistory row : historyRows) {
            byYear.put(row.getSnapshotYear(), row);
        }

        List<AdminGlobalYearComparisonDTO> comparisons = new ArrayList<>();
        comparisons.add(new AdminGlobalYearComparisonDTO(
                currentYear,
                current.totalStudents(),
                current.totalProfessors(),
                current.topCourseEnrollment(),
                true));

        comparisons.add(toComparison(byYear.get(currentYear - 1), currentYear - 1));
        comparisons.add(toComparison(byYear.get(currentYear - 2), currentYear - 2));

        return new AdminGlobalStatisticsDTO(
                currentYear,
                current.totalStudents(),
                current.totalProfessors(),
                current.topCourses(),
                comparisons);
    }

    /**
     * Consolida el año cerrado y sustituye cualquier dato ficticio por dato real.
     */
    @Scheduled(cron = "${app.admin.global-stats.finalize-cron:0 10 0 1 1 *}", zone = "${app.admin.global-stats.time-zone:Europe/Madrid}")
    @Transactional
    public void finalizePreviousYearSnapshot() {
        finalizePreviousYearSnapshotInternal();
    }

    @Transactional
    public int finalizePreviousYearSnapshotNow() {
        return finalizePreviousYearSnapshotInternal();
    }

    private int finalizePreviousYearSnapshotInternal() {
        int currentYear = Year.now(clock).getValue();
        int previousYear = currentYear - 1;

        CurrentGlobalSnapshot current = calculateCurrentSnapshot();

        AdminGlobalStatsHistory row = historyRepository.findBySnapshotYear(previousYear)
                .orElseGet(AdminGlobalStatsHistory::new);

        row.setSnapshotYear(previousYear);
        row.setTotalStudents(current.totalStudents());
        row.setTotalProfessors(current.totalProfessors());
        row.setTopCourseEnrollment(current.topCourseEnrollment());
        row.setRealData(true);
        row.setGeneratedAt(LocalDateTime.now(clock));
        row.replaceTopCourses(toHistoryItems(current.topCourses()));

        historyRepository.save(row);
        return previousYear;
    }

    private void ensureFictitiousHistoryIfMissing(int targetYear, CurrentGlobalSnapshot current, double factor) {
        if (historyRepository.findBySnapshotYear(targetYear).isPresent()) {
            return;
        }

        int students = Math.max(1, (int) Math.round(current.totalStudents() * factor));
        int professors = Math.max(1, (int) Math.round(current.totalProfessors() * factor));

        List<AdminGlobalTopCourseDTO> scaledTop = current.topCourses().stream()
                .map(item -> new AdminGlobalTopCourseDTO(
                        item.courseId(),
                        item.courseTitle(),
                        Math.max(1, (int) Math.round(item.enrolledStudents() * factor))))
                .toList();

        int topEnrollment = resolveMaxEnrolledStudents(scaledTop);

        AdminGlobalStatsHistory row = new AdminGlobalStatsHistory();
        row.setSnapshotYear(targetYear);
        row.setTotalStudents(students);
        row.setTotalProfessors(professors);
        row.setTopCourseEnrollment(topEnrollment);
        row.setRealData(false);
        row.setGeneratedAt(LocalDateTime.now(clock));
        row.replaceTopCourses(toHistoryItems(scaledTop));

        historyRepository.save(row);
    }

    private CurrentGlobalSnapshot calculateCurrentSnapshot() {
        int totalStudents = safeLongToInt(userRepository.countByRoleAndEnabledTrue(Role.STUDENT));
        int totalProfessors = safeLongToInt(userRepository.countByRoleAndEnabledTrue(Role.PROFESSOR));

        List<Object[]> rows = enrollmentRepository
                .findTopCoursesByActiveStudentCount(PageRequest.of(0, TOP_COURSES_LIMIT));
        List<AdminGlobalTopCourseDTO> topCourses = new ArrayList<>();

        for (Object[] row : rows) {
            Long courseId = row[0] != null ? ((Number) row[0]).longValue() : null;
            String title = row[1] != null ? String.valueOf(row[1]) : "Curso sin título";
            int enrolled = row[2] != null ? ((Number) row[2]).intValue() : 0;
            topCourses.add(new AdminGlobalTopCourseDTO(courseId, title, enrolled));
        }

        int topCourseEnrollment = resolveMaxEnrolledStudents(topCourses);

        return new CurrentGlobalSnapshot(totalStudents, totalProfessors, topCourseEnrollment, topCourses);
    }

    private AdminGlobalYearComparisonDTO toComparison(AdminGlobalStatsHistory history, int year) {
        if (history == null) {
            return new AdminGlobalYearComparisonDTO(year, 0, 0, 0, false);
        }

        return new AdminGlobalYearComparisonDTO(
                history.getSnapshotYear(),
                history.getTotalStudents(),
                history.getTotalProfessors(),
                history.getTopCourseEnrollment(),
                history.isRealData());
    }

    private List<AdminGlobalTopCourseHistory> toHistoryItems(List<AdminGlobalTopCourseDTO> topCourses) {
        List<AdminGlobalTopCourseHistory> items = new ArrayList<>();
        int rank = 1;

        for (AdminGlobalTopCourseDTO course : topCourses) {
            AdminGlobalTopCourseHistory item = new AdminGlobalTopCourseHistory();
            item.setRankPosition(rank++);
            item.setCourseId(course.courseId());
            item.setCourseTitle(course.courseTitle());
            item.setEnrolledStudents(course.enrolledStudents());
            items.add(item);
        }

        return items;
    }

    private int safeLongToInt(long value) {
        if (value > Integer.MAX_VALUE) {
            return Integer.MAX_VALUE;
        }
        if (value < 0) {
            return 0;
        }
        return (int) value;
    }

    private int resolveMaxEnrolledStudents(List<AdminGlobalTopCourseDTO> courses) {
        if (courses == null || courses.isEmpty()) {
            return 0;
        }

        int max = 0;
        for (AdminGlobalTopCourseDTO course : courses) {
            if (course == null) {
                continue;
            }

            int enrolled = course.enrolledStudents();
            if (enrolled > max) {
                max = enrolled;
            }
        }

        return max;
    }

    private record CurrentGlobalSnapshot(
            int totalStudents,
            int totalProfessors,
            int topCourseEnrollment,
            List<AdminGlobalTopCourseDTO> topCourses) {
    }
}
