package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Repositorio para la entidad UserProfile, proporcionando métodos de
 * CRUD y consultas personalizadas relacionadas con los perfiles de usuario.
 * UserProfileRepository
 */
public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {

    /**
     * Actualiza directamente los campos de perfil de un usuario en la base de
     * datos.
     * Esto es útil para realizar actualizaciones rápidas sin necesidad de cargar
     * toda la entidad.
     * 
     * @param id      El ID del perfil de usuario a actualizar.
     * @param phone   El nuevo número de teléfono.
     * @param address La nueva dirección.
     */
    @Modifying // Obligatorio para escrituras directas
    @Query("UPDATE UserProfile up SET up.phoneNumber = :phone, up.homeAddress = :address WHERE up.id = :id")
    void updateProfileFieldsDirectly(@Param("id") Long id, @Param("phone") String phone,
            @Param("address") String address);
}
