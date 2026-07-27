package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.AdminCourseDetailDTO;
import com.cursosonline.backend.dto.AdminCourseSearchResultDTO;
import com.cursosonline.backend.dto.AdminCourseUserStatsDTO;
import com.cursosonline.backend.services.AdminCourseInsightService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador del "Panel Estadístico de Cursos" en /admin [nueva
 * funcionalidad]. Búsqueda de curso -> detalle (profesor + alumnos) ->
 * estadísticas al seleccionar uno de esos usuarios.
 */
@RestController
@RequestMapping("/api/admin/courses")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminCourseInsightController {

    private final AdminCourseInsightService adminCourseInsightService;

    @GetMapping("/search")
    public ResponseEntity<List<AdminCourseSearchResultDTO>> searchCourses(@RequestParam String keyword) {
        return ResponseEntity.ok(adminCourseInsightService.searchCourses(keyword));
    }

    @GetMapping("/{courseId}")
    public ResponseEntity<AdminCourseDetailDTO> getCourseDetail(@PathVariable Long courseId) {
        return ResponseEntity.ok(adminCourseInsightService.getCourseDetail(courseId));
    }

    @GetMapping("/{courseId}/users/{userId}/stats")
    public ResponseEntity<AdminCourseUserStatsDTO> getUserStats(@PathVariable Long courseId,
            @PathVariable Long userId) {
        return ResponseEntity.ok(adminCourseInsightService.getUserStatsInCourse(courseId, userId));
    }
}