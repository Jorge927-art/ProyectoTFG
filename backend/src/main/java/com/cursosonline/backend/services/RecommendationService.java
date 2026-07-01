package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.RecommendationDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Interest;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.InterestRepository;
import com.cursosonline.backend.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * LÓGICA DE NEGOCIO EN JAVA (Algoritmo de Filtrado Basado en Contenido)
 * [ADR-30].
 * Procesa el catálogo en memoria mediante Java Streams optimizando las lecturas
 * a PostgreSQL.
 */
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final CoursesRepository coursesRepository;
    private final InterestRepository interestRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Transactional(readOnly = true)
    public List<RecommendationDTO> getRecommendationsForUser(Long userId) {
        // 1. Recuperar contexto: Intereses con excepción semántica si no se han
        // configurado
        Interest interests = interestRepository.findById(userId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Configure sus intereses para recibir recomendaciones."));

        // 2. Extraer los IDs de cursos a EXCLUIR utilizando la consulta proyectada real
        // de tu repositorio
        List<Long> enrolledCourseIds = enrollmentRepository.findEnrolledCourseIdsByUserId(userId);
        Set<Long> excludedIds = enrolledCourseIds != null ? enrolledCourseIds.stream().collect(Collectors.toSet())
                : Set.of();

        // 3. Traer el catálogo de cursos disponibles
        List<Courses> allCourses = coursesRepository.findAll();

        // 4. Procesar catálogo completo mediante Streams (Estrategia Stateless)
        return allCourses.stream()
                .filter(course -> course != null && course.getCourse_id() != null)
                .filter(course -> !excludedIds.contains(course.getCourse_id()))
                .map(course -> calculateAffinity(course, interests, enrolledCourseIds, allCourses))
                .filter(dto -> dto.score() > 10) // Umbral mínimo de relevancia
                .sorted((dto1, dto2) -> Integer.compare(dto2.score(), dto1.score()))
                .limit(6) // Top 6 para la UI del Dashboard
                .collect(Collectors.toList());
    }

    private RecommendationDTO calculateAffinity(Courses course, Interest interests, List<Long> enrolledCourseIds,
            List<Courses> allCourses) {
        double score = 0;
        StringBuilder reason = new StringBuilder();

        // A. Coincidencia de Categoría (30%) [30 pts]
        if (interests.getCategory() != null && course.getCategory() != null
                && interests.getCategory().contains(course.getCategory())) {
            score += 30;
            reason.append("Coincide con tus categorías preferidas. ");
        }

        // B. Historial de Aprendizaje Previo (25%) [25 pts]
        // Analizamos si el usuario ya consume esta misma temática en sus matrículas
        // activas
        boolean hasThematicSuccess = false;
        if (enrolledCourseIds != null && !enrolledCourseIds.isEmpty() && course.getCategory() != null) {
            Set<String> myCategories = allCourses.stream()
                    .filter(c -> c != null && enrolledCourseIds.contains(c.getCourse_id()) && c.getCategory() != null)
                    .map(c -> c.getCategory().trim()) // CORRECCIÓN: Lambda explícita que neutraliza el aviso de
                                                      // seguridad de tipos
                    .collect(Collectors.toSet());

            if (myCategories.contains(course.getCategory())) {
                hasThematicSuccess = true;
            }
        }

        if (hasThematicSuccess) {
            score += 25;
            reason.append("Basado en tus elecciones de cursos similares. ");
        }

        // C. Nivel o Tipo de Curso (20%) [20 pts]
        if (interests.getCourse_type() != null && course.getCourseType() != null
                && interests.getCourse_type().contains(course.getCourseType())) {
            score += 20;
        }

        // D. Idioma y Subtítulos (15%) [15 pts]
        boolean langMatch = interests.getLanguage() != null && course.getLanguage() != null
                && interests.getLanguage().contains(course.getLanguage());

        boolean subMatch = interests.getSubtitle_languages() != null && course.getSubtitleLanguages() != null
                && interests.getSubtitle_languages().contains(course.getSubtitleLanguages());

        if (langMatch || subMatch) {
            score += 15;
        }

        // E. Duración Estimada (10%) [10 pts]
        if (checkDurationMatch(course.getDuration(), interests.getDuration())) {
            score += 10;
        }

        return new RecommendationDTO(course, (int) score, reason.toString().trim());
    }

    /**
     * Mapeo lógico de horas universal compatible con proxies de Hibernate.
     */
    private static boolean checkDurationMatch(Number courseHours, Object preferredDurations) {
        if (courseHours == null || preferredDurations == null)
            return false;

        int hours = courseHours.intValue();
        String targets = preferredDurations.toString();

        if (hours < 10 && targets.contains("Corto"))
            return true;
        if (hours >= 10 && hours <= 40 && targets.contains("Medio"))
            return true;
        return hours > 40 && targets.contains("Largo");
    }
}
