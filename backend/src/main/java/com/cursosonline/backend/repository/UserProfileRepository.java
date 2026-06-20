package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {

    @Modifying // Obligatorio para escrituras directas
    @Query("UPDATE UserProfile up SET up.phoneNumber = :phone, up.homeAddress = :address WHERE up.id = :id")
    void updateProfileFieldsDirectly(@Param("id") Long id, @Param("phone") String phone,
            @Param("address") String address);
}
