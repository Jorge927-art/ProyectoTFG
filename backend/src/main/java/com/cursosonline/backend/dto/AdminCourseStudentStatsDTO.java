package com.cursosonline.backend.dto;

import java.math.BigDecimal;

public record AdminCourseStudentStatsDTO(
        Long userId,
        String username,
        int progressPercentage,
        BigDecimal averageGrade,
        BigDecimal averageWorkGrade,
        BigDecimal averageFinalExamGrade,
        boolean passed) {
}
