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
    @MapsId // <-- DICE A HIBERNATE QUE USE LA CLAVE PRIMARIA DE LA ENTIDAD 'USERS' COMO
            // CLAVE PRIMARIA DE ESTA TABLA
    @JoinColumn(name = "user_id") // <-- MAPEA FÍSICAMENTE LA COLUMNA DE UNIÓN EN POSTGRESQL
    private Users user;

    @Column(name = "avatar_path", nullable = true, length = 512)
    private String avatarPath;

    @Column(name = "phone_number", nullable = true, length = 20)
    private String phoneNumber;

    @Column(name = "home_address", nullable = true, length = 255)
    private String homeAddress;
}
