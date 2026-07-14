package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.CourseGrade;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseGradeRepository extends JpaRepository<CourseGrade, Long> {
    // Hereda automáticamente todos los métodos de guardado (save, etc.) de JPA
}
