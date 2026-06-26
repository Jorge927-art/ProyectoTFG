package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Courses;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface CoursesRepository extends JpaRepository<Courses, Long> {

    /**
     * Búsqueda predictiva optimizada.
     * Prioriza coincidencias al inicio del título y limita los resultados mediante
     * Pageable.
     */
    @Query("SELECT c FROM Courses c WHERE " +
            "LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(c.category) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(c.skills) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "ORDER BY " +
            "CASE WHEN LOWER(c.title) LIKE LOWER(CONCAT(:keyword, '%')) THEN 1 " + // Empieza por la palabra
            "     WHEN LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 2 " + // Contiene la palabra
            "     ELSE 3 END, c.title ASC")
    List<Courses> searchCoursesPredictive(@Param("keyword") String keyword, Pageable pageable);
}
