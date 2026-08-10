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

/**
 * Servicio de Recomendaciones de Cursos Personalizadas
 * Basado en los intereses del usuario, historial de matrículas y afinidad de
 * cursos.
 */
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private static final String ALL_LEVELS_TOKEN = "all_levels";
    private static final String BASIC_LEVEL_TOKEN = "basico";
    private static final String INTERMEDIATE_LEVEL_TOKEN = "intermedio";
    private static final String ADVANCED_LEVEL_TOKEN = "avanzado";

    private final CoursesRepository coursesRepository;
    private final InterestRepository interestRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;

    /**
     * Obtiene una lista de recomendaciones de cursos para un usuario dado.
     * La recomendación se basa en los intereses del usuario, su historial de
     * matrículas y la afinidad de los cursos disponibles.
     * 
     * @param username El nombre de usuario del cual se obtendrán las
     *                 recomendaciones.
     * @return Una lista de objetos RecommendationDTO que representan los cursos
     *         recomendados.
     */
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

    /**
     * Obtiene una lista de recomendaciones de cursos para un usuario dado por su
     * ID.
     * La recomendación se basa en los intereses del usuario, su historial de
     * matrículas y la afinidad de los cursos disponibles.
     * 
     * @param userId El ID del usuario para el cual se obtendrán las
     *               recomendaciones.
     * @return Una lista de objetos RecommendationDTO que representan los cursos
     *         recomendados.
     */
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

    /**
     * Construye una lista de recomendaciones de cursos basada en los intereses del
     * usuario, su historial de matrículas y la afinidad de los cursos disponibles.
     * 
     * @param interests     Los intereses del usuario.
     * @param myEnrollments El historial de matrículas del usuario.
     * @param allCourses    Todos los cursos disponibles.
     * @return Una lista de objetos RecommendationDTO que representan los cursos
     *         recomendados.
     */
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

        Set<String> userCategoryTokens = interests != null ? normalizeCollection(interests.getCategory())
                : Collections.emptySet();
        Set<String> userLevelTokens = interests != null ? normalizeLevelCollection(interests.getCourse_type())
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

    /**
     * Calcula la afinidad de un curso con los intereses del usuario y su historial
     * de matrículas.
     * 
     * @param course             El curso para el cual se calcula la afinidad.
     * @param userCategoryTokens Los tokens de categoría del usuario.
     * @param userLevelTokens    Los tokens de nivel del usuario.
     * @param userLanguageTokens Los tokens de idioma del usuario.
     * @param userSubtitleTokens Los tokens de subtítulos del usuario.
     * @param rawDurations       Las duraciones de interés del usuario.
     * @param myEnrollments      El historial de matrículas del usuario.
     * @return Un objeto RecommendationDTO que representa la afinidad del curso con
     *         el usuario.
     */
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

        // Evaluación de Precondiciones emparejando a nivel de Token Semántico local
        String courseCategoryToken = normalizeSingle(course.getCategory());
        boolean isCategoryMatch = userCategoryTokens.contains(courseCategoryToken);

        String courseLevelToken = normalizeLevelToken(course.getCourseType());
        boolean isLevelMatch = userLevelTokens.contains(ALL_LEVELS_TOKEN) || userLevelTokens.contains(courseLevelToken);

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

        // MODELO POR ESCALONES CRECIENTES DEL HISTORIAL ACADÉMICO
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
                historyScore = 20;
            else if (maxProgressInTemplate >= 75)
                historyScore = 15;
            else if (maxProgressInTemplate >= 50)
                historyScore = 8;
        }

        // Acumulación Estricta de la Matriz de Pesos (Total 100 pts)
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

        // GENERACIÓN DE EXPLICABILIDAD DINÁMICA
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

    /**
     * Verifica si la duración del curso coincide con las preferencias del usuario.
     * 
     * @param courseHours        La duración del curso en horas.
     * @param preferredDurations Las duraciones preferidas por el usuario.
     * @return true si la duración del curso coincide con las preferencias del
     *         usuario, false en caso contrario.
     */
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
     * Normaliza una cadena de entrada a un token semántico único.
     * La normalización incluye:
     * - Conversión a minúsculas.
     * - Eliminación de acentos.
     * - Reemplazo de espacios por guiones bajos.
     * - Eliminación de caracteres no alfanuméricos.
     * 
     * @param input La cadena de entrada a normalizar.
     * @return El token semántico normalizado.
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

    private static String normalizeLevelToken(String input) {
        String normalized = normalizeSingle(input);

        return switch (normalized) {
            case "todos_los_niveles", ALL_LEVELS_TOKEN -> ALL_LEVELS_TOKEN;
            case "principiante", "basico", "principiante_basico" -> BASIC_LEVEL_TOKEN;
            case "medio", "intermedio", "medio_intermedio" -> INTERMEDIATE_LEVEL_TOKEN;
            case "avanzado", "experto", "avanzado_experto" -> ADVANCED_LEVEL_TOKEN;
            default -> normalized;
        };
    }

    /**
     * Normaliza una colección de entradas a un conjunto de tokens semánticos
     * únicos.
     * La normalización incluye:
     * - Conversión a minúsculas.
     * - Eliminación de acentos.
     * - Reemplazo de espacios por guiones bajos.
     * - Eliminación de caracteres no alfanuméricos.
     * 
     * @param input La colección de entradas a normalizar.
     * @return El conjunto de tokens semánticos normalizados.
     */
    private static Set<String> normalizeCollection(Object input) {
        List<String> rawElements = extractStringElements(input);
        if (rawElements.isEmpty()) {
            return Collections.emptySet();
        }

        return rawElements.stream()
                .map(value -> value == null ? "" : value.trim())
                .filter(s -> !s.isEmpty())
                .map(RecommendationService::normalizeSingle)
                .collect(Collectors.toSet());
    }

    private static Set<String> normalizeLevelCollection(Object input) {
        List<String> rawElements = extractStringElements(input);
        if (rawElements.isEmpty()) {
            return Collections.emptySet();
        }

        return rawElements.stream()
                .map(value -> value == null ? "" : value.trim())
                .filter(s -> !s.isEmpty())
                .map(RecommendationService::normalizeLevelToken)
                .collect(Collectors.toSet());
    }

    private static List<String> extractStringElements(Object input) {
        if (input instanceof List<?> rawList) {
            return rawList.stream()
                    .filter(element -> element instanceof String)
                    .map(element -> (String) element)
                    .toList();
        }

        if (input instanceof String rawString) {
            return Arrays.asList(rawString.split(","));
        }

        return Collections.emptyList();
    }
}
