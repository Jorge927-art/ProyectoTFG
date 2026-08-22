package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.*;
import com.cursosonline.backend.entities.*;
import com.cursosonline.backend.exception.ResourceNotFoundException;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.repository.AdminCourseStatsHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.time.Year;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.math.BigDecimal;

/**
 * Servicio para gestionar las operaciones relacionadas con el "Panel
 * Estadístico de Cursos" en el panel de administración. Proporciona métodos
 * para buscar cursos, obtener detalles de cursos y estadísticas de usuarios
 * dentro de cursos.
 * AdminCourseInsightService
 */
@Service
@RequiredArgsConstructor
public class AdminCourseInsightService {

    private static final String[] WORK_GRADE_KEYWORDS = { "trabajo", "proyecto", "practica", "práctica", "actividad",
            "tarea" };
    private static final String[] FINAL_EXAM_KEYWORDS = { "examen final", "final", "examen" };

    private final CoursesRepository coursesRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final com.cursosonline.backend.repository.CourseGradeRepository courseGradeRepository;
    private final com.cursosonline.backend.repository.AcademicEvaluationRepository academicEvaluationRepository;
    private final AdminCourseStatsHistoryRepository courseHistoryRepository;

    /**
     * Realiza una búsqueda de cursos en el panel de administración utilizando un
     * término de búsqueda (keyword). Devuelve una lista de resultados que contienen
     * información básica del curso.
     * 
     * @param keyword El término de búsqueda utilizado para filtrar los cursos.
     * @return Lista de AdminCourseSearchResultDTO que coinciden con el término de
     *         búsqueda.
     */
    @Transactional(readOnly = true)
    public List<AdminCourseSearchResultDTO> searchCourses(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return Collections.emptyList();
        }
        String formatted = "%" + keyword.trim() + "%";
        String starts = keyword.trim() + "%";

        return coursesRepository.searchCoursesPredictive(formatted, starts, PageRequest.of(0, 15))
                .stream()
                .map(c -> new AdminCourseSearchResultDTO(c.getCourse_id(), c.getTitle(), c.getCategory()))
                .toList();
    }

    /**
     * Obtiene los detalles de un curso específico, incluyendo el profesor asignado
     * y
     * la lista de alumnos inscritos.
     * 
     * @param courseId El ID del curso para el cual se desean obtener los detalles.
     * @return AdminCourseDetailDTO que contiene los detalles del curso, incluyendo
     *         el profesor asignado y la lista de alumnos inscritos.
     */
    @Transactional(readOnly = true)
    public AdminCourseDetailDTO getCourseDetail(Long courseId) {
        Courses course = coursesRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Curso no encontrado con id: " + courseId));

        AdminEnrolledUserDTO professorDTO = null;
        Users professor = course.getAssignedUser();
        if (professor != null) {
            professorDTO = new AdminEnrolledUserDTO(professor.getUser_id(), professor.getUsername(),
                    professor.getRole().name(), professor.isEnabled());
        }

        List<AdminEnrolledUserDTO> students = enrollmentRepository.findAllByCourseId(courseId).stream()
                .map(enrollment -> enrollment.getUser())
                .filter(Objects::nonNull)
                .map(u -> new AdminEnrolledUserDTO(u.getUser_id(), u.getUsername(), u.getRole().name(), u.isEnabled()))
                .toList();

        return new AdminCourseDetailDTO(course.getCourse_id(), course.getTitle(), professorDTO, students);
    }

    /**
     * Obtiene las estadísticas de un usuario específico dentro de un curso
     * determinado. Si el usuario es un profesor, se omiten las estadísticas
     * individuales.
     * 
     * @param courseId El ID del curso para el cual se desean obtener las
     *                 estadísticas.
     * @param userId   El ID del usuario para el cual se desean obtener las
     *                 estadísticas.
     * @return AdminCourseUserStatsDTO que contiene las estadísticas del usuario en
     *         el curso.
     * @throws ResourceNotFoundException si el curso o el usuario no existen, o si
     *                                   el usuario no está matriculado en el curso.
     */
    @Transactional(readOnly = true)
    public AdminCourseUserStatsDTO getUserStatsInCourse(Long courseId, Long userId) {
        if (!coursesRepository.existsById(courseId)) {
            throw new ResourceNotFoundException("Curso no encontrado con id: " + courseId);
        }
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + userId));

        CourseCollectiveMetrics collectiveMetrics = resolveCourseCollectiveMetrics(courseId);

        // El profesor no está matriculado: sin progreso individual ni notas.
        if (user.getRole() == Role.PROFESSOR) {
            return new AdminCourseUserStatsDTO(
                    collectiveMetrics.activeStudentsInCourse(),
                    null,
                    collectiveMetrics.courseAverageProgressPercentage(),
                    List.of(),
                    null,
                    null,
                    collectiveMetrics.completionRatePercentage(),
                    collectiveMetrics.averageCourseRating(),
                    collectiveMetrics.averageInstructorRating());
        }

        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "El alumno no está matriculado en el curso indicado."));

        int studentProgress = userService.calculateCurrentProgress(enrollment);
        List<CourseGrade> enrollmentGrades = enrollment.getGrades() == null ? List.of() : enrollment.getGrades();

        List<AdminCourseUserStatsDTO.GradeItem> grades = enrollmentGrades.stream()
                .map(g -> new AdminCourseUserStatsDTO.GradeItem(g.getTitle(), g.getScore()))
                .toList();

        Double workGrade = resolveGradeByKeywords(enrollmentGrades, WORK_GRADE_KEYWORDS);
        Double finalExamGrade = resolveGradeByKeywords(enrollmentGrades, FINAL_EXAM_KEYWORDS);

        return new AdminCourseUserStatsDTO(
                collectiveMetrics.activeStudentsInCourse(),
                studentProgress,
                collectiveMetrics.courseAverageProgressPercentage(),
                grades,
                workGrade,
                finalExamGrade,
                collectiveMetrics.completionRatePercentage(),
                collectiveMetrics.averageCourseRating(),
                collectiveMetrics.averageInstructorRating());
    }

    /**
     * Calcula y devuelve las métricas colectivas de un curso específico, incluyendo
     * el número de alumnos activos, el progreso promedio del curso, la tasa de
     * finalización,
     * la calificación promedio del curso y la calificación promedio del instructor.
     * 
     * @param courseId El ID del curso para el cual se desean obtener las métricas
     *                 colectivas.
     * @return AdminCourseCollectiveStatsDTO que contiene las métricas colectivas
     *         del curso.
     */
    @Transactional(readOnly = true)
    public AdminCourseCollectiveStatsDTO getCourseCollectiveStats(Long courseId) {
        if (!coursesRepository.existsById(courseId)) {
            throw new ResourceNotFoundException("Curso no encontrado con id: " + courseId);
        }

        CourseCollectiveMetrics metrics = resolveCourseCollectiveMetrics(courseId);
        List<AdminCourseStudentStatsDTO> studentStatistics = resolveStudentStatistics(courseId);
        List<AdminCourseCollectiveStatsDTO.CourseCommentDTO> courseComments = academicEvaluationRepository
                .findCourseCommentsOrderByEvaluationDateDesc(courseId)
                .stream()
                .filter(evaluation -> evaluation.getCourseComment() != null
                        && !evaluation.getCourseComment().isBlank())
                .map(evaluation -> new AdminCourseCollectiveStatsDTO.CourseCommentDTO(
                        evaluation.getEvaluationid(),
                        evaluation.getUser() != null && evaluation.getUser().getUsername() != null
                                ? evaluation.getUser().getUsername()
                                : "Alumno anonimizado",
                        evaluation.getCourse_score(),
                        evaluation.getInstructor_score(),
                        evaluation.getCourseComment().trim(),
                        evaluation.getEvaluation_date()))
                .toList();
        int currentYear = Year.now().getValue();
        List<Integer> historicalYears = List.of(currentYear - 1, currentYear - 2);
        Map<Integer, AdminCourseStatsHistory> historyByYear = new HashMap<>();
        for (AdminCourseStatsHistory row : courseHistoryRepository
                .findAllByCourseAndYears(courseId, historicalYears)) {
            historyByYear.put(row.getSnapshotYear(), row);
        }
        List<AdminCourseCollectiveStatsDTO.AdminCourseYearComparisonDTO> comparisons = new ArrayList<>();
        for (int year : historicalYears) {
            AdminCourseStatsHistory row = historyByYear.get(year);
            if (row == null) {
                boolean canSeedFictitious = metrics.activeStudentsInCourse() > 0;
                double factor = year == currentYear - 1 ? 0.93 : 0.86;
                comparisons.add(new AdminCourseCollectiveStatsDTO.AdminCourseYearComparisonDTO(
                        year,
                        canSeedFictitious ? (int) Math.round(metrics.activeStudentsInCourse() * factor) : 0,
                        canSeedFictitious ? (int) Math.round(metrics.courseAverageProgressPercentage() * factor) : 0,
                        canSeedFictitious ? (int) Math.round(metrics.completionRatePercentage() * factor) : 0,
                        scale(metrics.averageCourseRating(), factor),
                        scale(metrics.averageInstructorRating(), factor),
                        scale(metrics.averageGrade(), factor),
                        scale(metrics.averageWorkGrade(), factor),
                        scale(metrics.averageFinalExamGrade(), factor),
                        false));
            } else {
                comparisons.add(toYearComparison(row));
            }
        }
        return new AdminCourseCollectiveStatsDTO(
                metrics.activeStudentsInCourse(),
                metrics.courseAverageProgressPercentage(),
                metrics.completionRatePercentage(),
                metrics.averageCourseRating(),
                metrics.averageInstructorRating(),
                courseComments,
                metrics.averageGrade(),
                metrics.averageWorkGrade(),
                metrics.averageFinalExamGrade(), comparisons, studentStatistics);
    }

    @Transactional
    public int finalizePreviousYearCourseStatsNow(Long courseId) {
        if (!coursesRepository.existsById(courseId)) {
            throw new ResourceNotFoundException("Curso no encontrado con id: " + courseId);
        }
        int year = Year.now().getValue() - 1;
        CourseCollectiveMetrics metrics = resolveCourseCollectiveMetrics(courseId);
        AdminCourseStatsHistory row = courseHistoryRepository
                .findByCourseAndYear(courseId, year)
                .orElseGet(AdminCourseStatsHistory::new);
        Courses course = coursesRepository.findById(courseId).orElseThrow();
        row.setCourse(course);
        row.setSnapshotYear(year);
        row.setActiveStudentsInCourse(metrics.activeStudentsInCourse());
        row.setCourseAverageProgressPercentage(metrics.courseAverageProgressPercentage());
        row.setApprovalIndexPercentage(metrics.completionRatePercentage());
        row.setAverageCourseRating(metrics.averageCourseRating());
        row.setAverageInstructorRating(metrics.averageInstructorRating());
        row.setAverageGrade(metrics.averageGrade());
        row.setAverageWorkGrade(metrics.averageWorkGrade());
        row.setAverageFinalExamGrade(metrics.averageFinalExamGrade());
        row.setRealData(true);
        row.setGeneratedAt(java.time.LocalDateTime.now());
        courseHistoryRepository.save(row);
        return year;
    }

    @Scheduled(cron = "${app.admin.course-stats.finalize-cron:0 20 0 1 1 *}", zone = "${app.admin.global-stats.time-zone:Europe/Madrid}")
    @Transactional
    public void finalizePreviousYearCourseStats() {
        for (Courses course : coursesRepository.findAll()) {
            if (course != null && course.getCourse_id() != null) {
                finalizePreviousYearCourseStatsNow(course.getCourse_id());
            }
        }
    }

    private AdminCourseCollectiveStatsDTO.AdminCourseYearComparisonDTO toYearComparison(AdminCourseStatsHistory row) {
        return new AdminCourseCollectiveStatsDTO.AdminCourseYearComparisonDTO(
                row.getSnapshotYear(), row.getActiveStudentsInCourse(), row.getCourseAverageProgressPercentage(),
                row.getApprovalIndexPercentage(), row.getAverageCourseRating(), row.getAverageInstructorRating(),
                row.getAverageGrade(), row.getAverageWorkGrade(), row.getAverageFinalExamGrade(), row.isRealData());
    }

    private Double scale(Double value, double factor) {
        return value == null ? null : Math.round(value * factor * 10.0) / 10.0;
    }

    private List<AdminCourseStudentStatsDTO> resolveStudentStatistics(Long courseId) {
        List<Enrollment> activeEnrollments = enrollmentRepository.findActiveStudentEnrollmentsByCourseId(courseId);
        Map<Long, List<CourseGrade>> gradesByEnrollment = new LinkedHashMap<>();
        for (CourseGrade grade : courseGradeRepository.findAllByCourseIdWithStudentEnrollment(courseId)) {
            if (grade.getEnrollment() != null && grade.getEnrollment().getEnrollmentid() != null) {
                gradesByEnrollment
                        .computeIfAbsent(grade.getEnrollment().getEnrollmentid(), ignored -> new ArrayList<>())
                        .add(grade);
            }
        }

        return activeEnrollments.stream()
                .filter(enrollment -> enrollment.getUser() != null && enrollment.getUser().getUser_id() != null)
                .map(enrollment -> {
                    List<CourseGrade> grades = gradesByEnrollment.getOrDefault(enrollment.getEnrollmentid(), List.of());
                    Double average = averageScore(grades);
                    Double work = averageScoreByKeywords(grades, WORK_GRADE_KEYWORDS);
                    Double exam = averageScoreByKeywords(grades, FINAL_EXAM_KEYWORDS);
                    return new AdminCourseStudentStatsDTO(
                            enrollment.getUser().getUser_id(),
                            enrollment.getUser().getUsername(),
                            userService.calculateCurrentProgress(enrollment),
                            toBigDecimal(average),
                            toBigDecimal(work),
                            toBigDecimal(exam),
                            average != null && average > 5.0);
                })
                .toList();
    }

    private BigDecimal toBigDecimal(Double value) {
        return value == null ? null : BigDecimal.valueOf(value).setScale(1, java.math.RoundingMode.HALF_UP);
    }

    /**
     * Resuelve las métricas colectivas de un curso específico, incluyendo el número
     * de alumnos activos,
     * el progreso promedio del curso, la tasa de finalización, la calificación
     * promedio del curso y la calificación promedio del instructor.
     * 
     * @param courseId El ID del curso para el cual se desean resolver las métricas
     *                 colectivas.
     * @return CourseCollectiveMetrics que contiene las métricas colectivas del
     *         curso.
     */
    private CourseCollectiveMetrics resolveCourseCollectiveMetrics(Long courseId) {
        List<Enrollment> activeEnrollments = enrollmentRepository.findActiveStudentEnrollmentsByCourseId(courseId);
        int activeStudents = activeEnrollments.size();
        int courseAverageProgress = activeEnrollments.isEmpty()
                ? 0
                : (int) Math.round(activeEnrollments.stream()
                        .mapToInt(userService::calculateCurrentProgress)
                        .average()
                        .orElse(0.0));

        List<CourseGrade> courseGrades = courseGradeRepository.findAllByCourseIdAndEnabledStudent(courseId);

        return new CourseCollectiveMetrics(
                activeStudents,
                courseAverageProgress,
                completionRatePercentage(courseId),
                averageCourseRating(courseId),
                averageInstructorRating(courseId),
                averageScore(courseGrades),
                averageScoreByKeywords(courseGrades, WORK_GRADE_KEYWORDS),
                averageScoreByKeywords(courseGrades, FINAL_EXAM_KEYWORDS));
    }

    /**
     * Calcula la media de las calificaciones de un conjunto de CourseGrade.
     * 
     * @param grades La lista de calificaciones del curso.
     * @return La media de las calificaciones, o null si no hay calificaciones
     *         válidas.
     */
    private Double averageScore(List<CourseGrade> grades) {
        if (grades == null || grades.isEmpty()) {
            return null;
        }

        double average = grades.stream()
                .filter(grade -> grade != null && grade.getScore() != null)
                .mapToDouble(grade -> grade.getScore().doubleValue())
                .average()
                .orElse(Double.NaN);

        return Double.isNaN(average) ? null : average;
    }

    /**
     * Calcula la media de las calificaciones de un conjunto de CourseGrade que
     * coinciden con palabras clave específicas.
     * 
     * @param grades   La lista de calificaciones del curso.
     * @param keywords Las palabras clave para filtrar las calificaciones.
     * @return La media de las calificaciones que coinciden con las palabras clave,
     *         o null si no hay calificaciones válidas.
     */
    private Double averageScoreByKeywords(List<CourseGrade> grades, String... keywords) {
        if (grades == null || grades.isEmpty()) {
            return null;
        }

        double average = grades.stream()
                .filter(Objects::nonNull)
                .filter(grade -> grade.getScore() != null && matchesAnyKeyword(grade.getTitle(), keywords))
                .mapToDouble(grade -> grade.getScore().doubleValue())
                .average()
                .orElse(Double.NaN);

        return Double.isNaN(average) ? null : average;
    }

    /**
     * Verifica si el título de un CourseGrade contiene alguna de las palabras clave
     * proporcionadas.
     * 
     * @param title    El título del CourseGrade.
     * @param keywords Las palabras clave a verificar en el título.
     * @return true si el título contiene alguna de las palabras clave, false en
     *         caso contrario.
     */
    private boolean matchesAnyKeyword(String title, String... keywords) {
        if (title == null || keywords == null || keywords.length == 0) {
            return false;
        }

        String normalizedTitle = title.toLowerCase(Locale.ROOT);
        for (String keyword : keywords) {
            if (normalizedTitle.contains(keyword.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    /**
     * Clase interna para encapsular las métricas colectivas de un curso, incluyendo
     * el número de alumnos activos, el progreso promedio del curso, la tasa de
     * finalización, la calificación promedio del curso y la calificación promedio
     * del instructor.
     * Esta clase se utiliza internamente para calcular y devolver las métricas
     * colectivas de un curso específico.
     * CourseCollectiveMetrics
     * 
     * @param activeStudentsInCourse
     * @param courseAverageProgressPercentage
     * @param completionRatePercentage
     * @param averageCourseRating
     * @param averageInstructorRating
     * @param averageGrade
     * @param averageWorkGrade
     * @param averageFinalExamGrade
     */
    private record CourseCollectiveMetrics(
            int activeStudentsInCourse,
            int courseAverageProgressPercentage,
            int completionRatePercentage,
            Double averageCourseRating,
            Double averageInstructorRating,
            Double averageGrade,
            Double averageWorkGrade,
            Double averageFinalExamGrade) {
    }

    /**
     * Resuelve la calificación de un usuario en un curso específico buscando
     * coincidencias con palabras clave en los títulos de las calificaciones.
     * 
     * @param grades   La lista de calificaciones del curso.
     * @param keywords Las palabras clave para filtrar las calificaciones.
     * @return La calificación que coincide con las palabras clave, o null si no se
     *         encuentra ninguna.
     */
    private Double resolveGradeByKeywords(List<CourseGrade> grades, String... keywords) {
        for (CourseGrade grade : grades) {
            if (grade == null || grade.getTitle() == null || grade.getScore() == null) {
                continue;
            }

            String normalizedTitle = grade.getTitle().toLowerCase(Locale.ROOT);
            for (String keyword : keywords) {
                if (normalizedTitle.contains(keyword.toLowerCase(Locale.ROOT))) {
                    return grade.getScore().doubleValue();
                }
            }
        }

        return null;
    }

    /**
     * Calcula el porcentaje de alumnos inscritos en un curso que han obtenido una
     * nota superior a 5.
     * 
     * @param courseId El ID del curso para el cual se desea calcular el porcentaje
     *                 de alumnos aprobados.
     * @return El porcentaje de alumnos inscritos en el curso que han obtenido una
     *         nota superior a 5.
     */
    private int completionRatePercentage(Long courseId) {
        int totalEnrolled = enrollmentRepository.findAllByCourseId(courseId).size();
        if (totalEnrolled == 0) {
            return 0;
        }
        long passing = courseGradeRepository.countStudentsWithPassingGradeByCourseId(courseId);
        return (int) Math.round((passing * 100.0) / totalEnrolled);
    }

    /**
     * Calcula la media de valoraciones de los alumnos para un curso específico.
     * 
     * @param courseId El ID del curso para el cual se desea calcular la media de
     *                 valoraciones de los alumnos.
     * @return La media de valoraciones de los alumnos para el curso especificado,
     *         null si aún no hay votos.
     */
    private Double averageCourseRating(Long courseId) {
        return academicEvaluationRepository.getAverageCourseScoreByCourseIds(List.of(courseId));
    }

    /**
     * Calcula la media de valoraciones del profesor para un curso específico.
     * 
     * @param courseId El ID del curso para el cual se desea calcular la media de
     *                 valoraciones del profesor.
     * @return La media de valoraciones del profesor para el curso especificado,
     *         null si aún no hay votos.
     */
    private Double averageInstructorRating(Long courseId) {
        return academicEvaluationRepository.getAverageInstructorScoreByCourseIds(List.of(courseId));
    }
}