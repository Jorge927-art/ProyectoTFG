package com.cursosonline.backend.dto;

public record DismissSingleNotificationRequestDTO(
        Long notificationId,
        String type) {
}
