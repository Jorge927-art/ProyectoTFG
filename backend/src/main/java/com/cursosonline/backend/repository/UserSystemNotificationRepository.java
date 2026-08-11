package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.UserSystemNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Repositorio para la entidad UserSystemNotification, proporcionando métodos de
 * CRUD y consultas personalizadas relacionadas con las notificaciones del
 * sistema
 * UserSystemNotificationRepository
 */
public interface UserSystemNotificationRepository extends JpaRepository<UserSystemNotification, Long> {

    /**
     * Recupera todas las notificaciones no leídas para un usuario específico,
     * ordenadas por fecha de creación descendente.
     * Esto es útil para mostrar al usuario las notificaciones más recientes que aún
     * no ha leído.
     * 
     * @param username El nombre de usuario del receptor de las notificaciones.
     * @return Una lista de notificaciones no leídas para el usuario especificado.
     */
    @Query("SELECT n FROM UserSystemNotification n WHERE n.receiver.username = :username AND n.read = false ORDER BY n.createdAt DESC")
    List<UserSystemNotification> findUnreadByUsername(@Param("username") String username);

    /**
     * Marca todas las notificaciones como leídas para un usuario específico.
     * Esto es útil para permitir que un usuario marque todas sus notificaciones
     * como leídas de una sola vez.
     * 
     * @param username El nombre de usuario del receptor de las notificaciones.
     * @return El número de notificaciones marcadas como leídas para el usuario
     *         especificado.
     */
    @Modifying
    @Query("UPDATE UserSystemNotification n SET n.read = true WHERE n.receiver.username = :username AND n.read = false")
    int markAllAsReadByUsername(@Param("username") String username);

    /**
     * Marca como leídas las notificaciones no leídas de un tipo concreto para un
     * usuario específico.
     *
     * @param username El nombre de usuario del receptor.
     * @param type     El tipo de notificación a marcar como leída.
     * @return Número de notificaciones actualizadas.
     */
    @Modifying
    @Query("UPDATE UserSystemNotification n SET n.read = true WHERE n.receiver.username = :username AND n.type = :type AND n.read = false")
    int markAllAsReadByUsernameAndType(@Param("username") String username, @Param("type") String type);

    /**
     * Elimina todas las notificaciones para un usuario específico.
     * Esto es útil para permitir que un usuario elimine todas sus notificaciones de
     * una sola vez.
     * 
     * @param userId El ID del receptor de las notificaciones.
     * @return El número de notificaciones eliminadas para el usuario especificado.
     */
    @Modifying
    @Query("DELETE FROM UserSystemNotification n WHERE n.receiver.user_id = :userId")
    int deleteAllByReceiverUserId(@Param("userId") Long userId);
}
