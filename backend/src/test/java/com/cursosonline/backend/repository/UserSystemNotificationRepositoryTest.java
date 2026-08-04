package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.UserSystemNotification;
import com.cursosonline.backend.entities.Users;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test-ci")
@Transactional
@DisplayName("Suite de Persistencia para UserSystemNotificationRepository")
class UserSystemNotificationRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserSystemNotificationRepository userSystemNotificationRepository;

    private Users saveUser(String username) {
        Users user = new Users();
        user.setUsername(username);
        user.setPassword("secret");
        user.setRole(Role.PROFESSOR);
        user.setEmail(username + "@uni.es");
        user.setEnabled(true);
        return userRepository.saveAndFlush(user);
    }

    private UserSystemNotification saveNotification(Users receiver, String message, boolean isRead,
            LocalDateTime createdAt) {
        UserSystemNotification notification = new UserSystemNotification();
        notification.setReceiver(receiver);
        notification.setType("COURSE_ASSIGNMENT_CHANGE");
        notification.setTitle("Cambio de titularidad");
        notification.setMessage(message);
        notification.setRedirectUrl("/professor");
        notification.setRead(isRead);
        notification.setCreatedAt(createdAt);
        return userSystemNotificationRepository.saveAndFlush(notification);
    }

    @Test
    @DisplayName("findUnreadByUsername debe devolver solo pendientes y en orden descendente de fecha")
    void findUnreadByUsername_ShouldReturnOnlyUnreadOrdered() {
        Users receiver = saveUser("profesor_uno");

        saveNotification(receiver, "mensaje viejo", false, LocalDateTime.now().minusHours(2));
        saveNotification(receiver, "mensaje leido", true, LocalDateTime.now().minusHours(1));
        saveNotification(receiver, "mensaje nuevo", false, LocalDateTime.now());

        List<UserSystemNotification> unread = userSystemNotificationRepository.findUnreadByUsername("profesor_uno");

        assertEquals(2, unread.size());
        assertEquals("mensaje nuevo", unread.get(0).getMessage());
        assertEquals("mensaje viejo", unread.get(1).getMessage());
        assertFalse(unread.get(0).isRead());
        assertFalse(unread.get(1).isRead());
    }

    @Test
    @DisplayName("markAllAsReadByUsername debe marcar solo notificaciones no leídas del usuario")
    void markAllAsReadByUsername_ShouldMarkUnread() {
        Users receiver = saveUser("profesor_dos");

        saveNotification(receiver, "a", false, LocalDateTime.now().minusMinutes(2));
        saveNotification(receiver, "b", false, LocalDateTime.now().minusMinutes(1));
        saveNotification(receiver, "c", true, LocalDateTime.now());

        int updated = userSystemNotificationRepository.markAllAsReadByUsername("profesor_dos");

        assertEquals(2, updated);
        List<UserSystemNotification> pending = userSystemNotificationRepository.findUnreadByUsername("profesor_dos");
        assertTrue(pending.isEmpty());
    }

    @Test
    @DisplayName("deleteAllByReceiverUserId debe eliminar solo notificaciones del receptor indicado")
    void deleteAllByReceiverUserId_ShouldDeleteOnlyReceiverNotifications() {
        Users receiverA = saveUser("profesor_tres");
        Users receiverB = saveUser("profesor_cuatro");

        saveNotification(receiverA, "a1", false, LocalDateTime.now().minusMinutes(2));
        saveNotification(receiverA, "a2", false, LocalDateTime.now().minusMinutes(1));
        saveNotification(receiverB, "b1", false, LocalDateTime.now());

        int deleted = userSystemNotificationRepository.deleteAllByReceiverUserId(receiverA.getUser_id());

        assertEquals(2, deleted);
        assertTrue(userSystemNotificationRepository.findUnreadByUsername("profesor_tres").isEmpty());
        assertEquals(1, userSystemNotificationRepository.findUnreadByUsername("profesor_cuatro").size());
    }

    @Test
    @DisplayName("UserSystemNotification debe autogenerar createdAt al persistir cuando llega nulo")
    void userSystemNotification_PrePersist_ShouldSetCreatedAt() {
        Users receiver = saveUser("profesor_cinco");

        UserSystemNotification notification = new UserSystemNotification();
        notification.setReceiver(receiver);
        notification.setType("COURSE_ASSIGNMENT_CHANGE");
        notification.setTitle("Cambio de titularidad");
        notification.setMessage("mensaje automatico");
        notification.setRedirectUrl("/professor");
        notification.setRead(false);

        UserSystemNotification saved = userSystemNotificationRepository.saveAndFlush(notification);

        assertTrue(saved.getCreatedAt() != null);
    }
}
