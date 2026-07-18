package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.CourseGrade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CourseGradeRepository extends JpaRepository<CourseGrade, Long> {
    // Hereda automáticamente todos los métodos de guardado (save, etc.) de JPA

    /**
     * [CONSOLA DOCENTE - MEDIA GRUPO]: Calcula la media de calificaciones del curso
     * completo
     * restringiendo la muestra estrictamente a los estudiantes habilitados (enabled
     * = true).
     */
    @Query("SELECT AVG(cg.score) FROM CourseGrade cg WHERE cg.enrollment.course.course_id = :courseId " +
            "AND cg.enrollment.user.enabled = true")
    Double getGroupAverageScore(@Param("courseId") Long courseId);

    /**
     * [CONSOLA DOCENTE - NOTA INDIVIDUAL]: Obtiene la nota media de un estudiante
     * específico
     * en la asignatura dada para alimentar la gráfica dual del frontend.
     */
    @Query("SELECT AVG(cg.score) FROM CourseGrade cg WHERE cg.enrollment.course.course_id = :courseId " +
            "AND cg.enrollment.user.user_id = :userId")
    Double getIndividualStudentAverageScore(@Param("courseId") Long courseId, @Param("userId") Long userId);

}
