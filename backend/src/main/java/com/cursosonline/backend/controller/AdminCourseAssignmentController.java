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

@RestController
@RequestMapping("/api/admin/course-assignments")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminCourseAssignmentController {

    private final AdminCourseAssignmentService adminCourseAssignmentService;

    @GetMapping("/professors")
    public ResponseEntity<List<AdminProfessorOptionDTO>> getProfessors() {
        return ResponseEntity.ok(adminCourseAssignmentService.getEnabledProfessorsAlphabetical());
    }

    @GetMapping("/professors/{professorId}/courses")
    public ResponseEntity<List<AdminProfessorCourseDTO>> getCoursesByProfessor(@PathVariable Long professorId) {
        return ResponseEntity.ok(adminCourseAssignmentService.getCoursesAssignedToProfessor(professorId));
    }

    @PatchMapping("/courses/{courseId}/reassign-professor")
    public ResponseEntity<AdminCourseProfessorReassignmentResultDTO> reassignProfessor(
            @PathVariable Long courseId,
            @RequestBody AdminProfessorReassignmentRequestDTO request) {
        return ResponseEntity.ok(
                adminCourseAssignmentService.reassignCourseProfessor(courseId, request.professorId()));
    }
}
