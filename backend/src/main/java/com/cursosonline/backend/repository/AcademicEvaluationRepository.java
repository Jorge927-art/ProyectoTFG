package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.AcademicEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AcademicEvaluationRepository extends JpaRepository<AcademicEvaluation, Long> {

    /**
     * [RATING DUAL - ASIGNATURA]: Calcula la media aritmética local (Comunidad)
     * para un curso específico. Retorna null si aún no tiene votos.
     */
    @Query("SELECT AVG(ae.course_score) FROM AcademicEvaluation ae WHERE ae.course.course_id = :courseId")
    Double getAverageCourseScore(@Param("courseId") Long courseId);

    /**
     * [RATING DUAL - DOCENTE]: Calcula la media aritmética local (Comunidad) de un
     * profesor evaluando las coincidencias de texto del campo instructors de la
     * tabla courses.
     */
    @Query("SELECT AVG(ae.instructor_score) FROM AcademicEvaluation ae WHERE ae.course.instructors = :instructorName")
    Double getAverageInstructorScore(@Param("instructorName") String instructorName);

    /**
     * [BLINDAJE DE IDENTIDAD]: Verifica de forma atómica si un alumno ya emitió
     * una calificación para un curso antes de permitir la inserción.
     */
    @Query("SELECT COUNT(ae) > 0 FROM AcademicEvaluation ae WHERE ae.user.username = :username AND ae.course.course_id = :courseId")
    boolean existsByUserUsernameAndCourseCourseId(@Param("username") String username, @Param("courseId") Long courseId);

    /**
     * [CONSOLA DOCENTE - MEDIA GRUPO]: Calcula la media aritmética del progreso o
     * rendimiento global de todos los alumnos activos matriculados en una
     * asignatura.
     */
    @Query("SELECT AVG(ae.course_score) FROM AcademicEvaluation ae WHERE ae.course.course_id = :courseId " +
            "AND ae.user.enabled = true")
    Double getGroupAveragePerformance(@Param("courseId") Long courseId);

    /**
     * [CONSOLA DOCENTE - NOTA INDIVIDUAL]: Recupera el rendimiento medio de un
     * estudiante
     * específico dentro de una asignatura para alimentar la micro-gráfica
     * comparativa dual.
     */
    @Query("SELECT AVG(ae.course_score) FROM AcademicEvaluation ae WHERE ae.course.course_id = :courseId " +
            "AND ae.user.user_id = :userId")
    Double getIndividualStudentPerformance(@Param("courseId") Long courseId, @Param("userId") Long userId);

}
