package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.AdminGlobalStatisticsDTO;
import com.cursosonline.backend.services.AdminGlobalStatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import com.cursosonline.backend.dto.AdminProfessorRatingDTO;

import java.util.Map;
import java.util.List;

/**
 * Controlador REST del panel estadístico global de administración.
 */
@RestController
@RequestMapping("/api/admin/statistics")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminGlobalStatisticsController {

    private final AdminGlobalStatisticsService adminGlobalStatisticsService;

    /**
     * Obtiene las estadísticas globales de la plataforma.
     * 
     * @return
     */
    @GetMapping("/global")
    public ResponseEntity<AdminGlobalStatisticsDTO> getGlobalStatistics() {
        return ResponseEntity.ok(adminGlobalStatisticsService.getGlobalStatistics());
    }

    @GetMapping("/professors/search")
    public ResponseEntity<List<AdminProfessorRatingDTO>> searchProfessorRatings(
            @RequestParam(name = "keyword", defaultValue = "") String keyword) {
        return ResponseEntity.ok(adminGlobalStatisticsService.searchProfessorRatings(keyword));
    }

    /**
     * Finaliza el histórico anual de estadísticas y genera un snapshot consolidado.
     * 
     * @return
     */
    @PostMapping("/global/finalize-previous-year")
    public ResponseEntity<Map<String, Object>> finalizePreviousYearSnapshot() {
        int finalizedYear = adminGlobalStatisticsService.finalizePreviousYearSnapshotNow();
        return ResponseEntity.ok(Map.of(
                "message", "Histórico anual consolidado correctamente.",
                "finalizedYear", finalizedYear));
    }
}
