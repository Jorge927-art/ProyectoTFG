package com.cursosonline.backend.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("Pruebas unitarias para StudentMetricBreakdownDTO")
class StudentMetricBreakdownDTOTest {

    @Test
    @DisplayName("Debe exponer los valores del record y mantener una representación estable")
    void shouldExposeValuesAndSerializeToString() {
        StudentMetricBreakdownDTO dto = new StudentMetricBreakdownDTO(
                15L,
                "alumno1",
                "alumno1@uni.es",
                7L,
                "Programacion Avanzada",
                90,
                8.7);
        StudentMetricBreakdownDTO sameDto = new StudentMetricBreakdownDTO(
                15L,
                "alumno1",
                "alumno1@uni.es",
                7L,
                "Programacion Avanzada",
                90,
                8.7);

        assertEquals(15L, dto.userId());
        assertEquals("alumno1", dto.username());
        assertEquals("alumno1@uni.es", dto.email());
        assertEquals(7L, dto.courseId());
        assertEquals("Programacion Avanzada", dto.courseTitle());
        assertEquals(90, dto.progressPercentage());
        assertEquals(8.7, dto.averageGrade());
        assertEquals(sameDto, dto);

        String text = dto.toString();
        assertTrue(text.contains("userId=15"));
        assertTrue(text.contains("courseTitle=Programacion Avanzada"));
        assertTrue(text.contains("averageGrade=8.7"));
    }
}