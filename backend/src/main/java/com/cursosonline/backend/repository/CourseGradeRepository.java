package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.CourseGrade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

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

        /**
         * [PANEL DOCENTE - NOTA MEDIA]: Media de calificaciones sobre el conjunto
         * de asignaturas dado (una o todas las del profesor).
         */
        @Query("SELECT AVG(cg.score) FROM CourseGrade cg WHERE cg.enrollment.course.course_id IN :courseIds " +
                        "AND cg.enrollment.user.enabled = true")
        Double getGroupAverageScoreByCourseIds(@Param("courseIds") List<Long> courseIds);

        /**
         * [PANEL DOCENTE - PORCENTAJE DE APROBADOS]: Cuenta el número de alumnos con
         * nota
         * superior a 5 en un curso específico.
         * 
         * @param courseId El ID del curso para el cual se desea contar los alumnos
         *                 aprobados.
         * @return El número de alumnos con nota superior a 5 en el curso especificado.
         */
        @Query("SELECT COUNT(DISTINCT cg.enrollment.enrollmentid) FROM CourseGrade cg " +
                        "WHERE cg.enrollment.course.course_id = :courseId AND cg.score > 5")
        long countStudentsWithPassingGradeByCourseId(@Param("courseId") Long courseId);
}
