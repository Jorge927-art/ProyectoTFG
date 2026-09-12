package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Courses;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CoursesRepository extends JpaRepository<Courses, Long> {

        /**
         * Recupera un curso por su clave de título única, utilizada para la
         * identificación y acceso a cursos específicos.
         * 
         * @param titleKey La clave de título única del curso.
         * @return Un Optional que contiene el curso si se encuentra, o vacío si no.
         */
        java.util.Optional<Courses> findByTitleKey(String titleKey);

        /**
         * Verifica si existe un curso con la clave de título única especificada.
         * Esto es útil para validar la unicidad de los cursos antes de su creación o
         * actualización.
         * 
         * @param titleKey La clave de título única del curso.
         * @return true si existe un curso con la clave de título especificada, false en
         *         caso contrario.
         */
        @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM Courses c WHERE c.titleKey = :titleKey")
        boolean existsByTitleKey(@Param("titleKey") String titleKey);

        /**
         * Recupera todos los cursos ordenados alfabéticamente por su título.
         * Esto es útil para mostrar un listado completo de cursos en la interfaz de
         * usuario.
         * 
         * @return Una lista de todos los cursos ordenados alfabéticamente por su
         *         título.
         */
        List<Courses> findAllByOrderByTitleAsc();

        /**
         * Recupera todos los cursos cuyo profesor titular coincide con el usuario
         * indicado, ordenados alfabéticamente por título.
         */
        @Query("SELECT c FROM Courses c WHERE c.assignedUser.user_id = :userId ORDER BY c.title ASC")
        List<Courses> findAllByAssignedUser_UserIdOrderByTitleAsc(@Param("userId") Long userId);

        /**
         * Recupera las asignaturas asignadas al profesor autenticado mediante
         * la relación fuerte assigned_user_id.
         */
        @Query("SELECT c FROM Courses c " +
                        "WHERE c.assignedUser IS NOT NULL " +
                        "AND LOWER(c.assignedUser.username) = LOWER(:username) " +
                        "ORDER BY c.title ASC")
        List<Courses> findAllAssignedToProfessor(@Param("username") String username);

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
