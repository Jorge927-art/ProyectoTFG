package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.RecommendationDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.services.RecommendationService;
import com.cursosonline.backend.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
    // INYECCIÓN DEL NUEVO SERVICIO ALGORÍTMICO [ADR-30]
    private final RecommendationService recommendationService;

    /**
     * Endpoint de búsqueda aproximada y predictiva.
     * GET /api/courses/search?keyword=data
     */
    @GetMapping("/search")
    public ResponseEntity<List<Courses>> searchCatalog(
            @RequestParam(name = "keyword", required = false, defaultValue = "") String keyword) {
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

        Enrollment enrollment = userService.enrollStudentInCourse(principal.getName(), courseId);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Te has matriculado en el curso con éxito de forma persistente.",
                "enrollmentId", enrollment.getEnrollmentid(),
                "userId", enrollment.getUser().getUser_id(),
                "courseId", enrollment.getCourse().getCourse_id(),
                "status", enrollment.getStatus()));
    }

    /**
     * Endpoint seguro para alimentar las sugerencias personalizadas de la vista del
     * alumno [ADR-30].
     * GET /api/courses/recommendations
     */
    @GetMapping("/recommendations")
    public ResponseEntity<?> getSmartRecommendations(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        // Resolución de identidad mediante la sesión JWT [ADR-27]
        Users user = userService.findByUsername(principal.getName())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Estudiante no registrado en el sistema."));
        }

        List<RecommendationDTO> recommendations = recommendationService.getRecommendationsForUser(user.getUser_id());
        return ResponseEntity.ok(recommendations);
    }
}
