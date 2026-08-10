package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;

/**
 * Repository para gestionar las operaciones de persistencia relacionadas con la
 * entidad Enrollment.
 * Proporciona métodos para realizar consultas personalizadas y operaciones CRUD
 * sobre las matrículas de los alumnos en los cursos.
 * EnrollmentRepository
 */
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

        /**
         * Ranking de cursos por número de alumnos activos inscritos.
         */
        @Query("SELECT c.course_id, c.title, COUNT(DISTINCT u.user_id) " +
                        "FROM Enrollment e JOIN e.course c JOIN e.user u " +
                        "WHERE u.role = 'STUDENT' AND u.enabled = true " +
                        "GROUP BY c.course_id, c.title " +
                        "ORDER BY COUNT(DISTINCT u.user_id) DESC, c.title ASC")
        List<Object[]> findTopCoursesByActiveStudentCount(Pageable pageable);

        /**
         * [PANEL DOCENTE - LISTADO CURSOS DEL ALUMNO]: Recupera los IDs de los cursos
         * en los que un usuario específico está matriculado.
         * 
         * @param userId El ID del usuario para el cual se desean obtener los IDs de los
         *               cursos.
         * @return Lista de IDs de cursos en los que el usuario está matriculado.
         */
        @Query("SELECT e.course.course_id FROM Enrollment e WHERE e.user.user_id = :userId")
        List<Long> findEnrolledCourseIdsByUserId(@Param("userId") Long userId);

        /**
         * [PANEL DOCENTE - LISTADO CURSOS DEL ALUMNO]: Recupera la matrícula de un
         * usuario específico para un curso concreto, incluyendo la referencia al curso.
         * 
         * @param userId   El ID del usuario para el cual se desea obtener la matrícula.
         * @param courseId El ID del curso para el cual se desea obtener la matrícula.
         * @return Optional de la matrícula si existe, vacío en caso contrario.
         */
        @Query("SELECT e FROM Enrollment e WHERE e.user.user_id = :userId AND e.course.course_id = :courseId")
        Optional<Enrollment> findByUserIdAndCourseId(@Param("userId") Long userId, @Param("courseId") Long courseId);

        /**
         * [PANEL DOCENTE - LISTADO CURSOS DEL ALUMNO]: Recupera todas las matrículas de
         * un usuario específico, incluyendo la referencia al curso, ordenadas por el ID
         * de la matrícula.
         * 
         * @param userId El ID del usuario para el cual se desean obtener las
         *               matrículas.
         * @return Lista de matrículas del usuario especificado, incluyendo la
         *         referencia al curso.
         */
        @Query("SELECT e FROM Enrollment e JOIN FETCH e.course WHERE e.user.user_id = :userId ORDER BY e.enrollmentid ASC")
        List<Enrollment> findAllByUserIdWithCourses(@Param("userId") Long userId);

        /**
         * [CONTROL DE SEGURIDAD EXCLUSIVO]: Recupera una matrícula específica de un
         * usuario concreto, verificando que el nombre de usuario coincide con el de la
         * 
         * @param enrollmentId El ID de la matrícula.
         * @param username     El nombre de usuario del alumno.
         * @return Optional de la matrícula si existe y pertenece al usuario, vacío en
         *         caso contrario.
         */
        @Query("SELECT e FROM Enrollment e WHERE e.enrollmentid = :enrollmentId AND e.user.username = :username")
        Optional<Enrollment> findByEnrollmentidAndUserUsername(@Param("enrollmentId") Long enrollmentId,
                        @Param("username") String username);

        /**
         * [PANEL DOCENTE - LISTADO ALUMNOS]: Recupera todas las matrículas activas de
         * alumnos para un curso concreto, incluyendo la referencia al curso.
         * 
         * @param courseId El ID del curso para el cual se desean obtener las matrículas
         *                 activas de alumnos.
         * @return Lista de matrículas activas de alumnos para el curso especificado.
         */
        @Query("SELECT e FROM Enrollment e " +
                        "JOIN FETCH e.user u " +
                        "JOIN FETCH e.course c " +
                        "WHERE c.course_id = :courseId " +
                        "AND u.enabled = true AND u.role = 'STUDENT' ORDER BY e.enrollmentid ASC")
        List<Enrollment> findActiveStudentEnrollmentsByCourseId(@Param("courseId") Long courseId);

        /**
         * [CONTROL DE SEGURIDAD EXCLUSIVO]: Comprueba si un usuario específico está
         * matriculado en un curso concreto.
         * 
         * @param username El nombre de usuario del alumno.
         * @param courseId El ID del curso.
         * @return true si el usuario está matriculado en el curso, false en caso
         *         contrario.
         */
        @Query("SELECT COUNT(e) > 0 FROM Enrollment e WHERE e.user.username = :username AND e.course.course_id = :courseId")
        boolean existsByUsernameAndCourseId(@Param("username") String username, @Param("courseId") Long courseId);

        /**
         * [CONTROL DE SEGURIDAD EXCLUSIVO]: Recupera todas las matrículas de alumnos
         * que aún no han completado la evaluación académica para un usuario específico.
         * 
         * @param username El nombre de usuario del alumno.
         * @return Lista de matrículas pendientes de evaluación académica para el
         *         usuario especificado.
         */
        @Query("SELECT e FROM Enrollment e JOIN FETCH e.course c WHERE e.user.username = :username " +
                        "AND c.course_id NOT IN (SELECT ae.course.course_id FROM AcademicEvaluation ae WHERE ae.user.username = :username) "
                        +
                        "ORDER BY e.enrollmentid ASC")
        List<Enrollment> findPendingEvaluationsByUsername(@Param("username") String username);

        /**
         * [CONTROL DE SEGURIDAD EXCLUSIVO]: Valida si un instructor tiene autorización
         * para
         * gestionar una matrícula específica, verificando que el nombre del instructor
         * coincide con uno de los instructores del curso.
         * 
         * @param enrollmentId   El ID de la matrícula.
         * @param instructorName El nombre del instructor.
         * @return true si el instructor está autorizado para gestionar la matrícula,
         *         false en caso contrario.
         */
        @Query("SELECT COUNT(e) > 0 FROM Enrollment e " +
                        "WHERE e.enrollmentid = :enrollmentId " +
                        "AND e.course.assignedUser IS NOT NULL " +
                        "AND LOWER(e.course.assignedUser.username) = LOWER(:instructorName)")
        boolean isInstructorAuthorizedForEnrollment(
                        @Param("enrollmentId") Long enrollmentId,
                        @Param("instructorName") String instructorName);

        /**
         * [PANEL DOCENTE - LISTADO ALUMNOS]: Recupera todas las matrículas activas de
         * alumnos para un conjunto de cursos dado, incluyendo la referencia al curso.
         * 
         * @param courseIds El conjunto de IDs de cursos para los cuales se desean
         *                  obtener las matrículas activas de alumnos.
         * @return Lista de matrículas activas de alumnos para los cursos especificados.
         */
        @Query("SELECT e FROM Enrollment e " +
                        "JOIN FETCH e.course c " +
                        "JOIN FETCH e.user u " +
                        "WHERE c.course_id IN :courseIds " +
                        "AND u.enabled = true AND u.role = 'STUDENT' " +
                        "ORDER BY c.title ASC, u.username ASC")
        List<Enrollment> findActiveStudentEnrollmentsByCourseIds(@Param("courseIds") List<Long> courseIds);

        /**
         * [PANEL DOCENTE - PROGRESO PROMEDIO]: Recupera el progreso promedio de los
         * alumnos activos en el conjunto de asignaturas dado.
         * 
         * @param courseIds El conjunto de IDs de cursos para los cuales se desea
         *                  calcular el progreso promedio.
         * @return El progreso promedio de los alumnos activos en los cursos
         *         especificados.
         */
        @Query("SELECT AVG(e.progress_percentage) FROM Enrollment e WHERE e.course.course_id IN :courseIds " +
                        "AND e.user.enabled = true")
        Double getAverageProgressByCourseIds(@Param("courseIds") List<Long> courseIds);

        /**
         * [PANEL DOCENTE - TASA DE COMPLETADO]: Porcentaje de alumnos activos que han
         * completado el curso (nota > 5) en el conjunto de asignaturas dado.
         * 
         * @param courseIds El conjunto de IDs de cursos para los cuales se desea
         *                  calcular la tasa de completado.
         * @return El porcentaje de alumnos activos que han completado los cursos
         *         especificados.
         */
        @Query("SELECT (SUM(CASE WHEN e.progress_percentage = 100 THEN 1.0 ELSE 0.0 END) * 100.0) / COUNT(e) " +
                        "FROM Enrollment e WHERE e.course.course_id IN :courseIds AND e.user.enabled = true")
        Double getCompletionRateByCourseIds(@Param("courseIds") List<Long> courseIds);

        /**
         * [PANEL DOCENTE - LISTADO ALUMNOS]: Recupera todas las matrículas activas de
         * alumnos para un curso concreto, incluyendo la referencia al usuario para
         * construir DTOs docentes.
         * 
         * @param courseId El ID del curso para el cual se desean obtener las matrículas
         *                 activas de alumnos.
         * @return Lista de matrículas activas de alumnos para el curso especificado.
         */
        @Query("SELECT e FROM Enrollment e JOIN FETCH e.user WHERE e.course.course_id = :courseId " +
                        "ORDER BY e.user.username ASC")
        List<Enrollment> findAllByCourseId(@Param("courseId") Long courseId);

        /**
         * [PANEL DOCENTE - LISTADO ALUMNOS]: Comprueba si existen matrículas activas de
         * alumnos para un curso concreto, incluyendo la referencia al usuario para
         * construir DTOs docentes.
         * 
         * @param courseId El ID del curso para el cual se desea verificar la existencia
         *                 de matrículas activas de alumnos.
         * @return true si existen matrículas activas de alumnos para el curso
         *         especificado, false en caso contrario.
         */
        @Query("SELECT COUNT(e) > 0 FROM Enrollment e WHERE e.course.course_id = :courseId")
        boolean existsEnrollmentByCourseId(@Param("courseId") Long courseId);

        /**
         * [PANEL DOCENTE - LISTADO CURSOS DEL ALUMNO]: Recupera los IDs de los cursos
         * que están siendo utilizados por matrículas activas.
         * Esto es útil para filtrar cursos que tienen al menos un alumno matriculado.
         * 
         * @param courseIds El conjunto de IDs de cursos para los cuales se desea
         *                  verificar la existencia de matrículas activas de alumnos.
         * @return Lista de IDs de cursos que están siendo utilizados por matrículas
         *         activas.
         */
        @Query("SELECT DISTINCT e.course.course_id FROM Enrollment e WHERE e.course.course_id IN :courseIds")
        List<Long> findUsedCourseIds(@Param("courseIds") List<Long> courseIds);

        /**
         * Recupera las matrículas activas de cursos ficticios, es decir, cursos sin
         * profesor registrado de forma relacional pero con el campo legacy
         * instructors informado.
         */
        @Query("SELECT e FROM Enrollment e " +
                        "JOIN FETCH e.user u " +
                        "JOIN FETCH e.course c " +
                        "WHERE u.enabled = true AND u.role = 'STUDENT' " +
                        "AND c.assignedUser IS NULL " +
                        "AND c.instructors IS NOT NULL " +
                        "AND TRIM(c.instructors) <> ''")
        List<Enrollment> findActiveStudentEnrollmentsForFictitiousCourses();

}
