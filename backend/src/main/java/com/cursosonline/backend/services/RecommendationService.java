package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.RecommendationDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Interest;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.InterestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final CoursesRepository coursesRepository;
    private final InterestRepository interestRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SemanticNormalizer normalizer; // <--- Inyección del nuevo componente

    @Transactional(readOnly = true)
    public List<RecommendationDTO> getRecommendationsForUser(Long userId) {
        Interest interests = interestRepository.findById(userId).orElse(null);
        List<Enrollment> myEnrollments = enrollmentRepository.findAllByUserIdWithCourses(userId);

        Set<Long> excludedIds = myEnrollments.stream()
                .filter(e -> e.getCourse() != null)
                .map(e -> e.getCourse().getCourse_id())
                .collect(Collectors.toSet());

        List<Courses> allCourses = coursesRepository.findAll();

        // FASE DE TRADUCCIÓN: Extracción previa y unificación a Tokens Invariables
        Set<String> userCategoryTokens = interests != null ? normalizer.normalizeCategories(interests.getCategory())
                : Collections.emptySet();
        Set<String> userLevelTokens = interests != null ? normalizer.normalizeLevels(interests.getCourse_type())
                : Collections.emptySet();
        Set<String> userLanguageTokens = interests != null ? normalizer.normalizeLanguages(interests.getLanguage())
                : Collections.emptySet();
        Set<String> userSubtitleTokens = interests != null
                ? normalizer.normalizeLanguages(interests.getSubtitle_languages())
                : Collections.emptySet();
        List<String> rawDurations = interests != null ? interests.getDuration() : Collections.emptyList();

        return allCourses.stream()
                .filter(course -> course != null && course.getCourse_id() != null)
                .filter(course -> !excludedIds.contains(course.getCourse_id()))
                .map(course -> calculateAffinityWithTokens(course, userCategoryTokens, userLevelTokens,
                        userLanguageTokens, userSubtitleTokens, rawDurations, myEnrollments))
                .sorted((dto1, dto2) -> Integer.compare(dto2.score(), dto1.score()))
                .limit(6)
                .collect(Collectors.toList());
    }

    private RecommendationDTO calculateAffinityWithTokens(
            Courses course,
            Set<String> userCategoryTokens,
            Set<String> userLevelTokens,
            Set<String> userLanguageTokens,
            Set<String> userSubtitleTokens,
            List<String> rawDurations,
            List<Enrollment> myEnrollments) {

        double score = 0;
        StringBuilder reason = new StringBuilder();

        // 1. Evaluación de Precondiciones emparejando a nivel de Token Semántico
        String courseCategoryToken = normalizer.normalizeCategory(course.getCategory());
        boolean isCategoryMatch = userCategoryTokens.contains(courseCategoryToken);

        String courseLevelToken = normalizer.normalizeLevel(course.getCourseType());
        // CORRECCIÓN SECCIÓN NIVEL: Concede el match si coincide el token exacto O si
        // Luis marcó que acepta todos los niveles
        boolean isLevelMatch = userLevelTokens.contains("ALL_LEVELS") || userLevelTokens.contains(courseLevelToken);

        String courseLanguageToken = normalizer.normalizeLanguage(course.getLanguage());
        boolean isLanguageMatch = userLanguageTokens.contains(courseLanguageToken);

        // Subtítulos: Al ser una columna de texto libre (ej: "English, Spanish"),
        // comprobamos inclusión lingüística mediante tokens
        boolean isSubtitleMatch = false;
        if (course.getSubtitleLanguages() != null && !userSubtitleTokens.isEmpty()) {
            String cleanSubs = course.getSubtitleLanguages().toLowerCase();
            isSubtitleMatch = userSubtitleTokens.stream()
                    .anyMatch(token -> {
                        // CORRECCIÓN SECCIÓN SUBTÍTULOS: Sincronizado en minúsculas con las salidas de
                        // SemanticNormalizer
                        if (token.equals("spanish") && (cleanSubs.contains("esp") || cleanSubs.contains("spa")))
                            return true;
                        if (token.equals("english") && (cleanSubs.contains("ing") || cleanSubs.contains("eng")))
                            return true;
                        if (token.equals("portuguese") && (cleanSubs.contains("por") || cleanSubs.contains("pt")))
                            return true;
                        if (token.equals("japanese") && (cleanSubs.contains("jap") || cleanSubs.contains("jp")))
                            return true;
                        if (token.equals("french") && (cleanSubs.contains("fra") || cleanSubs.contains("fre")))
                            return true;
                        return cleanSubs.contains(token.toLowerCase());
                    });
        }

        boolean isDurationMatch = checkDurationMatch(course.getDuration(), rawDurations);

        // 2. MODELO POR ESCALONES CRECIENTES DEL HISTORIAL ACADÉMICO
        int historyScore = 0;
        int maxProgressInTemplate = 0;

        if (myEnrollments != null && !myEnrollments.isEmpty() && course.getCategory() != null) {
            for (Enrollment enrollment : myEnrollments) {
                if (enrollment.getCourse() != null && enrollment.getCourse().getCategory() != null) {
                    String enrollmentCatToken = normalizer.normalizeCategory(enrollment.getCourse().getCategory());
                    if (courseCategoryToken.equals(enrollmentCatToken)) {
                        int currentProgress = enrollment.getProgress_percentage();
                        if (currentProgress > maxProgressInTemplate) {
                            maxProgressInTemplate = currentProgress;
                        }
                    }
                }
            }

            if (maxProgressInTemplate >= 100)
                historyScore = 25;
            else if (maxProgressInTemplate >= 75)
                historyScore = 15;
            else if (maxProgressInTemplate >= 50)
                historyScore = 8;
        }

        // 3. Acumulación Estricta de la Matriz de Pesos (Total 100 pts)
        if (isCategoryMatch)
            score += 30;
        score += historyScore;
        if (isLevelMatch)
            score += 20;
        if (isLanguageMatch)
            score += 15;
        if (isSubtitleMatch)
            score += 10;
        if (isDurationMatch)
            score += 5;

        // 4. GENERACIÓN DE EXPLICABILIDAD DINÁMICA (Mapeada en español usando el
        // catálogo real)
        if (isCategoryMatch) {
            reason.append("Coincide con tus categorías preferidas (").append(course.getCategory()).append("). ");
        }

        if (maxProgressInTemplate >= 100) {
            reason.append("Premio por finalizar cursos de esta área al 100%. ");
        } else if (maxProgressInTemplate >= 50) {
            reason.append("Basado en tu progreso activo en asignaturas similares. ");
        }

        if (isLevelMatch) {
            reason.append("Adecuado a tu nivel de experiencia. ");
        }

        if (isLanguageMatch) {
            reason.append("Disponible en tu idioma nativo. ");
        }

        if (isSubtitleMatch) {
            reason.append("Soporta subtítulos de traducción. ");
        }

        if (isDurationMatch) {
            reason.append("Se ajusta a tu disponibilidad de tiempo.");
        }

        String finalReason = reason.toString().trim();
        if (finalReason.isEmpty()) {
            finalReason = "Sugerencia personalizada basada en tus intereses.";
        }

        return new RecommendationDTO(course, (int) score, finalReason);
    }

    private static boolean checkDurationMatch(Number courseHours, List<String> preferredDurations) {
        if (courseHours == null || preferredDurations == null || preferredDurations.isEmpty())
            return false;
        int hours = courseHours.intValue();
        return preferredDurations.stream().anyMatch(target -> {
            if (target == null)
                return false;
            if (hours < 10 && target.contains("Corto"))
                return true;
            if (hours >= 10 && hours <= 40 && target.contains("Medio"))
                return true;
            return hours > 40 && target.contains("Largo");
        });
    }
}
