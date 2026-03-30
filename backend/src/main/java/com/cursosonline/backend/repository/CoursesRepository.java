package com.cursosonline.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.cursosonline.backend.entities.Courses;

/**
 * Repositorio que extiende JpaRepository para la entidad Courses. Proporciona
 * métodos para realizar operaciones CRUD en la base de datos, así como métodos
 * personalizados
 * para buscar cursos por diferentes atributos como título, URL, categoría,
 * idioma, etc.
 */

@Repository
public interface CoursesRepository extends JpaRepository<Courses, Long> {

}
