package com.cursosonline.backend.dto;

import java.math.BigDecimal;

/**
 * DTO ligero para exponer al profesor las calificaciones ya registradas
 * de una matrícula concreta sin filtrar el resto del contexto académico.
 *
 * @param gradeId  Identificador interno de la calificación.
 * @param title    Título funcional de la calificación.
 * @param score    Nota numérica persistida.
 * @param comments Aclaración textual del profesor asociada a la nota.
 */
public record TeacherCourseGradeDTO(
                Long gradeId,
                String title,
                BigDecimal score,
                String comments) {
}
