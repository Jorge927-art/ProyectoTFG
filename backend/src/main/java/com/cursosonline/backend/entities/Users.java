package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
@Data // Genera getters, setters, toString, etc. automáticamente
@NoArgsConstructor // Constructor vacío para JPA
@AllArgsConstructor // Constructor con todos los campos
/**
 * Entidad que representa a los usuarios de la plataforma, adaptada
 * estructuralmente
 * para implementar UserDetails de Spring Security y unificar persistencia y
 * seguridad.
 */
public class Users implements UserDetails {
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

    // --- MÉTODOS OBLIGATORIOS DE LA INTERFAZ USERDETAILS PARA SPRING SECURITY ---

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Transformamos el ENUM del rol en un Authority que Spring Security entienda
        return List.of(new SimpleGrantedAuthority(role.name()));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true; // La cuenta no expira por defecto
    }

    @Override
    public boolean isAccountNonLocked() {
        return true; // La cuenta no se bloquea por defecto
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true; // Las credenciales no expiran por defecto
    }

    @Override
    public boolean isEnabled() {
        return true; // El usuario está activo por defecto
    }
}
