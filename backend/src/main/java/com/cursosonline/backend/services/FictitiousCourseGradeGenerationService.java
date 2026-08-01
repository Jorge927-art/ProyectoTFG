package com.cursosonline.backend.services;

import com.cursosonline.backend.entities.CourseGrade;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.repository.CourseGradeRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.Optional;
import java.util.Set;
import java.util.LinkedHashSet;

/**
 * Genera de forma automática y definitiva las notas de examen y nota final para
 * cursos ficticios. La generación se dispara una sola vez cuando la matrícula
 * alcanza el umbral de progreso configurado.
 */
@Service
@RequiredArgsConstructor
public class FictitiousCourseGradeGenerationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(FictitiousCourseGradeGenerationService.class);

    private static final String EXAM_TITLE = "Examen final";
    private static final String FINAL_TITLE = "Nota Final Asignatura";
    private static final int TRIGGER_PROGRESS = 95;

    private final EnrollmentRepository enrollmentRepository;
    private final CourseGradeRepository courseGradeRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    /**
     * Revisa periódicamente las matrículas activas de cursos ficticios y genera
     * las dos notas definitivas cuando el progreso calculado alcanza el umbral.
     */
    @Scheduled(fixedDelayString = "${app.grades.auto-generation.interval-ms:300000}")
    public void generateGradesForEligibleEnrollments() {
        List<Enrollment> enrollments = enrollmentRepository.findActiveStudentEnrollmentsForFictitiousCourses();
        for (Enrollment enrollment : enrollments) {
            try {
                generateForEnrollmentIfNeeded(enrollment);
            } catch (RuntimeException ex) {
                Long enrollmentId = enrollment != null ? enrollment.getEnrollmentid() : null;
                LOGGER.warn("No se pudieron generar notas automáticas para la matrícula {}.", enrollmentId, ex);
            }
        }
    }

    private void generateForEnrollmentIfNeeded(Enrollment enrollment) {
        if (enrollment == null || enrollment.getEnrollmentid() == null) {
            return;
        }

        Courses course = enrollment.getCourse();
        if (!isFictitiousCourse(course)) {
            return;
        }

        int progress = userService.calculateCurrentProgress(enrollment);
        if (progress < TRIGGER_PROGRESS) {
            return;
        }

        Long enrollmentId = enrollment.getEnrollmentid();
        boolean examExists = courseGradeRepository.existsByEnrollment_EnrollmentidAndTitleIgnoreCase(enrollmentId,
                EXAM_TITLE);
        boolean finalExists = courseGradeRepository.existsByEnrollment_EnrollmentidAndTitleIgnoreCase(enrollmentId,
                FINAL_TITLE);

        if (!examExists) {
            BigDecimal examScore = generateExamScore(enrollment);
            persistGrade(enrollment, EXAM_TITLE, examScore);

            if (!finalExists) {
                BigDecimal finalScore = generateFinalScore(enrollment, examScore);
                persistGrade(enrollment, FINAL_TITLE, finalScore);
            }
            return;
        }

        if (!finalExists) {
            BigDecimal existingExam = readExistingExamScore(enrollment);
            BigDecimal finalScore = generateFinalScore(enrollment, existingExam);
            persistGrade(enrollment, FINAL_TITLE, finalScore);
        }
    }

    private boolean isFictitiousCourse(Courses course) {
        return course != null
                && course.getAssignedUser() == null
                && course.getInstructors() != null
                && !course.getInstructors().trim().isEmpty()
                && !matchesRegisteredProfessor(course.getInstructors());
    }

    private boolean matchesRegisteredProfessor(String instructors) {
        if (instructors == null || instructors.trim().isEmpty()) {
            return false;
        }

        Set<String> instructorTokens = tokenizeInstructors(instructors);
        if (instructorTokens.isEmpty()) {
            return false;
        }

        List<Users> professors = userRepository.findByRole(Role.PROFESSOR);

        for (Users professor : professors) {
            for (String alias : buildProfessorAliases(professor)) {
                if (instructorTokens.contains(alias)) {
                    return true;
                }
            }
        }

        return false;
    }

    private Set<String> tokenizeInstructors(String instructors) {
        Set<String> tokens = new LinkedHashSet<>();
        String[] parts = instructors.split(",");
        for (String part : parts) {
            String normalized = normalize(part);
            if (!normalized.isEmpty()) {
                tokens.add(normalized);
            }
        }
        return tokens;
    }

    private List<String> buildProfessorAliases(Users professor) {
        if (professor == null) {
            return List.of();
        }

        List<String> aliases = new java.util.ArrayList<>();
        addAlias(aliases, professor.getUsername());
        addAlias(aliases, professor.getEmail());

        String email = professor.getEmail();
        if (email != null) {
            int atIndex = email.indexOf('@');
            if (atIndex > 0) {
                addAlias(aliases, email.substring(0, atIndex));
            }
        }

        splitAndAddTokens(aliases, professor.getUsername());
        splitAndAddTokens(aliases, professor.getEmail());

        return aliases;
    }

    private void splitAndAddTokens(List<String> aliases, String rawValue) {
        if (rawValue == null) {
            return;
        }

        String[] parts = rawValue.split("[\\s._@-]+");
        for (String part : parts) {
            addAlias(aliases, part);
        }
    }

    private void addAlias(List<String> aliases, String rawAlias) {
        if (rawAlias == null) {
            return;
        }

        String normalized = normalize(rawAlias);
        if (normalized.length() >= 3) {
            aliases.add(normalized);
        }
    }

    private String normalize(String rawValue) {
        return rawValue.trim().toLowerCase(Locale.ROOT);
    }

    private BigDecimal readExistingExamScore(Enrollment enrollment) {
        Optional<CourseGrade> storedExam = courseGradeRepository
                .findFirstByEnrollment_EnrollmentidAndTitleIgnoreCase(enrollment.getEnrollmentid(), EXAM_TITLE);
        if (storedExam.isPresent() && storedExam.get().getScore() != null) {
            return storedExam.get().getScore();
        }

        return generateExamScore(enrollment);
    }

    private void persistGrade(Enrollment enrollment, String title, BigDecimal score) {
        CourseGrade grade = new CourseGrade();
        grade.setEnrollment(enrollment);
        grade.setTitle(title);
        grade.setScore(score);
        grade.setFeedback(null);
        courseGradeRepository.save(grade);
    }

    private BigDecimal generateExamScore(Enrollment enrollment) {
        Random random = new Random(buildSeed(enrollment, 0x45d9f3bL));
        double score = sampleBeta(random, 5.2, 3.4) * 10.0;
        return normalizeScore(score);
    }

    private BigDecimal generateFinalScore(Enrollment enrollment, BigDecimal examScore) {
        double normalizedExam = clamp(examScore != null ? examScore.doubleValue() / 10.0 : 0.0, 0.0, 1.0);
        Random random = new Random(buildSeed(enrollment, 0x9e3779b97f4a7c15L));
        double alpha = 2.0 + (normalizedExam * 28.0);
        double beta = 2.0 + ((1.0 - normalizedExam) * 28.0);
        double score = sampleBeta(random, alpha, beta) * 10.0;
        return normalizeScore(score);
    }

    private long buildSeed(Enrollment enrollment, long salt) {
        long enrollmentId = enrollment.getEnrollmentid() != null ? enrollment.getEnrollmentid() : 0L;
        long courseId = enrollment.getCourse() != null && enrollment.getCourse().getCourse_id() != null
                ? enrollment.getCourse().getCourse_id()
                : 0L;
        long seed = enrollmentId * 31L + courseId * 17L + salt;
        return seed ^ Long.rotateLeft(seed, 21);
    }

    private BigDecimal normalizeScore(double score) {
        double bounded = clamp(score, 0.0, 10.0);
        return BigDecimal.valueOf(bounded).setScale(1, RoundingMode.HALF_UP);
    }

    private double sampleBeta(Random random, double alpha, double beta) {
        double x = sampleGamma(random, alpha);
        double y = sampleGamma(random, beta);
        if (x + y == 0.0) {
            return 0.5;
        }
        return x / (x + y);
    }

    private double sampleGamma(Random random, double shape) {
        if (shape <= 0.0) {
            throw new IllegalArgumentException("La forma de la distribución Gamma debe ser positiva.");
        }

        if (shape < 1.0) {
            return sampleGamma(random, shape + 1.0) * Math.pow(random.nextDouble(), 1.0 / shape);
        }

        double d = shape - (1.0 / 3.0);
        double c = 1.0 / Math.sqrt(9.0 * d);

        while (true) {
            double x = random.nextGaussian();
            double v = 1.0 + (c * x);
            if (v <= 0.0) {
                continue;
            }

            v = v * v * v;
            double u = random.nextDouble();

            if (u < 1.0 - 0.0331 * Math.pow(x, 4)) {
                return d * v;
            }

            if (Math.log(u) < 0.5 * x * x + d * (1.0 - v + Math.log(v))) {
                return d * v;
            }
        }
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}