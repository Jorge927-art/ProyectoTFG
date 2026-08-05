package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.AdminCourseCatalogItemDTO;
import com.cursosonline.backend.dto.AdminCourseCreateRequestDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.exception.ResourceNotFoundException;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminCourseCatalogService {

    private static final String SITE_FIXED_VALUE = "COLE";

    private static final Set<String> PATCHABLE_FIELDS = Set.of(
            "url",
            "shortIntro",
            "category",
            "subCategory",
            "courseType",
            "language",
            "subtitleLanguages",
            "skills",
            "instructors",
            "rating",
            "numOfViewers",
            "duration",
            "site");

    private static final Set<String> RESTRICTED_FOR_USED = Set.of("rating", "numOfViewers", "duration");

    private final CoursesRepository coursesRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Transactional(readOnly = true)
    public List<AdminCourseCatalogItemDTO> getAdminCourseCatalog() {
        List<Courses> courses = coursesRepository.findAllByOrderByTitleAsc();
        if (courses.isEmpty()) {
            return List.of();
        }

        Set<Long> usedCourseIds = resolveUsedCourseIds(courses);

        return courses.stream()
                .map(course -> toCatalogItem(course,
                        isCourseUsed(course, usedCourseIds.contains(course.getCourse_id()))))
                .toList();
    }

    @Transactional
    public AdminCourseCatalogItemDTO createCourse(AdminCourseCreateRequestDTO request) {
        if (request == null) {
            throw new ServicesException("El payload del curso es obligatorio.");
        }

        String title = sanitizeRequiredTitle(request.title());
        String titleKey = normalizeTitleKey(title);

        if (coursesRepository.existsByTitleKey(titleKey)) {
            throw new ServicesException("Este curso ya existe.");
        }

        Courses course = new Courses();
        course.setTitle(title);
        course.setTitleKey(titleKey);
        course.setUrl(normalizeOptionalString(request.url()));
        course.setShortIntro(normalizeOptionalString(request.shortIntro()));
        course.setCategory(normalizeOptionalString(request.category()));
        course.setSubCategory(normalizeOptionalString(request.subCategory()));
        course.setCourseType(normalizeOptionalString(request.courseType()));
        course.setLanguage(normalizeOptionalString(request.language()));
        course.setSubtitleLanguages(normalizeOptionalString(request.subtitleLanguages()));
        course.setSkills(normalizeOptionalString(request.skills()));
        course.setInstructors(normalizeOptionalString(request.instructors()));
        course.setRating(request.rating());
        course.setNumOfViewers(request.numOfViewers());
        course.setDuration(request.duration());
        course.setSite(SITE_FIXED_VALUE);
        course.setEverUsed(false);

        Courses saved = coursesRepository.saveAndFlush(course);
        return toCatalogItem(saved, false);
    }

    @Transactional
    public AdminCourseCatalogItemDTO patchCourse(Long courseId, Map<String, Object> changes) {
        Courses course = coursesRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Curso no encontrado con id: " + courseId));

        if (changes == null || changes.isEmpty()) {
            return toCatalogItem(course, isCourseUsed(course, isCourseUsedByEnrollment(courseId)));
        }

        if (changes.containsKey("title")) {
            throw new ServicesException("El título no se puede modificar.");
        }

        validatePatchKeys(changes.keySet());

        boolean used = isCourseUsed(course, isCourseUsedByEnrollment(courseId));
        if (used && changes.keySet().stream().anyMatch(RESTRICTED_FOR_USED::contains)) {
            throw new ServicesException("Curso activo.");
        }

        applyPatch(course, changes);
        course.setSite(SITE_FIXED_VALUE);

        Courses saved = coursesRepository.saveAndFlush(course);
        return toCatalogItem(saved, used);
    }

    @Transactional
    public void deleteCourse(Long courseId) {
        Courses course = coursesRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Curso no encontrado con id: " + courseId));

        if (isCourseUsed(course, isCourseUsedByEnrollment(courseId))) {
            throw new ServicesException("Curso activo.");
        }

        coursesRepository.delete(course);
        coursesRepository.flush();
    }

    @Transactional
    public void markCourseAsEverUsed(Long courseId) {
        if (courseId == null) {
            return;
        }

        coursesRepository.findById(courseId).ifPresent(course -> {
            if (course.isEverUsed()) {
                return;
            }
            course.setEverUsed(true);
            coursesRepository.save(course);
        });
    }

    private void validatePatchKeys(Set<String> keys) {
        for (String key : keys) {
            if (!PATCHABLE_FIELDS.contains(key)) {
                throw new ServicesException("Campo no permitido en actualización parcial: " + key);
            }
        }
    }

    private void applyPatch(Courses course, Map<String, Object> changes) {
        for (Map.Entry<String, Object> entry : changes.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();

            switch (key) {
                case "url" -> course.setUrl(normalizeOptionalString(value));
                case "shortIntro" -> course.setShortIntro(normalizeOptionalString(value));
                case "category" -> course.setCategory(normalizeOptionalString(value));
                case "subCategory" -> course.setSubCategory(normalizeOptionalString(value));
                case "courseType" -> course.setCourseType(normalizeOptionalString(value));
                case "language" -> course.setLanguage(normalizeOptionalString(value));
                case "subtitleLanguages" -> course.setSubtitleLanguages(normalizeOptionalString(value));
                case "skills" -> course.setSkills(normalizeOptionalString(value));
                case "instructors" -> course.setInstructors(normalizeOptionalString(value));
                case "rating" -> course.setRating(parseFloatValue(value, "rating"));
                case "numOfViewers" -> course.setNumOfViewers(parseIntegerValue(value, "numOfViewers"));
                case "duration" -> course.setDuration(parseFloatValue(value, "duration"));
                case "site" -> {
                    // La política de administración fija SITE en COLE de forma centralizada.
                }
                default -> throw new ServicesException("Campo no permitido en actualización parcial: " + key);
            }
        }
    }

    private Set<Long> resolveUsedCourseIds(List<Courses> courses) {
        List<Long> courseIds = courses.stream()
                .map(course -> course != null ? course.getCourse_id() : null)
                .filter(Objects::nonNull)
                .filter(id -> id > 0)
                .toList();

        if (courseIds.isEmpty()) {
            return Set.of();
        }

        return new HashSet<>(enrollmentRepository.findUsedCourseIds(courseIds));
    }

    private boolean isCourseUsedByEnrollment(Long courseId) {
        if (courseId == null) {
            return false;
        }
        return enrollmentRepository.existsEnrollmentByCourseId(courseId);
    }

    private boolean isCourseUsed(Courses course, boolean usedByEnrollment) {
        return course.isEverUsed() || usedByEnrollment || course.getAssignedUser() != null;
    }

    private AdminCourseCatalogItemDTO toCatalogItem(Courses course, boolean used) {
        return new AdminCourseCatalogItemDTO(
                course.getCourse_id(),
                course.getTitle(),
                course.getUrl(),
                course.getShortIntro(),
                course.getCategory(),
                course.getSubCategory(),
                course.getCourseType(),
                course.getLanguage(),
                course.getSubtitleLanguages(),
                course.getSkills(),
                course.getInstructors(),
                course.getRating(),
                course.getNumOfViewers(),
                course.getDuration(),
                course.getSite() != null ? course.getSite() : SITE_FIXED_VALUE,
                used);
    }

    private String sanitizeRequiredTitle(String title) {
        String safeTitle = title == null ? "" : title.trim();
        if (safeTitle.isEmpty()) {
            throw new ServicesException("El título es obligatorio.");
        }

        String titleKey = normalizeTitleKey(safeTitle);
        if (titleKey.isEmpty()) {
            throw new ServicesException("El título es obligatorio.");
        }

        return safeTitle;
    }

    private String normalizeTitleKey(String title) {
        if (title == null) {
            return "";
        }
        return title
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", "")
                .trim();
    }

    private String normalizeOptionalString(Object value) {
        if (value == null) {
            return null;
        }
        if (!(value instanceof String stringValue)) {
            throw new ServicesException("Tipo de dato inválido para un campo textual.");
        }

        String trimmed = stringValue.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Float parseFloatValue(Object value, String fieldName) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number numberValue) {
            return numberValue.floatValue();
        }

        if (value instanceof String stringValue) {
            String trimmed = stringValue.trim();
            if (trimmed.isEmpty()) {
                return null;
            }

            try {
                return Float.parseFloat(trimmed);
            } catch (NumberFormatException ex) {
                throw new ServicesException("Valor numérico inválido para " + fieldName + ".");
            }
        }

        throw new ServicesException("Tipo de dato inválido para " + fieldName + ".");
    }

    private Integer parseIntegerValue(Object value, String fieldName) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number numberValue) {
            return numberValue.intValue();
        }

        if (value instanceof String stringValue) {
            String trimmed = stringValue.trim();
            if (trimmed.isEmpty()) {
                return null;
            }

            try {
                return Integer.parseInt(trimmed);
            } catch (NumberFormatException ex) {
                throw new ServicesException("Valor numérico inválido para " + fieldName + ".");
            }
        }

        throw new ServicesException("Tipo de dato inválido para " + fieldName + ".");
    }
}
