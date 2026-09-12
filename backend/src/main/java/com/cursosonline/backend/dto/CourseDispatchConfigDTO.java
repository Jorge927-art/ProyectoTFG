package com.cursosonline.backend.dto;

import java.math.BigDecimal;
import java.util.List;

public record CourseDispatchConfigDTO(
        Long courseId,
        int dispatchParts,
        BigDecimal examThreshold,
        List<BigDecimal> intermediateCheckpoints) {
}
