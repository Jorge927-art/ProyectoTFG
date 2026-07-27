package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.AcademicEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

/**
 * Repositorio para la entidad AcademicEvaluation, proporcionando métodos de
 * CRUD y consultas personalizadas relacionadas con las evaluaciones académicas.
 */
public interface AcademicEvaluationRepository extends JpaRepository<AcademicEvaluation, Long> {

        /**
         * [RATING DUAL - ASIGNATURA]: Calcula la media aritmética local (Comunidad)
         * para un curso específico. Retorna null si aún no tiene votos.
         * 
         * @param courseId El ID del curso.
         * @return La media aritmética de las evaluaciones del curso específico.
         */
        @Query("SELECT AVG(ae.course_score) FROM AcademicEvaluation ae WHERE ae.course.course_id = :courseId")
        Double getAverageCourseScore(@Param("courseId") Long courseId);

        /**
         * [RATING DUAL - DOCENTE]: Calcula la media aritmética local (Comunidad) para
         * un
         * instructor específico. Retorna null si aún no tiene votos.
         * 
         * @param instructorName El nombre del instructor.
         * @return La media aritmética de las evaluaciones del instructor específico.
         */
        @Query("SELECT AVG(ae.instructor_score) FROM AcademicEvaluation ae WHERE ae.course.instructors = :instructorName")
        Double getAverageInstructorScore(@Param("instructorName") String instructorName);

        /**
         * [BLINDAJE DE IDENTIDAD TFG]: Verifica si un usuario ya ha emitido una
         * evaluación
         * para un curso específico, evitando duplicados.
         * 
         * @param username El nombre de usuario del estudiante.
         * @param courseId El ID del curso.
         * @return true si el usuario ya ha emitido una evaluación para el curso, false
         *         en caso contrario.
         */
        @Query("SELECT COUNT(ae) > 0 FROM AcademicEvaluation ae WHERE ae.user.username = :username AND ae.course.course_id = :courseId")
        boolean existsByUserUsernameAndCourseCourseId(@Param("username") String username,
                        @Param("courseId") Long courseId);

        /**
         * [CONSOLA DOCENTE - RENDIMIENTO GRUPO]: Calcula la media aritmética del
         * progreso o rendimiento de un grupo de alumnos en una asignatura concreta.
         * 
         * @param courseId El ID del curso.
         * @return La media aritmética del progreso o rendimiento del grupo de alumnos
         *         en la asignatura.
         */
        @Query("SELECT AVG(ae.course_score) FROM AcademicEvaluation ae WHERE ae.course.course_id = :courseId " +
                        "AND ae.user.enabled = true")
        Double getGroupAveragePerformance(@Param("courseId") Long courseId);

        /**
         * [CONSOLA DOCENTE - RENDIMIENTO INDIVIDUAL]: Calcula la media aritmética del
         * progreso o rendimiento de un alumno específico en una asignatura concreta.
         * 
         * @param courseId El ID del curso.
         * @param userId   El ID del usuario.
         * @return La media aritmética del progreso o rendimiento del alumno en la
         *         asignatura.
         */
        @Query("SELECT AVG(ae.course_score) FROM AcademicEvaluation ae WHERE ae.course.course_id = :courseId " +
                        "AND ae.user.user_id = :userId")
        Double getIndividualStudentPerformance(@Param("courseId") Long courseId, @Param("userId") Long userId);

        /**
         * [CONSOLA DOCENTE - MEDIA GRUPO]: Calcula la media de course_score sobre el
         * conjunto de asignaturas dado.
         * 
         * @param courseIds La lista de IDs de los cursos.
         * @return La media de course_score sobre el conjunto de asignaturas dado.
         */
        @Query("SELECT AVG(ae.course_score) FROM AcademicEvaluation ae WHERE ae.course.course_id IN :courseIds")
        Double getAverageCourseScoreByCourseIds(@Param("courseIds") List<Long> courseIds);

        /**
         * [PANEL DOCENTE - VALORACIONES DEL PROFESOR]: Media de instructor_score sobre
         * el conjunto de asignaturas dado.
         * 
         * @param courseIds La lista de IDs de los cursos.
         * @return La media de instructor_score sobre el conjunto de asignaturas dado.
         */
        @Query("SELECT AVG(ae.instructor_score) FROM AcademicEvaluation ae WHERE ae.course.course_id IN :courseIds")
        Double getAverageInstructorScoreByCourseIds(@Param("courseIds") List<Long> courseIds);

        /**
         * Recupera todas las evaluaciones académicas asociadas a un usuario específico,
         * usadas para anonimizarlas (no borrarlas) durante la baja permanente de una
         * cuenta.
         * 
         * @param userId El ID del usuario.
         * @return Una lista de evaluaciones académicas asociadas al usuario
         *         especificado.
         */
        @Query("SELECT ae FROM AcademicEvaluation ae WHERE ae.user.user_id = :userId")
        List<AcademicEvaluation> findByUserId(@Param("userId") Long userId);
}
