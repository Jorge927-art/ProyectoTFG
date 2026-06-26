package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class CourseController {

    private final UserService userService;

    /**
     * Endpoint de búsqueda aproximada y predictiva.
     * GET /api/courses/search?keyword=data
     */
    @GetMapping("/search")
    public ResponseEntity<List<Courses>> searchCatalog(
            @RequestParam(required = false, defaultValue = "") String keyword) {
        return ResponseEntity.ok(userService.searchCourses(keyword));
    }

    /**
     * Endpoint transaccional seguro para procesar la matrícula de un estudiante.
     * POST /api/courses/enroll/1
     */
    @PostMapping("/enroll/{courseId}")
    public ResponseEntity<?> enrollInCourse(@PathVariable Long courseId, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        userService.enrollStudentInCourse(principal.getName(), courseId);

        return ResponseEntity.ok(Map.of(
                "message", "Te has matriculado en el curso con éxito de forma persistente."));
    }
}
