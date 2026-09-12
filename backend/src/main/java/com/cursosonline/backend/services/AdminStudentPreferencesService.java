package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.AdminStudentPreferencesDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Interest;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.InterestRepository;
import com.cursosonline.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminStudentPreferencesService {

    private static final int MAX_COURSES = 6;
    private static final double MAX_ENROLLMENT_SCORE = 20D;

    private final UserRepository userRepository;
    private final InterestRepository interestRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CoursesRepository coursesRepository;

    @Transactional(readOnly = true)
    public AdminStudentPreferencesDTO getAggregatedPreferences() {
        List<Users> activeStudents = userRepository.findByRole(Role.STUDENT).stream()
                .filter(user -> user != null && Boolean.TRUE.equals(user.getEnabled()) && user.getUser_id() != null)
                .toList();
        Set<Long> activeStudentIds = activeStudents.stream()
                .map(user -> user.getUser_id())
                .collect(Collectors.toSet());

        List<Interest> studentInterests = interestRepository.findAll().stream()
                .filter(interest -> interest != null && interest.getUser() != null
                        && activeStudentIds.contains(interest.getUser().getUser_id())
                        && hasPreferences(interest))
                .toList();

        Map<Long, Long> enrollmentCounts = new HashMap<>();
        for (Enrollment enrollment : enrollmentRepository.findAll()) {
            if (!isValidEnrollment(enrollment, activeStudentIds) || enrollment.getCourse().getCourse_id() == null) {
                continue;
            }
            Long courseId = enrollment.getCourse().getCourse_id();
            enrollmentCounts.merge(courseId, 1L,
                    (current, increment) -> current == null ? increment : current + increment);
        }

        long maxEnrollments = enrollmentCounts.values().stream()
                .mapToLong(value -> value == null ? 0L : value.longValue())
                .max()
                .orElse(0L);
        List<String> categoryValues = dominantValues(studentInterests, interest -> interest.getCategory());
        List<String> levelValues = dominantValues(studentInterests, interest -> interest.getCourse_type());
        List<String> durationValues = dominantValues(studentInterests, interest -> interest.getDuration());
        List<String> languageValues = dominantValues(studentInterests, interest -> interest.getLanguage());
        List<String> subtitleValues = dominantValues(studentInterests, interest -> interest.getSubtitle_languages());

        List<AdminStudentPreferencesDTO.PreferenceSummary> preferences = List.of(
                summary("Categorías", categoryValues, studentInterests, interest -> interest.getCategory()),
                summary("Nivel de dificultad", levelValues, studentInterests, interest -> interest.getCourse_type()),
                summary("Disponibilidad de tiempo", durationValues, studentInterests,
                        interest -> interest.getDuration()),
                summary("Idioma del curso", languageValues, studentInterests, interest -> interest.getLanguage()),
                summary("Preferencias de subtítulos", subtitleValues, studentInterests,
                        interest -> interest.getSubtitle_languages()));

        List<AdminStudentPreferencesDTO.CourseDemand> courses = coursesRepository.findAll().stream()
                .filter(course -> course != null && course.getCourse_id() != null)
                .map(course -> scoreCourse(course, categoryValues, levelValues, durationValues, languageValues,
                        subtitleValues, enrollmentCounts.getOrDefault(course.getCourse_id(), 0L), maxEnrollments))
                .filter(course -> course.totalScore() > 0)
                .sorted(Comparator.comparingInt((AdminStudentPreferencesDTO.CourseDemand course) -> course.totalScore())
                        .reversed()
                        .thenComparing(Comparator
                                .comparingLong(
                                        (AdminStudentPreferencesDTO.CourseDemand course) -> course.activeEnrollments())
                                .reversed())
                        .thenComparing(
                                (AdminStudentPreferencesDTO.CourseDemand course) -> course.title(),
                                Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .limit(MAX_COURSES)
                .toList();

        return new AdminStudentPreferencesDTO(
                studentInterests.size(),
                (int) enrollmentCounts.values().stream()
                        .mapToLong(value -> value == null ? 0L : value.longValue())
                        .sum(),
                preferences,
                courses);
    }

    private AdminStudentPreferencesDTO.CourseDemand scoreCourse(
            Courses course,
            List<String> categories,
            List<String> levels,
            List<String> durations,
            List<String> languages,
            List<String> subtitles,
            long enrollments,
            long maxEnrollments) {
        double categoryScore = matches(categories, course.getCategory()) ? 30D : 0D;
        double levelScore = matchesLevel(levels, course.getCourseType()) ? 20D : 0D;
        double languageScore = matches(languages, course.getLanguage()) ? 15D : 0D;
        double subtitleScore = matchesSubtitle(subtitles, course.getSubtitleLanguages()) ? 10D : 0D;
        double durationScore = matchesDuration(durations, course.getDuration()) ? 5D : 0D;
        double enrollmentScore = maxEnrollments == 0 ? 0D : (enrollments * MAX_ENROLLMENT_SCORE) / maxEnrollments;
        int totalScore = (int) Math
                .round(categoryScore + levelScore + languageScore + subtitleScore + durationScore + enrollmentScore);

        String professorUsername = course.getAssignedUser() == null ? null : course.getAssignedUser().getUsername();
        return new AdminStudentPreferencesDTO.CourseDemand(
                course.getCourse_id(), course.getTitle(), totalScore, categoryScore, enrollmentScore, levelScore,
                languageScore, subtitleScore, durationScore, enrollments, course.getAssignedUser() != null,
                professorUsername);
    }

    private boolean isValidEnrollment(Enrollment enrollment, Set<Long> activeStudentIds) {
        if (enrollment == null || enrollment.getUser() == null || enrollment.getCourse() == null
                || !activeStudentIds.contains(enrollment.getUser().getUser_id())) {
            return false;
        }
        String status = normalize(enrollment.getStatus());
        return !Set.of("cancelado", "cancelada", "eliminado", "eliminada", "inactivo", "inactiva")
                .contains(status);
    }

    private AdminStudentPreferencesDTO.PreferenceSummary summary(
            String dimension,
            List<String> values,
            List<Interest> interests,
            Function<Interest, ?> extractor) {
        int selections = interests.stream()
                .flatMap(interest -> stringValues(extractor.apply(interest)).stream())
                .filter(value -> values.stream().map(this::normalize).toList().contains(normalize(value)))
                .mapToInt(value -> 1)
                .sum();
        return new AdminStudentPreferencesDTO.PreferenceSummary(dimension, values, selections, interests.size());
    }

    private List<String> dominantValues(List<Interest> interests, Function<Interest, ?> extractor) {
        Map<String, Integer> counts = new HashMap<>();
        Map<String, String> displayValues = new HashMap<>();
        for (Interest interest : interests) {
            for (String value : stringValues(extractor.apply(interest))) {
                String normalized = normalize(value);
                if (!normalized.isEmpty()) {
                    counts.merge(normalized, 1,
                            (current, increment) -> current == null ? increment : current + increment);
                    displayValues.putIfAbsent(normalized, value.trim());
                }
            }
        }
        int max = counts.values().stream()
                .mapToInt(value -> value == null ? 0 : value.intValue())
                .max()
                .orElse(0);
        return counts.entrySet().stream()
                .filter(entry -> entry.getValue() == max && max > 0)
                .map(entry -> displayValues.get(entry.getKey()))
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
    }

    private List<String> stringValues(Object value) {
        if (value instanceof List<?> list) {
            return list.stream().filter(String.class::isInstance).map(String.class::cast).toList();
        }
        if (value instanceof String string) {
            return Arrays.stream(string.split(",")).toList();
        }
        return List.of();
    }

    private boolean hasPreferences(Interest interest) {
        return !stringValues(interest.getCategory()).isEmpty()
                || !stringValues(interest.getCourse_type()).isEmpty()
                || !stringValues(interest.getDuration()).isEmpty()
                || !stringValues(interest.getLanguage()).isEmpty()
                || !stringValues(interest.getSubtitle_languages()).isEmpty();
    }

    private boolean matches(List<String> dominant, String courseValue) {
        return courseValue != null
                && dominant.stream().anyMatch(value -> normalize(value).equals(normalize(courseValue)));
    }

    private boolean matchesLevel(List<String> dominant, String courseValue) {
        return courseValue != null
                && dominant.stream().anyMatch(value -> normalizeLevel(value).equals(normalizeLevel(courseValue)));
    }

    private boolean matchesSubtitle(List<String> dominant, String courseValue) {
        if (courseValue == null || courseValue.isBlank()) {
            return dominant.stream().anyMatch(value -> normalize(value).contains("sin_subtitulo"));
        }
        String normalizedCourse = normalize(courseValue);
        return dominant.stream().anyMatch(value -> {
            String normalized = normalize(value);
            if (normalized.contains("con_subtitulo"))
                return true;
            if (normalized.contains("ingles"))
                return normalizedCourse.contains("ing") || normalizedCourse.contains("eng");
            if (normalized.contains("espanol"))
                return normalizedCourse.contains("esp") || normalizedCourse.contains("spa");
            return normalizedCourse.contains(normalized);
        });
    }

    private boolean matchesDuration(List<String> dominant, Number duration) {
        if (duration == null)
            return false;
        int hours = duration.intValue();
        return dominant.stream().anyMatch(value -> {
            String normalized = normalize(value);
            return (hours < 10 && normalized.contains("corto"))
                    || (hours >= 10 && hours <= 40 && normalized.contains("medio"))
                    || (hours > 40 && normalized.contains("largo"));
        });
    }

    private String normalizeLevel(String value) {
        String normalized = normalize(value);
        if (normalized.contains("todos_los_niveles"))
            return "all_levels";
        if (Set.of("principiante", "basico", "principiante_basico").contains(normalized))
            return "basico";
        if (Set.of("medio", "intermedio", "medio_intermedio").contains(normalized))
            return "intermedio";
        if (Set.of("avanzado", "experto", "avanzado_experto").contains(normalized))
            return "avanzado";
        return normalized;
    }

    private String normalize(String value) {
        if (value == null)
            return "";
        return java.text.Normalizer.normalize(value.trim().toLowerCase(Locale.ROOT), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replaceAll("[^a-z0-9\\s_-]", "").replaceAll("\\s+", "_");
    }
}
