package com.cursosonline.backend.entities;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

class CourseGradeJsonSerializationTest {

    @Test
    void shouldPreserveExistingGradesWhenAddingANewOne() {
        Enrollment enrollment = new Enrollment();
        enrollment.setEnrollmentid(42L);

        CourseGrade firstGrade = new CourseGrade();
        firstGrade.setGradeId(1L);
        firstGrade.setTitle("Trabajo final");
        firstGrade.setScore(new BigDecimal("8.50"));

        CourseGrade secondGrade = new CourseGrade();
        secondGrade.setGradeId(2L);
        secondGrade.setTitle("Examen final");
        secondGrade.setScore(new BigDecimal("9.00"));

        enrollment.addGrade(firstGrade);
        enrollment.addGrade(secondGrade);

        assertEquals(2, enrollment.getGrades().size());
        assertSame(enrollment, firstGrade.getEnrollment());
        assertSame(enrollment, secondGrade.getEnrollment());
    }
}
