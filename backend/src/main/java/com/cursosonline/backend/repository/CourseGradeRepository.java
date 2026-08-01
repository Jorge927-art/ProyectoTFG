package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.CourseGrade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface CourseGradeRepository extends JpaRepository<CourseGrade, Long> {
        // Hereda automáticamente todos los métodos de guardado (save, etc.) de JPA

        /**
         * Verifica si una matrícula ya tiene una calificación con el título exacto
         * indicado, usado para mantener la generación automática idempotente.
         */
        boolean existsByEnrollment_EnrollmentidAndTitleIgnoreCase(Long enrollmentId, String title);

        /**
         * Recupera la primera calificación que coincida con el título indicado para
         * una matrícula concreta.
         */
        java.util.Optional<CourseGrade> findFirstByEnrollment_EnrollmentidAndTitleIgnoreCase(Long enrollmentId,
                        String title);

        /**
         * [DASHBOARD ALUMNO - HIDRATACIÓN DE NOTAS]: Recupera todas las notas de un
         * conjunto de matrículas para evitar pérdidas parciales por carga diferida.
         */
        @Query("SELECT cg FROM CourseGrade cg JOIN FETCH cg.enrollment e WHERE e.enrollmentid IN :enrollmentIds " +
                        "ORDER BY e.enrollmentid ASC, cg.gradeId ASC")
        List<CourseGrade> findAllByEnrollmentIdsOrderByGradeIdAsc(@Param("enrollmentIds") List<Long> enrollmentIds);

        /**
         * [DOCENTE - EDICIÓN CONTROLADA]: Recupera todas las notas de una matrícula
         * para aplicar reglas de negocio (trabajos múltiples y examen único).
         */
        @Query("SELECT cg FROM CourseGrade cg WHERE cg.enrollment.enrollmentid = :enrollmentId ORDER BY cg.gradeId ASC")
        List<CourseGrade> findAllByEnrollmentIdOrderByGradeIdAsc(@Param("enrollmentId") Long enrollmentId);

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
