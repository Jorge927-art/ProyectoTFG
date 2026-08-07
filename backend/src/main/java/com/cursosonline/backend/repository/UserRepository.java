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

        /**
         * Recupera un usuario por su nombre de usuario único, utilizado para la
         * autenticación y autorización en el sistema.
         * 
         * @param username El nombre de usuario del usuario a recuperar.
         * @return Un Optional que contiene el usuario si se encuentra, o vacío si no.
         */
        Optional<Users> findByUsername(String username);

        /**
         * Recupera un usuario por su nombre de usuario, ignorando mayúsculas y
         * minúsculas.
         * Esto es útil para la autenticación, donde el nombre de usuario no debe ser
         * sensible a mayúsculas.
         * 
         * @param username El nombre de usuario del usuario a recuperar, ignorando
         *                 mayúsculas y minúsculas.
         * @return Un Optional que contiene el usuario si se encuentra, o vacío si no.
         */
        Optional<Users> findByUsernameIgnoreCase(String username);

        /**
         * Recupera un usuario por su correo electrónico, ignorando mayúsculas y
         * minúsculas.
         * Esto es útil para la autenticación y recuperación de cuentas, donde el correo
         * electrónico no debe ser sensible a mayúsculas.
         * 
         * @param email El correo electrónico del usuario a recuperar, ignorando
         *              mayúsculas y minúsculas.
         * @return Un Optional que contiene el usuario si se encuentra, o vacío si no.
         */
        Optional<Users> findByEmailIgnoreCase(String email);

        /**
         * Recupera todos los usuarios que tienen un rol específico.
         * Esto es útil para filtrar usuarios por su rol en el sistema, como
         * estudiantes, profesores o administradores.
         * 
         * @param role El rol de los usuarios a recuperar.
         * @return Una lista de usuarios que tienen el rol especificado.
         */
        List<Users> findByRole(Role role);

        /**
         * Cuenta el número de usuarios que tienen un rol específico y están
         * habilitados.
         * Esto es útil para obtener estadísticas sobre la cantidad de usuarios activos
         * con un rol específico.
         * 
         * @param role El rol de los usuarios a contar.
         * @return El número de usuarios que tienen el rol especificado y están
         *         habilitados.
         */
        long countByRoleAndEnabledTrue(Role role);

        /**
         * Verifica si existe un usuario con el nombre de usuario especificado,
         * ignorando mayúsculas y minúsculas.
         * Esto es útil para validar la unicidad de los nombres de usuario antes de su
         * creación o actualización.
         * 
         * @param username El nombre de usuario a verificar.
         * @return true si existe un usuario con el nombre de usuario especificado,
         *         false en caso contrario.
         */
        @Query("SELECT DISTINCT e2.user FROM Enrollment e1 JOIN Enrollment e2 ON e1.course.course_id = e2.course.course_id "
                        +
                        "WHERE e1.user.username = :username AND e2.user.username <> :username AND e2.user.role = 'STUDENT'")
        List<Users> findClassmatesByUsername(@Param("username") String username);

        /**
         * Recupera todos los usuarios que tienen un rol específico y están habilitados.
         * Esto es útil para filtrar usuarios activos por su rol en el sistema.
         * 
         * @param courseId El ID del curso para el cual se desean recuperar los
         *                 estudiantes activos.
         * @return Una lista de usuarios que tienen el rol de estudiante y están
         *         habilitados en el curso especificado.
         */
        @Query("SELECT e.user FROM Enrollment e WHERE e.course.course_id = :courseId " +
                        "AND e.user.enabled = true AND e.user.role = 'STUDENT'")
        List<Users> findActiveStudentsByCourseId(@Param("courseId") Long courseId);

}
