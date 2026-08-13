package com.cursosonline.backend.dto;

public record ProfessorBellAlertSummaryDTO(
        Long alertId,
        String title,
        String message,
        long remainingCountAfterThis) {
}
