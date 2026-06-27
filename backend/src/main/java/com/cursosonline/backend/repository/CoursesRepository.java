package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Courses;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

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
    List<Courses> searchCoursesPredictive(
            @Param("formattedKeyword") String formattedKeyword,
            @Param("startKeyword") String startKeyword,
            Pageable pageable);
}
