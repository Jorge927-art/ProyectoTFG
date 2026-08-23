package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.AdminGlobalStatisticsDTO;
import com.cursosonline.backend.dto.AdminGlobalTopCourseDTO;
import com.cursosonline.backend.dto.AdminGlobalYearComparisonDTO;
import com.cursosonline.backend.entities.AdminGlobalStatsHistory;
import com.cursosonline.backend.entities.AdminGlobalTopCourseHistory;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.dto.AdminProfessorRatingDTO;
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
import java.util.Locale;
import java.util.Comparator;

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
    private final com.cursosonline.backend.repository.AcademicEvaluationRepository academicEvaluationRepository;

    private final Clock clock;

    /**
     * Obtiene las estadísticas globales actuales y de años anteriores.
     * Si no existen datos históricos para años anteriores, se generan de manera
     * ficticia a partir de los datos actuales.
     * 
     * @return AdminGlobalStatisticsDTO que contiene las estadísticas globales
     *         actuales y de años anteriores.
     */
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

    @Transactional(readOnly = true)
    public List<AdminProfessorRatingDTO> searchProfessorRatings(String keyword) {
        String normalized = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        List<AdminProfessorRatingDTO> results = new ArrayList<>();
        for (Users professor : userRepository.findByRole(Role.PROFESSOR)) {
            if (professor == null || !Boolean.TRUE.equals(professor.getEnabled())
                    || professor.getUsername() == null) {
                continue;
            }
            String username = professor.getUsername();
            if (!normalized.isEmpty() && !username.toLowerCase(Locale.ROOT).contains(normalized)) {
                continue;
            }
            results.add(new AdminProfessorRatingDTO(
                    professor.getUser_id(), username,
                    academicEvaluationRepository.getAverageInstructorScoreByProfessorId(professor.getUser_id())));
        }
        results.sort(Comparator.comparing(
                professor -> professor.username() == null ? "" : professor.username().toLowerCase(Locale.ROOT)));
        return results;
    }

    /**
     * Finaliza el snapshot del año anterior y lo guarda en la base de datos.
     * Este método se ejecuta automáticamente mediante un cron job al inicio del
     * año.
     */
    @Scheduled(cron = "${app.admin.global-stats.finalize-cron:0 10 0 1 1 *}", zone = "${app.admin.global-stats.time-zone:Europe/Madrid}")
    @Transactional
    public void finalizePreviousYearSnapshot() {
        finalizePreviousYearSnapshotInternal();
    }

    /**
     * Finaliza el snapshot del año anterior y lo guarda en la base de datos.
     * 
     * @return El año del snapshot finalizado.
     */
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

    /**
     * Si no existe un registro histórico para el año objetivo, genera un registro
     * ficticio basado en los datos actuales y un factor de escala.
     * Esto asegura que siempre haya datos disponibles para años anteriores, incluso
     * si no se han recopilado datos reales.
     * 
     * @param targetYear El año objetivo para el cual se debe garantizar un registro
     *                   histórico.
     * @param current    El snapshot actual de las estadísticas globales.
     * @param factor     El factor de escala para generar datos ficticios.
     */
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

    /**
     * Calcula el snapshot actual de las estadísticas globales, incluyendo el total
     * de estudiantes, profesores y la lista de cursos principales.
     * 
     * @return El snapshot actual de las estadísticas globales.
     */
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

    /**
     * Convierte un registro histórico de estadísticas globales en un DTO de
     * comparación de años.
     * Si el registro histórico es nulo, se devuelve un DTO con valores
     * predeterminados.
     * 
     * @param history El registro histórico de estadísticas globales.
     * @param year    El año para el cual se realiza la comparación.
     * @return Un DTO de comparación de años que representa los datos históricos o
     *         valores predeterminados si el historial es nulo.
     */
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

    /**
     * Convierte una lista de DTOs de cursos principales en una lista de entidades
     * históricas de cursos principales.
     * 
     * @param topCourses La lista de DTOs de cursos principales.
     * @return Una lista de entidades históricas de cursos principales.
     */
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

    /**
     * Convierte un valor long a int de manera segura, asegurando que no se exceda
     * el rango de int.
     * Si el valor es mayor que Integer.MAX_VALUE, se devuelve Integer.MAX_VALUE.
     * 
     * @param value El valor long que se desea convertir a int.
     * @return El valor convertido a int, asegurando que no se exceda el rango de
     *         int.
     */
    private int safeLongToInt(long value) {
        if (value > Integer.MAX_VALUE) {
            return Integer.MAX_VALUE;
        }
        if (value < 0) {
            return 0;
        }
        return (int) value;
    }

    /**
     * Resuelve el número máximo de estudiantes matriculados en una lista de cursos
     * principales.
     * 
     * @param courses La lista de cursos principales.
     * @return El número máximo de estudiantes matriculados en los cursos
     *         principales.
     */
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

    /**
     * Registro interno que representa un snapshot actual de las estadísticas
     * globales.
     * Contiene el total de estudiantes, total de profesores, la cantidad de
     * estudiantes matriculados en el curso principal y la lista de cursos
     * principales.
     * 
     * @param totalStudents       El total de estudiantes.
     * @param totalProfessors     El total de profesores.
     * @param topCourseEnrollment La cantidad de estudiantes matriculados en el
     *                            curso principal.
     * @param topCourses          La lista de cursos principales.
     */
    private record CurrentGlobalSnapshot(
            int totalStudents,
            int totalProfessors,
            int topCourseEnrollment,
            List<AdminGlobalTopCourseDTO> topCourses) {
    }
}
