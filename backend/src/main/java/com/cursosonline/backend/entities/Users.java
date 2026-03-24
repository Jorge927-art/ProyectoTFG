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
