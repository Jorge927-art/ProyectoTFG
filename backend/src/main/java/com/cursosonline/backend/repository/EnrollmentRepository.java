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
     * Dictamen NotebookLM: Recupera las matrículas activas filtrando por ID
     * numérico.
     * El JOIN FETCH inicializa la relación 'course' mitigando la
     * LazyInitializationException.
     * [CORRECCIÓN EFECTO DOMINÓ]: Añadido ORDER BY estricto por enrollmentid
     * para fijar el cursor de PostgreSQL tras los updates.
     */
    @Query("SELECT e FROM Enrollment e JOIN FETCH e.course WHERE e.user.user_id = :userId ORDER BY e.enrollmentid ASC")
    List<Enrollment> findAllByUserIdWithCourses(@Param("userId") Long userId);

    /**
     * [BLINDAJE DE CONSULTA TFG]: Consulta HQL directa para forzar la coincidencia
     * exacta
     * del ID de matrícula y el nombre de usuario de la cuenta, evitando fallos por
     * minúsculas.
     */
    @Query("SELECT e FROM Enrollment e WHERE e.enrollmentid = :enrollmentId AND e.user.username = :username")
    Optional<Enrollment> findByEnrollmentidAndUserUsername(@Param("enrollmentId") Long enrollmentId,
            @Param("username") String username);

}
