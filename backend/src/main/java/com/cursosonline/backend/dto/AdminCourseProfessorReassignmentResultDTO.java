package com.cursosonline.backend.dto;

/**
 * DTO para representar el resultado de la reasignación de un profesor a un
 * curso en el panel de administración.
 * Contiene información relevante sobre el curso y los profesores involucrados
 * en la reasignación.
 * AdminCourseProfessorReassignmentResultDTO
 * 
 * @param message                   Mensaje sobre el resultado de la
 *                                  reasignación.
 * @param courseId                  ID del curso.
 * @param courseTitle               Título del curso.
 * @param previousProfessorUserId   ID del profesor anterior.
 * @param previousProfessorUsername Nombre de usuario del profesor anterior.
 * @param newProfessorUserId        ID del nuevo profesor.
 * @param newProfessorUsername      Nombre de usuario del nuevo profesor.
 */
public record AdminCourseProfessorReassignmentResultDTO(
                String message,
                Long courseId,
                String courseTitle,
                Long previousProfessorUserId,
                String previousProfessorUsername,
                Long newProfessorUserId,
                String newProfessorUsername) {
}
