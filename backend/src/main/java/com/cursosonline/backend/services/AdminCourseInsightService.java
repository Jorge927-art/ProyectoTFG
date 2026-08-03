package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.*;
import com.cursosonline.backend.entities.*;
import com.cursosonline.backend.exception.ResourceNotFoundException;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

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

    @Transactional(readOnly = true)
    public AdminCourseCollectiveStatsDTO getCourseCollectiveStats(Long courseId) {
        if (!coursesRepository.existsById(courseId)) {
            throw new ResourceNotFoundException("Curso no encontrado con id: " + courseId);
        }

        CourseCollectiveMetrics metrics = resolveCourseCollectiveMetrics(courseId);
        return new AdminCourseCollectiveStatsDTO(
                metrics.activeStudentsInCourse(),
                metrics.courseAverageProgressPercentage(),
                metrics.completionRatePercentage(),
                metrics.averageCourseRating(),
                metrics.averageInstructorRating(),
                metrics.averageGrade(),
                metrics.averageWorkGrade(),
                metrics.averageFinalExamGrade());
    }

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