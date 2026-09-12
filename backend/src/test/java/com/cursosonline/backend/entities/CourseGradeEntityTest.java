package com.cursosonline.backend.entities;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

class CourseGradeEntityTest {

    @Test
    void allArgsConstructorPreservesGradeContractAndEnrollmentReference() {
        Enrollment enrollment = new Enrollment();
        CourseGrade grade = new CourseGrade(
                7L,
                "Examen final",
                new BigDecimal("8.75"),
                "Buen trabajo",
                enrollment);

        assertEquals(7L, grade.getGradeId());
        assertEquals("Examen final", grade.getTitle());
        assertEquals(new BigDecimal("8.75"), grade.getScore());
        assertEquals("Buen trabajo", grade.getComments());
        assertSame(enrollment, grade.getEnrollment());
    }
}