package com.cursosonline.backend.dto;

import com.cursosonline.backend.entities.ProfessorAlertStatus;
import com.cursosonline.backend.entities.ProfessorAlertType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProfessorCourseAlertDTO(
        Long alertId,
        ProfessorAlertType alertType,
        ProfessorAlertStatus status,
        int checkpointIndex,
        BigDecimal checkpointPercent,
        Long courseId,
        String courseTitle,
        Long studentUserId,
        String studentUsername,
        String title,
        String message,
        LocalDateTime createdAt,
        boolean bellDismissed) {
}
