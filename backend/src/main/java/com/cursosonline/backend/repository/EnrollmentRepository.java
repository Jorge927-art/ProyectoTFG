package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    @Query("SELECT e.course.course_id FROM Enrollment e WHERE e.user.user_id = :userId")
    List<Long> findEnrolledCourseIdsByUserId(@Param("userId") Long userId);

    @Query("SELECT e FROM Enrollment e WHERE e.user.user_id = :userId AND e.course.course_id = :courseId")
    Optional<Enrollment> findByUserIdAndCourseId(@Param("userId") Long userId, @Param("courseId") Long courseId);

    /**
     * [CORRECCIÓN EFECTO DOMINÓ]: Añadido ORDER BY estricto por enrollmentid
     * para fijar el cursor de PostgreSQL tras los updates.
     */
    @Query("SELECT e FROM Enrollment e JOIN FETCH e.course WHERE e.user.user_id = :userId ORDER BY e.enrollmentid ASC")
    List<Enrollment> findAllByUserIdWithCourses(@Param("userId") Long userId);

    /**
     * [CORRECCIÓN EFECTO DOMINÓ]: Añadido ORDER BY estricto por enrollmentid
     * para fijar el cursor de PostgreSQL tras los updates.
     */
    @Query("SELECT e FROM Enrollment e WHERE e.enrollmentid = :enrollmentId AND e.user.username = :username")
    Optional<Enrollment> findByEnrollmentidAndUserUsername(@Param("enrollmentId") Long enrollmentId,
            @Param("username") String username);

    // =========================================================================
    // --- SISTEMA DE EVALUACIÓN ACADÉMICA DUAL ---
    // =========================================================================

    /**
     * [CONTROL DE SEGURIDAD EXCLUSIVO]: Valida si un nombre de usuario cuenta con
     * una matrícula legítima para un ID de curso específico antes de procesar el
     * voto.
     */
    @Query("SELECT COUNT(e) > 0 FROM Enrollment e WHERE e.user.username = :username AND e.course.course_id = :courseId")
    boolean existsByUsernameAndCourseId(@Param("username") String username, @Param("courseId") Long courseId);

    /**
     * [FILTRADO DOCENTE ACTIVO]: Recupera las matrículas del alumno inicializando
     * 'course'
     * y excluyendo por subconsulta los cursos que ya cuenten con una calificación
     * previa de este usuario.
     */
    @Query("SELECT e FROM Enrollment e JOIN FETCH e.course c WHERE e.user.username = :username " +
            "AND c.course_id NOT IN (SELECT ae.course.course_id FROM AcademicEvaluation ae WHERE ae.user.username = :username) "
            +
            "ORDER BY e.enrollmentid ASC")
    List<Enrollment> findPendingEvaluationsByUsername(@Param("username") String username);
}
