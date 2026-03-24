package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/**
 * Repositorio que extiende JpaRepository para la entidad Users. Proporciona
 * métodos
 * para realizar operaciones CRUD en la base de datos, así como un método
 * personalizado
 */
@Repository
public interface UserRepository extends JpaRepository<Users, Long> {

    // Método para buscar por nombre de usuario
    Optional<Users> findByUsername(String username);

    // Añadir métodos para filtrar por rol (ADMIN, PROFESSOR, STUDENT)
}
