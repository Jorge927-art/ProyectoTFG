package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.UserSystemNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserSystemNotificationRepository extends JpaRepository<UserSystemNotification, Long> {

    @Query("SELECT n FROM UserSystemNotification n WHERE n.receiver.username = :username AND n.read = false ORDER BY n.createdAt DESC")
    List<UserSystemNotification> findUnreadByUsername(@Param("username") String username);

    @Modifying
    @Query("UPDATE UserSystemNotification n SET n.read = true WHERE n.receiver.username = :username AND n.read = false")
    int markAllAsReadByUsername(@Param("username") String username);

    @Modifying
    @Query("DELETE FROM UserSystemNotification n WHERE n.receiver.user_id = :userId")
    int deleteAllByReceiverUserId(@Param("userId") Long userId);
}
