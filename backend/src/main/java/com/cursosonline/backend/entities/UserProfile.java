package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserProfile {

    @Id
    @Column(name = "user_id")
    private Long id;

    @OneToOne
    @PrimaryKeyJoinColumn // <-- LE DICE A HIBERNATE QUE LA CLAVE FORÁNEA ES LA MISMA CLAVE PRIMARIA
    private Users user;

    @Column(name = "avatar_path", nullable = true, length = 512)
    private String avatarPath;

    @Column(name = "phone_number", nullable = true, length = 20)
    private String phoneNumber;

    @Column(name = "home_address", nullable = true, length = 255)
    private String homeAddress;
}
