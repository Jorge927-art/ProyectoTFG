package com.cursosonline.backend.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("Pruebas unitarias para TeachingMetricsSummaryDTO")
class TeachingMetricsSummaryDTOTest {

    @Test
    @DisplayName("Debe exponer los valores del record y mantener una representación estable")
    void shouldExposeValuesAndSerializeToString() {
        TeachingMetricsSummaryDTO dto = new TeachingMetricsSummaryDTO(12L, 81.5, 33.3, 8.9);
        TeachingMetricsSummaryDTO sameDto = new TeachingMetricsSummaryDTO(12L, 81.5, 33.3, 8.9);

        assertEquals(12L, dto.courseId());
        assertEquals(81.5, dto.collectiveProgress());
        assertEquals(33.3, dto.completionRate());
        assertEquals(8.9, dto.averageGrade());
        assertEquals(sameDto, dto);

        String text = dto.toString();
        assertTrue(text.contains("courseId=12"));
        assertTrue(text.contains("collectiveProgress=81.5"));
        assertTrue(text.contains("averageGrade=8.9"));
    }
}