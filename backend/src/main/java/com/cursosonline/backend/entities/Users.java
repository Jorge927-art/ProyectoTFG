package com.cursosonline.backend.entities;

// CAMBIO: Importación estándar compatible con el motor de serialización de Spring Boot
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.ArrayList;

/**
 * Entidad que representa un usuario en el sistema, que puede ser un estudiante,
 * un profesor o un administrador.
 * Implementa la interfaz UserDetails de Spring Security para la autenticación y
 * autorización.
 * Users
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Users implements UserDetails {

    // Identificador único del usuario, generado automáticamente por la base de
    // datos
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long user_id;

    // Nombre de usuario único, utilizado para la autenticación del usuario
    @Column(nullable = false, unique = true)
    private String username;

    // Contraseña del usuario, que se almacena de forma segura en la base de datos
    @Column(nullable = false)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    // Rol del usuario, que puede ser ADMIN, PROFESSOR o STUDENT, y se utiliza para
    // la autorización de acceso a recursos y funcionalidades del sistema
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // Dirección de correo electrónico del usuario, que puede ser utilizada para
    // notificaciones y recuperación de contraseña
    @Column(name = "email", nullable = true)
    private String email;

    // Relación de uno a uno con la entidad UserProfile, que contiene información
    // adicional sobre el usuario, como su avatar, número de teléfono y dirección
    @Column(nullable = false)
    private Boolean enabled = true;

    @Column(name = "failed_login_attempts", nullable = false)
    private Integer failedLoginAttempts = 0;

    // Relación de uno a uno con la entidad UserProfile, que contiene información
    // adicional sobre el usuario, como su avatar, número de teléfono y dirección
    @JsonIgnore
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Enrollment> enrollments = new ArrayList<>();

    // Mantiene compatibilidad con tests/llamadas existentes (firma histórica de 7
    // args).
    public Users(Long user_id, String username, String password, Role role, String email, Boolean enabled,
            List<Enrollment> enrollments) {
        this.user_id = user_id;
        this.username = username;
        this.password = password;
        this.role = role;
        this.email = email;
        this.enabled = enabled;
        this.enrollments = enrollments;
        this.failedLoginAttempts = 0;
    }

    /**
     * (non-Javadoc)
     *
     * @see org.springframework.security.core.userdetails.UserDetails#isEnabled()
     */
    @Override
    public boolean isEnabled() {
        return this.enabled;
    }

    /**
     * (non-Javadoc)
     * 
     * @see org.springframework.security.core.userdetails.UserDetails#getAuthorities()
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(role.name()));
    }

    /**
     * (non-Javadoc)
     * 
     * @see org.springframework.security.core.userdetails.UserDetails#isAccountNonExpired()
     */
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    /**
     * (non-Javadoc)
     * 
     * @see org.springframework.security.core.userdetails.UserDetails#isAccountNonLocked()
     */
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    /**
     * (non-Javadoc)
     * 
     * @see org.springframework.security.core.userdetails.UserDetails#isCredentialsNonExpired()
     */
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
}
