package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Courses;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface CoursesRepository extends JpaRepository<Courses, Long> {

        /**
         * Búsqueda predictiva optimizada y corregida.
         * Evalúa el título y la categoría en simetría estricta con el Service de Java.
         */
        @Query("SELECT c FROM Courses c WHERE " +
                        "LOWER(c.title) LIKE LOWER(:formattedKeyword) OR " +
                        "LOWER(c.category) LIKE LOWER(:formattedKeyword) " +
                        "ORDER BY " +
                        "CASE WHEN LOWER(c.title) LIKE LOWER(:startKeyword) THEN 1 " +
                        "     WHEN LOWER(c.title) LIKE LOWER(:formattedKeyword) THEN 2 " +
                        "     ELSE 3 END, c.title ASC")
        org.springframework.data.domain.Page<Courses> searchCoursesPredictive(
                        @Param("formattedKeyword") String formattedKeyword,
                        @Param("startKeyword") String startKeyword,
                        Pageable pageable);

        /**
         * Consulta analítica de agregación para el panel estadístico [ADR-41].
         * Cruza el catálogo con las métricas locales de matrículas y calificaciones.
         * Utiliza CAST para transformar de forma segura el score (String) a double
         * precisión en PostgreSQL.
         */
        @Query("SELECT new com.cursosonline.backend.dto.CourseStatsDTO(" +
                        "c.course_id, " +
                        "AVG(CASE WHEN cg.score IS NOT NULL AND cg.score <> '' THEN CAST(cg.score AS double) ELSE null END), "
                        +
                        "COUNT(DISTINCT e.enrollmentid), " +
                        "AVG(ae.course_score), " +
                        "AVG(ae.instructor_score), " +
                        "c.site, " +
                        "c.category) " +
                        "FROM Courses c " +
                        "LEFT JOIN Enrollment e ON e.course.course_id = c.course_id " +
                        "LEFT JOIN CourseGrade cg ON cg.enrollment.enrollmentid = e.enrollmentid " +
                        "LEFT JOIN AcademicEvaluation ae ON ae.course.course_id = c.course_id " +
                        "WHERE c.course_id = :courseId " +
                        "GROUP BY c.course_id, c.site, c.category")
        Optional<com.cursosonline.backend.dto.CourseStatsDTO> getCourseAnalyticalStats(
                        @Param("courseId") Long courseId);

}
