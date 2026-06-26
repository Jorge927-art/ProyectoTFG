package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    // Verifica si ya existe la matrícula exacta de un usuario en un curso
    @Query("SELECT e FROM Enrollment e WHERE e.user.user_id = :userId AND e.course.course_id = :courseId")
    Optional<Enrollment> findByUserIdAndCourseId(@Param("userId") Long userId, @Param("courseId") Long courseId);
}
