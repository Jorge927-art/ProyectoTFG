package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.entities.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

/**
 * Repositorio que extiende JpaRepository para la entidad Users. Proporciona
 * métodos para realizar operaciones CRUD en la base de datos.
 */
public interface UserRepository extends JpaRepository<Users, Long> {

    // Método para buscar por nombre de usuario
    Optional<Users> findByUsername(String username);

    /**
     * Recupera todos los usuarios que ostentan un rol específico.
     * Útil para aislar las cuentas de administración (Role.ADMIN) del sistema.
     */
    List<Users> findByRole(Role role);

    /**
     * [FILTRADO COMPAÑEROS DE CLASE]: Obtiene los estudiantes matriculados en los
     * mismos cursos
     * que el alumno autenticado, excluyendo al propio alumno emisor para evitar el
     * auto-envío.
     */
    @Query("SELECT DISTINCT e2.user FROM Enrollment e1 JOIN Enrollment e2 ON e1.course.course_id = e2.course.course_id "
            +
            "WHERE e1.user.username = :username AND e2.user.username <> :username AND e2.user.role = 'STUDENT'")
    List<Users> findClassmatesByUsername(@Param("username") String username);

    /**
     * [CONSOLA DOCENTE]: Recupera los estudiantes matriculados en un curso
     * específico,
     * aplicando un filtro perimetral que excluye de forma estricta a los usuarios
     * desactivados (enabled = false) por el Administrador.
     */
    @Query("SELECT e.user FROM Enrollment e WHERE e.course.course_id = :courseId " +
            "AND e.user.enabled = true AND e.user.role = 'STUDENT'")
    List<Users> findActiveStudentsByCourseId(@Param("courseId") Long courseId);

}
