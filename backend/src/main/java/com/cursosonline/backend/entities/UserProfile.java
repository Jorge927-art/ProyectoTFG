package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entidad que representa el perfil de usuario, que contiene información
 * adicional sobre el usuario, como su avatar, número de teléfono y dirección
 * UserProfile
 */
@Entity
@Table(name = "user_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserProfile {

    // Identificador único del perfil de usuario, que coincide con el ID del usuario
    @Id
    @Column(name = "user_id")
    private Long id;

    // Relación de uno a uno con la entidad Users, compartiendo la misma clave
    // primaria
    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private Users user;

    // Ruta del archivo de avatar del usuario, que puede ser utilizada para mostrar
    // su imagen de perfil en la interfaz de usuario
    @Column(name = "avatar_path", nullable = true, length = 512)
    private String avatarPath;

    // Número de teléfono del usuario, que puede ser utilizado para contacto o
    // autenticación de dos factores
    @Column(name = "phone_number", nullable = true, length = 20)
    private String phoneNumber;

    // Dirección de residencia del usuario, que puede ser utilizada para envío de
    // correspondencia o verificación de identidad
    @Column(name = "home_address", nullable = true, length = 255)
    private String homeAddress;
}
