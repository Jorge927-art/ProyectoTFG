package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Courses;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CoursesRepository extends JpaRepository<Courses, Long> {

        /**
         * Recupera las asignaturas asignadas al profesor autenticado tanto por la
         * relación fuerte assigned_user_id como por el campo legacy instructors.
         */
        @Query("SELECT c FROM Courses c " +
                        "WHERE (c.assignedUser IS NOT NULL AND c.assignedUser.username = :username) " +
                        "   OR (c.instructors IS NOT NULL AND LOWER(c.instructors) LIKE LOWER(CONCAT('%', :username, '%'))) "
                        +
                        "ORDER BY c.title ASC")
        java.util.List<Courses> findAllAssignedToProfessor(@Param("username") String username);

        /**
         * Recupera cursos con instructor textual informado para compatibilidad
         * con datos legacy.
         */
        java.util.List<Courses> findAllByInstructorsIsNotNullOrderByTitleAsc();

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
         * Cruza el catálogo con las métricas locales de matrículas, notas y
         * valoraciones.
         * Sincronizado estrictamente con course_grades y academic_evaluations en
         * PostgreSQL.
         */
        @Query(value = "SELECT c.course_id as courseId, " +
                        "AVG(cg.score) as averageGrade, "
                        +
                        "COUNT(DISTINCT e.enrollmentid) as localEnrollments, " +
                        "AVG(ae.course_score) as communityRating, " +
                        "AVG(ae.instructor_score) as instructorRating, " +
                        "c.site as platform, " +
                        "c.category as category " +
                        "FROM courses c " +
                        "LEFT JOIN enrollment e ON e.course_id = c.course_id " +
                        "LEFT JOIN course_grades cg ON cg.enrollment_id = e.enrollmentid " +
                        "LEFT JOIN academic_evaluations ae ON ae.course_id = c.course_id " +
                        "WHERE c.course_id = :courseId " +
                        "GROUP BY c.course_id, c.site, c.category", nativeQuery = true)
        java.util.Map<String, Object> getCourseAnalyticalStatsNative(@Param("courseId") Long courseId);

}
