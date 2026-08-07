package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.AdminCourseDetailDTO;
import com.cursosonline.backend.dto.AdminCourseCollectiveStatsDTO;
import com.cursosonline.backend.dto.AdminCourseCatalogItemDTO;
import com.cursosonline.backend.dto.AdminCourseCreateRequestDTO;
import com.cursosonline.backend.dto.AdminCourseSearchResultDTO;
import com.cursosonline.backend.dto.AdminCourseUserStatsDTO;
import com.cursosonline.backend.services.AdminCourseCatalogService;
import com.cursosonline.backend.services.AdminCourseInsightService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST para gestionar las operaciones relacionadas con el "Panel
 * Estadístico de Cursos" en el panel de administración. Proporciona endpoints
 * AdminCourseInsightController
 */
@RestController
@RequestMapping("/api/admin/courses")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminCourseInsightController {

    private final AdminCourseInsightService adminCourseInsightService;
    private final AdminCourseCatalogService adminCourseCatalogService;

    /**
     * Endpoint para obtener el catálogo de cursos en el panel de administración.
     * Devuelve una lista de cursos con información básica.
     * 
     * @return
     */
    @GetMapping("/catalog")
    public ResponseEntity<List<AdminCourseCatalogItemDTO>> getCourseCatalog() {
        return ResponseEntity.ok(adminCourseCatalogService.getAdminCourseCatalog());
    }

    /**
     * Endpoint para crear un nuevo curso en el panel de administración. Recibe los
     * detalles del curso en el cuerpo de la solicitud y devuelve la información del
     * curso creado.
     * 
     * @param request
     * @return
     */
    @PostMapping
    public ResponseEntity<AdminCourseCatalogItemDTO> createCourse(@RequestBody AdminCourseCreateRequestDTO request) {
        return ResponseEntity.ok(adminCourseCatalogService.createCourse(request));
    }

    /**
     * Endpoint para actualizar parcialmente los detalles de un curso en el panel de
     * administración. Recibe un mapa de cambios en el cuerpo de la solicitud y
     * devuelve la información actualizada del curso.
     * 
     * @param courseId
     * @param changes
     * @return
     */
    @PatchMapping("/{courseId}")
    public ResponseEntity<AdminCourseCatalogItemDTO> patchCourse(@PathVariable Long courseId,
            @RequestBody Map<String, Object> changes) {
        return ResponseEntity.ok(adminCourseCatalogService.patchCourse(courseId, changes));
    }

    /**
     * Endpoint para eliminar un curso del panel de administración. Recibe el ID del
     * curso como parámetro de ruta y devuelve un mensaje de confirmación.
     * 
     * @param courseId
     * @return
     */
    @DeleteMapping("/{courseId}")
    public ResponseEntity<Map<String, String>> deleteCourse(@PathVariable Long courseId) {
        adminCourseCatalogService.deleteCourse(courseId);
        return ResponseEntity.ok(Map.of("message", "Curso eliminado correctamente."));
    }

    /**
     * Endpoint para buscar cursos en el panel de administración utilizando un
     * término de búsqueda (keyword). Devuelve una lista de resultados que contienen
     * información básica del curso.
     * 
     * @param keyword El término de búsqueda utilizado para filtrar los cursos.
     * @return ResponseEntity con la lista de resultados de búsqueda de cursos.
     */
    @GetMapping("/search")
    public ResponseEntity<List<AdminCourseSearchResultDTO>> searchCourses(@RequestParam String keyword) {
        return ResponseEntity.ok(adminCourseInsightService.searchCourses(keyword));
    }

    /**
     * Endpoint para obtener los detalles de un curso específico en el panel de
     * administración.
     * 
     * @param courseId El ID del curso del cual se desean obtener los detalles.
     * @return ResponseEntity con los detalles del curso.
     */
    @GetMapping("/{courseId}")
    public ResponseEntity<AdminCourseDetailDTO> getCourseDetail(@PathVariable Long courseId) {
        return ResponseEntity.ok(adminCourseInsightService.getCourseDetail(courseId));
    }

    /**
     * Endpoint para obtener las estadísticas colectivas del curso en el panel de
     * administración.
     *
     * @param courseId El ID del curso.
     * @return ResponseEntity con las estadísticas colectivas del curso.
     */
    @GetMapping("/{courseId}/collective-stats")
    public ResponseEntity<AdminCourseCollectiveStatsDTO> getCourseCollectiveStats(@PathVariable Long courseId) {
        return ResponseEntity.ok(adminCourseInsightService.getCourseCollectiveStats(courseId));
    }

    /**
     * Endpoint para obtener las estadísticas de un usuario específico dentro de un
     * curso en el panel de administración.
     * 
     * @param courseId El ID del curso en el cual se desea obtener las estadísticas
     *                 del usuario.
     * @param userId   El ID del usuario del cual se desean obtener las
     *                 estadísticas.
     * @return ResponseEntity con las estadísticas del usuario dentro del curso.
     */
    @GetMapping("/{courseId}/users/{userId}/stats")
    public ResponseEntity<AdminCourseUserStatsDTO> getUserStats(@PathVariable Long courseId,
            @PathVariable Long userId) {
        return ResponseEntity.ok(adminCourseInsightService.getUserStatsInCourse(courseId, userId));
    }
}