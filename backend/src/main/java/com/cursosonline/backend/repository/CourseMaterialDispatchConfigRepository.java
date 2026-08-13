package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.CourseMaterialDispatchConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CourseMaterialDispatchConfigRepository extends JpaRepository<CourseMaterialDispatchConfig, Long> {

    @Query("SELECT c FROM CourseMaterialDispatchConfig c WHERE c.course.course_id = :courseId")
    Optional<CourseMaterialDispatchConfig> findByCourseId(@Param("courseId") Long courseId);

    @Query("SELECT COUNT(c) > 0 FROM CourseMaterialDispatchConfig c WHERE c.course.course_id = :courseId")
    boolean existsByCourseId(@Param("courseId") Long courseId);

    List<CourseMaterialDispatchConfig> findAllByCourse_AssignedUser_IsNotNull();
}
