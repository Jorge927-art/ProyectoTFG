package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.CourseDispatchConfigDTO;
import com.cursosonline.backend.dto.ProfessorCourseAlertDTO;
import com.cursosonline.backend.dto.UpdateProfessorAlertStatusRequestDTO;
import com.cursosonline.backend.entities.ProfessorAlertStatus;
import com.cursosonline.backend.services.ProfessorCourseAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/professor/alerts")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PROFESSOR')")
public class ProfessorCourseAlertController {

    private final ProfessorCourseAlertService professorCourseAlertService;

    @GetMapping
    public ResponseEntity<?> getProfessorAlerts(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        List<ProfessorCourseAlertDTO> alerts = professorCourseAlertService.getProfessorAlerts(principal.getName());
        return ResponseEntity.ok(alerts);
    }

    @PatchMapping("/{alertId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long alertId,
            @RequestBody UpdateProfessorAlertStatusRequestDTO request,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        ProfessorAlertStatus status = request != null ? request.status() : null;
        ProfessorCourseAlertDTO updated = professorCourseAlertService
                .updateAlertStatus(principal.getName(), alertId, status);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{alertId}/dismiss-bell")
    public ResponseEntity<?> dismissBellAlert(@PathVariable Long alertId, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        professorCourseAlertService.dismissBellAlert(principal.getName(), alertId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/course/{courseId}/config")
    public ResponseEntity<?> getCourseConfig(@PathVariable Long courseId, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        CourseDispatchConfigDTO config = professorCourseAlertService.findConfigByCourse(courseId).orElse(null);
        if (config == null) {
            return ResponseEntity.ok(Map.of(
                    "configured", false,
                    "courseId", courseId));
        }

        return ResponseEntity.ok(Map.of(
                "configured", true,
                "config", config));
    }
}
