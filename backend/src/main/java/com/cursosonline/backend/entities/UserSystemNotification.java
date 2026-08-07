package com.cursosonline.backend.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Entidad que representa una notificación del sistema para un usuario
 * específico.
 * Contiene información sobre el tipo de notificación, el título, el mensaje,
 * UserSystemNotification
 */
@Entity
@Table(name = "user_system_notifications")
@Getter
@Setter
@NoArgsConstructor
public class UserSystemNotification {

    // Identificador único de la notificación, generado automáticamente por la base
    // de datos
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long notificationId;

    // Relación de muchos a uno con la entidad Users, que representa al usuario que
    // recibe la notificación
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receiver_user_id", nullable = false)
    private Users receiver;

    // Tipo de notificación, que puede ser "INFO", "WARNING" o "ERROR"
    @Column(nullable = false, length = 64)
    private String type;

    // Título de la notificación, que puede ser utilizado para mostrar un resumen de
    // la misma
    @Column(nullable = false, length = 160)
    private String title;

    // Mensaje de la notificación, que puede contener información detallada sobre la
    // misma
    @Column(nullable = false, length = 600)
    private String message;

    // URL a la que se redirige cuando el usuario hace clic en la notificación
    @Column(nullable = false, length = 200)
    private String redirectUrl;

    // Indica si la notificación ha sido leída por el usuario
    @Column(name = "is_read", nullable = false)
    private boolean read;

    // Fecha y hora en que se creó la notificación, utilizada para auditoría y
    // seguimiento
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * Método que se ejecuta antes de persistir la entidad en la base de datos.
     * Si la fecha de creación no está establecida, se asigna la fecha y hora
     * actual.
     */
    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
