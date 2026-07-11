package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.RecommendationDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Interest;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.InterestRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
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
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<RecommendationDTO> getRecommendations(String username) {
        if (username == null || username.trim().isEmpty()) {
            return Collections.emptyList();
        }

        Users user = userRepository.findByUsername(username.trim()).orElse(null);
        if (user == null || user.getUser_id() == null) {
            return Collections.emptyList();
        }

        Interest interests = interestRepository.findByUser_Username(username.trim()).orElse(null);
        List<Enrollment> myEnrollments = enrollmentRepository.findAllByUserIdWithCourses(user.getUser_id());
        List<Courses> allCourses = coursesRepository.findAll();

        return buildRecommendations(interests, myEnrollments, allCourses);
    }

    @Transactional(readOnly = true)
    public List<RecommendationDTO> getRecommendationsForUser(Long userId) {
        if (userId == null) {
            return Collections.emptyList();
        }

        Interest interests = interestRepository.findById(userId).orElse(null);
        List<Enrollment> myEnrollments = enrollmentRepository.findAllByUserIdWithCourses(userId);
        List<Courses> allCourses = coursesRepository.findAll();

        return buildRecommendations(interests, myEnrollments, allCourses);
    }

    private List<RecommendationDTO> buildRecommendations(
            Interest interests,
            List<Enrollment> myEnrollments,
            List<Courses> allCourses) {

        List<Enrollment> safeEnrollments = myEnrollments != null ? myEnrollments : Collections.emptyList();
        List<Courses> safeCourses = allCourses != null ? allCourses : Collections.emptyList();

        Set<Long> excludedIds = safeEnrollments.stream()
                .filter(e -> e.getCourse() != null)
                .map(e -> e.getCourse().getCourse_id())
                .collect(Collectors.toSet());

        // FASE DE TRADUCCIÓN: Extracción previa y unificación a Tokens nativos
        // independientes
        Set<String> userCategoryTokens = interests != null ? normalizeCollection(interests.getCategory())
                : Collections.emptySet();
        Set<String> userLevelTokens = interests != null ? normalizeCollection(interests.getCourse_type())
                : Collections.emptySet();
        Set<String> userLanguageTokens = interests != null ? normalizeCollection(interests.getLanguage())
                : Collections.emptySet();
        Set<String> userSubtitleTokens = interests != null
                ? normalizeCollection(interests.getSubtitle_languages())
                : Collections.emptySet();
        List<String> rawDurations = interests != null ? interests.getDuration() : Collections.emptyList();

        return safeCourses.stream()
                .filter(course -> course != null && course.getCourse_id() != null)
                .filter(course -> !excludedIds.contains(course.getCourse_id()))
                .map(course -> calculateAffinityWithTokens(course, userCategoryTokens, userLevelTokens,
                        userLanguageTokens, userSubtitleTokens, rawDurations, safeEnrollments))
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

        // 1. Evaluación de Precondiciones emparejando a nivel de Token Semántico local
        String courseCategoryToken = normalizeSingle(course.getCategory());
        boolean isCategoryMatch = userCategoryTokens.contains(courseCategoryToken);

        String courseLevelToken = normalizeSingle(course.getCourseType());
        boolean isLevelMatch = userLevelTokens.contains("ALL_LEVELS") || userLevelTokens.contains(courseLevelToken);

        String courseLanguageToken = normalizeSingle(course.getLanguage());
        boolean isLanguageMatch = userLanguageTokens.contains(courseLanguageToken);

        // Subtítulos: Comprobamos inclusión lingüística nativa mediante tokens
        // normalizados
        boolean isSubtitleMatch = false;
        if (course.getSubtitleLanguages() != null && !userSubtitleTokens.isEmpty()) {
            String cleanSubs = course.getSubtitleLanguages().toLowerCase();
            isSubtitleMatch = userSubtitleTokens.stream()
                    .anyMatch(token -> {
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
                    String enrollmentCatToken = normalizeSingle(enrollment.getCourse().getCategory());
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

        // 4. GENERACIÓN DE EXPLICABILIDAD DINÁMICA
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

    /**
     * ABSORCIÓN NATIVA DE SEMANTIC NORMALIZER:
     * Convierte una cadena de texto libre en un token unificado e invariable.
     */
    private static String normalizeSingle(String input) {
        if (input == null) {
            return "";
        }
        return input.trim()
                .toLowerCase()
                .replace("á", "a")
                .replace("é", "e")
                .replace("í", "i")
                .replace("ó", "o")
                .replace("ú", "u")
                .replaceAll("[^a-z0-8_\\s-]", "")
                .replaceAll("\\s+", "_");
    }

    /**
     * ABSORCIÓN NATIVA DE SEMANTIC NORMALIZER:
     * Transforma colecciones o estructuras delimitadas por comas en colecciones de
     * tokens semánticos únicos.
     * Blindado con supresión de alertas de casteo y validación anticipada de nulos.
     */
    @SuppressWarnings("unchecked")
    private static Set<String> normalizeCollection(Object input) {
        if (input == null) {
            return Collections.emptySet();
        }

        List<String> rawElements;
        if (input instanceof List) {
            rawElements = (List<String>) input;
        } else if (input instanceof String) {
            rawElements = Arrays.asList(((String) input).split(","));
        } else {
            return Collections.emptySet();
        }

        return rawElements.stream()
                .filter(Objects::nonNull) // 1. Filtro preventivo de nulos en la cabecera del Stream
                .map(s -> s.trim()) // 2. Ejecución segura para evitar alertas de puntero nulo
                .filter(s -> !s.isEmpty())
                .map(RecommendationService::normalizeSingle)
                .collect(Collectors.toSet());
    }
}
