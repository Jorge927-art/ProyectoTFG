package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<Users, Long> {

    // Método para buscar por nombre de usuario (útil para el login)
    Optional<Users> findByUsername(String username);

    // Método para buscar por email
    Optional<Users> findByEmail(String email);

    // Podrías añadir métodos para filtrar por rol (ADMIN, PROFESSOR, STUDENT)
}
