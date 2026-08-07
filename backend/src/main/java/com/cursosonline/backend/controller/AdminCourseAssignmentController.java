package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.AdminCourseProfessorReassignmentResultDTO;
import com.cursosonline.backend.dto.AdminProfessorCourseDTO;
import com.cursosonline.backend.dto.AdminProfessorOptionDTO;
import com.cursosonline.backend.dto.AdminProfessorReassignmentRequestDTO;
import com.cursosonline.backend.services.AdminCourseAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador para la asignación de cursos a profesores por parte del
 * administrador.
 * AdminCourseAssignmentController
 */
@RestController
@RequestMapping("/api/admin/course-assignments")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminCourseAssignmentController {

    private final AdminCourseAssignmentService adminCourseAssignmentService;

    /**
     * Endpoint para obtener la lista de profesores habilitados en orden alfabético.
     * 
     * @return
     */
    @GetMapping("/professors")
    public ResponseEntity<List<AdminProfessorOptionDTO>> getProfessors() {
        return ResponseEntity.ok(adminCourseAssignmentService.getEnabledProfessorsAlphabetical());
    }

    /**
     * Endpoint para obtener la lista de cursos asignados a un profesor específico.
     * 
     * @param professorId
     * @return
     */
    @GetMapping("/professors/{professorId}/courses")
    public ResponseEntity<List<AdminProfessorCourseDTO>> getCoursesByProfessor(@PathVariable Long professorId) {
        return ResponseEntity.ok(adminCourseAssignmentService.getCoursesAssignedToProfessor(professorId));
    }

    /**
     * Endpoint para reasignar un curso a un nuevo profesor. Recibe el ID del curso
     * y el ID del nuevo profesor en el cuerpo de la solicitud.
     * Devuelve un objeto con información sobre la reasignación.
     * 
     * @param courseId
     * @param request
     * @return
     */
    @PatchMapping("/courses/{courseId}/reassign-professor")
    public ResponseEntity<AdminCourseProfessorReassignmentResultDTO> reassignProfessor(
            @PathVariable Long courseId,
            @RequestBody AdminProfessorReassignmentRequestDTO request) {
        return ResponseEntity.ok(
                adminCourseAssignmentService.reassignCourseProfessor(courseId, request.professorId()));
    }
}
