package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.RecommendationDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Interest;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.UserSystemNotification;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.InterestRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.repository.UserSystemNotificationRepository;
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
    private final UserSystemNotificationRepository userSystemNotificationRepository;

    private static final String COURSE_RECOMMENDATION_NOTIFICATION_TYPE = "COURSE_RECOMMENDATION";

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

    @Transactional
    public void notifyStudentsAboutNewCourse(Courses course) {
        if (course == null || course.getCourse_id() == null || course.getAssignedUser() == null) {
            return;
        }

        List<Users> students = userRepository.findByRole(Role.STUDENT);
        if (students == null) {
            return;
        }

        List<Courses> allCourses = coursesRepository.findAll();

        for (Users student : students) {
            if (student == null || student.getUser_id() == null || !student.isEnabled()) {
                continue;
            }

            List<Enrollment> enrollments = enrollmentRepository.findAllByUserIdWithCourses(student.getUser_id());
            Interest interests = interestRepository.findByUser_Username(student.getUsername()).orElse(null);
            boolean isRecommended = buildRecommendations(interests, enrollments, allCourses).stream()
                    .anyMatch(recommendation -> course.getCourse_id().equals(recommendation.id())
                            && recommendation.score() > 0);
            if (!isRecommended || userSystemNotificationRepository.existsRecommendationNotification(
                    student.getUser_id(), COURSE_RECOMMENDATION_NOTIFICATION_TYPE, course.getCourse_id())) {
                continue;
            }

            UserSystemNotification notification = new UserSystemNotification();
            notification.setReceiver(student);
            notification.setRelatedCourseId(course.getCourse_id());
            notification.setType(COURSE_RECOMMENDATION_NOTIFICATION_TYPE);
            notification.setTitle("Nuevas recomendaciones para ti");
            notification.setMessage("La asignatura \"" + safeCourseTitle(course)
                    + "\" coincide con tus intereses y ya aparece en tus recomendaciones personalizadas.");
            notification.setRedirectUrl("/student");
            notification.setRead(false);
            userSystemNotificationRepository.save(notification);
        }
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

        Set<String> userCategoryTokens = interests != null ? normalizeCategoryCollection(interests.getCategory())
                : Collections.emptySet();
        Set<String> userLevelTokens = interests != null ? normalizeLevelCollection(interests.getCourse_type())
                : Collections.emptySet();
        Set<String> userLanguageTokens = interests != null ? normalizeLanguageCollection(interests.getLanguage())
                : Collections.emptySet();
        Set<String> userSubtitleTokens = interests != null
                ? normalizeSubtitleCollection(interests.getSubtitle_languages())
                : Collections.emptySet();
        List<String> rawDurations = interests != null ? interests.getDuration() : Collections.emptyList();

        return safeCourses.stream()
                .filter(course -> course != null && course.getCourse_id() != null)
                .filter(course -> !excludedIds.contains(course.getCourse_id()))
                .map(course -> calculateAffinityWithTokens(course, userCategoryTokens, userLevelTokens,
                        userLanguageTokens, userSubtitleTokens, rawDurations, safeEnrollments))
                .filter(recommendation -> recommendation != null && recommendation.score() > 0)
                .sorted(Comparator.comparingInt(
                        (RecommendationDTO recommendation) -> recommendation == null ? Integer.MIN_VALUE
                                : recommendation.score())
                        .reversed()
                        .thenComparing(
                                recommendation -> recommendation == null ? null : recommendation.rating(),
                                Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(
                                recommendation -> recommendation == null ? null : recommendation.id(),
                                Comparator.nullsLast(Comparator.naturalOrder())))
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
        String courseCategoryToken = normalizeCategoryToken(course.getCategory());
        boolean isCategoryMatch = userCategoryTokens.contains(courseCategoryToken);

        String courseLevelToken = normalizeLevelToken(course.getCourseType());
        boolean isLevelMatch = userLevelTokens.contains(ALL_LEVELS_TOKEN) || userLevelTokens.contains(courseLevelToken);

        String courseLanguageToken = normalizeLanguageToken(course.getLanguage());
        boolean isLanguageMatch = userLanguageTokens.contains(courseLanguageToken);

        // Subtítulos: Comprobamos inclusión lingüística nativa mediante tokens
        // normalizados
        boolean isSubtitleMatch = false;
        if (!userSubtitleTokens.isEmpty()) {
            String cleanSubs = course.getSubtitleLanguages() == null ? ""
                    : course.getSubtitleLanguages().toLowerCase();
            isSubtitleMatch = userSubtitleTokens.stream()
                    .anyMatch(token -> {
                        if (token.equals("con_subtitulos"))
                            return !cleanSubs.isBlank();
                        if (token.equals("sin_subtitulos"))
                            return cleanSubs.isBlank();
                        if (token.equals("subtitulos_en_ingles"))
                            token = "ingles";
                        if (token.equals("subtitulos_en_espanol"))
                            token = "espanol";
                        if (token.equals("espanol") && (cleanSubs.contains("esp") || cleanSubs.contains("spa")))
                            return true;
                        if (token.equals("ingles") && (cleanSubs.contains("ing") || cleanSubs.contains("eng")))
                            return true;
                        if (token.equals("portugues") && (cleanSubs.contains("por") || cleanSubs.contains("pt")))
                            return true;
                        if (token.equals("japanese") && (cleanSubs.contains("jap") || cleanSubs.contains("jp")))
                            return true;
                        if (token.equals("frances") && (cleanSubs.contains("fra") || cleanSubs.contains("fre")))
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
                    String enrollmentCatToken = normalizeCategoryToken(enrollment.getCourse().getCategory());
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
                .replaceAll("\\s+", "_")
                .replaceAll("_+", "_");
    }

    private String safeCourseTitle(Courses course) {
        return course.getTitle() == null || course.getTitle().isBlank() ? "Nuevo curso" : course.getTitle().trim();
    }

    private static String normalizeLevelToken(String input) {
        String normalized = normalizeSingle(input);

        return switch (normalized) {
            case "todos_los_niveles", ALL_LEVELS_TOKEN -> ALL_LEVELS_TOKEN;
            case "principiante", "basico", "principiante_basico", "beginner", "basic" -> BASIC_LEVEL_TOKEN;
            case "medio", "intermedio", "medio_intermedio", "intermediate" -> INTERMEDIATE_LEVEL_TOKEN;
            case "avanzado", "experto", "avanzado_experto", "advanced", "expert",
                    "professional_certificate" ->
                ADVANCED_LEVEL_TOKEN;
            default -> normalized;
        };
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

    private static Set<String> normalizeCategoryCollection(Object input) {
        return normalizeWith(input, RecommendationService::normalizeCategoryToken);
    }

    private static Set<String> normalizeLanguageCollection(Object input) {
        return normalizeWith(input, RecommendationService::normalizeLanguageToken);
    }

    private static Set<String> normalizeSubtitleCollection(Object input) {
        return normalizeWith(input, RecommendationService::normalizeSubtitleToken);
    }

    private static Set<String> normalizeWith(Object input, java.util.function.Function<String, String> normalizer) {
        return extractStringElements(input).stream()
                .map(value -> value == null ? "" : value.trim())
                .filter(value -> !value.isEmpty())
                .map(normalizer)
                .filter(value -> !value.isEmpty())
                .collect(Collectors.toSet());
    }

    private static String normalizeCategoryToken(String input) {
        String normalized = normalizeSingle(input);
        return switch (normalized) {
            case "language_learning", "language_and_linguistics" -> "aprendizaje_de_idiomas";
            case "business", "business_management", "business_essentials" -> "negocios";
            case "data_science" -> "ciencia_de_datos";
            case "information_technology", "it" -> "tecnologia_de_la_informacion";
            case "computer_science" -> "ciencias_de_la_computacion";
            case "arts_and_humanities" -> "artes_y_humanidades";
            case "personal_development" -> "desarrollo_personal";
            case "health" -> "salud";
            case "social_sciences" -> "ciencias_sociales";
            case "physical_science_and_engineering", "physical_sciences_and_engineering" ->
                "ciencias_fisicas_e_ingenieria";
            case "mathematics_and_logic" -> "matematicas_y_logica";
            default -> normalized;
        };
    }

    private static String normalizeLanguageToken(String input) {
        String normalized = normalizeSingle(input);
        return switch (normalized) {
            case "espanol", "spanish", "es" -> "espanol";
            case "ingles", "english", "en" -> "ingles";
            case "portugues", "portuguese", "portuguese_brazilian", "portuguese_european", "pt" -> "portugues";
            case "aleman", "german", "de" -> "aleman";
            case "frances", "french", "fr" -> "frances";
            default -> normalized;
        };
    }

    private static String normalizeSubtitleToken(String input) {
        String normalized = normalizeSingle(input);
        return switch (normalized) {
            case "con_subtitulos", "with_subtitles" -> "con_subtitulos";
            case "sin_subtitulos", "without_subtitles" -> "sin_subtitulos";
            case "subtitulos_en_ingles", "english_subtitles" -> "subtitulos_en_ingles";
            case "subtitulos_en_espanol", "spanish_subtitles" -> "subtitulos_en_espanol";
            default -> normalizeLanguageToken(input);
        };
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
