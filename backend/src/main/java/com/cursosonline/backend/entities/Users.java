package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data // Genera getters, setters, toString, etc. automáticamente
@NoArgsConstructor // Constructor vacío para JPA
@AllArgsConstructor // Constructor con todos los campos

/**
 * Entidad que representa a los usuarios de la plataforma.
 * Contiene campos para el ID, nombre de usuario, contraseña, rol y correo
 * electrónico.
 */
public class Users {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long user_id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role; // Enum para: ADMIN, PROFESSOR, STUDENT

    @Column(name = "email", nullable = true)
    private String email;

}
