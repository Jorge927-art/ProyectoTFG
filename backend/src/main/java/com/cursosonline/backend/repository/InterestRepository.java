package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Interest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Repositorio para la entidad Interest.
 * Proporciona los métodos necesarios para la persistencia y consulta de las
 * preferencias de los estudiantes en PostgreSQL.
 */
public interface InterestRepository extends JpaRepository<Interest, Long> {

    /**
     * Busca los intereses de un estudiante utilizando su nombre de usuario.
     * Esta consulta realiza un Join implícito con la tabla de usuarios, lo cual
     * es idóneo para recuperar las preferencias del alumno autenticado a partir
     * de su Token JWT.
     * 
     * @param username El nombre de usuario del estudiante (sub del token JWT)
     * @return Un Optional que contiene los intereses si el estudiante ya los
     *         configuró
     */
    Optional<Interest> findByUser_Username(String username);
}
