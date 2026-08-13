package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.CourseDispatchConfigDTO;
import com.cursosonline.backend.dto.ProfessorBellAlertSummaryDTO;
import com.cursosonline.backend.dto.ProfessorCourseAlertDTO;
import com.cursosonline.backend.entities.CourseMaterialDispatchConfig;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.ProfessorAlertStatus;
import com.cursosonline.backend.entities.ProfessorAlertType;
import com.cursosonline.backend.entities.ProfessorCourseAlert;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.repository.CourseMaterialDispatchConfigRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.ProfessorCourseAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProfessorCourseAlertService {

    public static final BigDecimal DEFAULT_EXAM_THRESHOLD = new BigDecimal("90.0");

    private final CourseMaterialDispatchConfigRepository configRepository;
    private final ProfessorCourseAlertRepository alertRepository;
    private final EnrollmentRepository enrollmentRepository;
    private Clock clock = Clock.systemUTC();

    @Transactional
    public CourseMaterialDispatchConfig createConfigForCourse(Courses course, Users professor, int requestedParts) {
        if (course == null || course.getCourse_id() == null) {
            throw new ServicesException("No se puede configurar avisos para un curso inexistente.");
        }
        if (professor == null || professor.getUser_id() == null) {
            throw new ServicesException("No se puede configurar avisos sin profesor válido.");
        }
        if (configRepository.existsByCourseId(course.getCourse_id())) {
            throw new ServicesException(
                    "Este curso ya tiene una configuración de avisos guardada y no puede modificarse.");
        }

        int maxParts = resolveMaxSelectableParts(course.getDuration());
        int safeParts = requestedParts;
        if (safeParts < 1) {
            safeParts = 1;
        }
        if (safeParts > maxParts) {
            throw new ServicesException("El número de partes seleccionado no es válido para la duración del curso.");
        }

        CourseMaterialDispatchConfig config = new CourseMaterialDispatchConfig();
        config.setCourse(course);
        config.setDispatchParts(safeParts);
        config.setExamThreshold(DEFAULT_EXAM_THRESHOLD);
        config.setCreatedBy(professor);
        return configRepository.save(config);
    }

    @Transactional(readOnly = true)
    public Optional<CourseDispatchConfigDTO> findConfigByCourse(Long courseId) {
        return configRepository.findByCourseId(courseId)
                .map(this::toConfigDTO);
    }

    @Transactional(readOnly = true)
    public List<Long> findAssignedCoursesWithoutConfig(List<Long> assignedCourseIds) {
        if (assignedCourseIds == null || assignedCourseIds.isEmpty()) {
            return List.of();
        }

        List<Long> missing = new ArrayList<>();
        for (Long courseId : assignedCourseIds) {
            if (courseId == null || courseId <= 0) {
                continue;
            }
            if (!configRepository.existsByCourseId(courseId)) {
                missing.add(courseId);
            }
        }
        return missing;
    }

    @Transactional
    public void createInitialEnrollmentAlertIfApplicable(Enrollment enrollment) {
        if (enrollment == null || enrollment.getEnrollmentid() == null || enrollment.getCourse() == null
                || enrollment.getUser() == null) {
            return;
        }

        Courses course = enrollment.getCourse();
        Users professor = course.getAssignedUser();
        if (professor == null) {
            return;
        }

        if (alertRepository.existsByEnrollment_EnrollmentidAndAlertTypeAndCheckpointIndex(
                enrollment.getEnrollmentid(), ProfessorAlertType.INITIAL_CONTACT, 0)) {
            return;
        }

        ProfessorCourseAlert alert = new ProfessorCourseAlert();
        alert.setProfessor(professor);
        alert.setStudent(enrollment.getUser());
        alert.setCourse(course);
        alert.setEnrollment(enrollment);
        alert.setAlertType(ProfessorAlertType.INITIAL_CONTACT);
        alert.setCheckpointIndex(0);
        alert.setCheckpointPercent(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        alert.setStatus(ProfessorAlertStatus.PENDING);
        alert.setBellDismissed(false);
        alert.setTitle("Contacto inicial obligatorio");
        alert.setMessage("Alumno " + enrollment.getUser().getUsername() + " matriculado en \""
                + safeCourseTitle(course) + "\": contacta y envía la documentación inicial.");
        alertRepository.save(alert);
    }

    @Scheduled(fixedDelayString = "${app.professor-alerts.interval-ms:300000}")
    @Transactional
    public void generateScheduledAlerts() {
        List<CourseMaterialDispatchConfig> configs = configRepository.findAllByCourse_AssignedUser_IsNotNull();
        for (CourseMaterialDispatchConfig config : configs) {
            Courses course = config.getCourse();
            if (course == null || course.getCourse_id() == null || course.getAssignedUser() == null) {
                continue;
            }

            if (course.getDuration() == null || course.getDuration() <= 0) {
                continue;
            }

            List<Enrollment> enrollments = enrollmentRepository.findAllByCourseId(course.getCourse_id());
            for (Enrollment enrollment : enrollments) {
                if (!isEnrollmentEligible(enrollment)) {
                    continue;
                }

                int progress = calculateCurrentProgress(enrollment);
                maybeCreateExamAlert(config, enrollment, progress);
                maybeCreateIntermediateAlert(config, enrollment, progress);
            }
        }
    }

    private int calculateCurrentProgress(Enrollment enrollment) {
        if (enrollment == null || enrollment.getStarted_at() == null || enrollment.getCourse() == null
                || enrollment.getCourse().getDuration() == null) {
            return 0;
        }

        double totalHours = enrollment.getCourse().getDuration().doubleValue();
        if (totalHours <= 0) {
            return 0;
        }

        long minutesElapsed = Duration.between(enrollment.getStarted_at(), LocalDateTime.now(clock)).toMinutes();
        double totalMinutes = totalHours * 60.0;
        double progress = (minutesElapsed * 100.0) / totalMinutes;

        return (int) Math.max(0, Math.min(100, Math.floor(progress)));
    }

    @Transactional(readOnly = true)
    public Optional<ProfessorBellAlertSummaryDTO> getOldestBellAlertSummary(String professorUsername) {
        List<ProfessorCourseAlert> pending = alertRepository.findBellPendingByProfessorUsername(professorUsername);
        if (pending.isEmpty()) {
            return Optional.empty();
        }

        ProfessorCourseAlert first = pending.get(0);
        long remaining = Math.max(0, pending.size() - 1L);

        String title = switch (first.getAlertType()) {
            case FINAL_EXAM -> "Aviso docente: examen final";
            case MATERIAL_DISPATCH -> "Aviso docente: envío de material";
            case INITIAL_CONTACT -> "Aviso docente: contacto inicial";
        };

        StringBuilder message = new StringBuilder();
        message.append(first.getStudent().getUsername())
                .append(" · ")
                .append(safeCourseTitle(first.getCourse()));
        if (remaining > 0) {
            message.append(" · Quedan ").append(remaining).append(" aviso(s) por ver");
        }

        return Optional.of(new ProfessorBellAlertSummaryDTO(first.getAlertId(), title, message.toString(), remaining));
    }

    @Transactional(readOnly = true)
    public List<ProfessorCourseAlertDTO> getProfessorAlerts(String professorUsername) {
        return alertRepository.findByProfessor_UsernameOrderByCreatedAtDesc(professorUsername)
                .stream()
                .map(this::toAlertDTO)
                .toList();
    }

    @Transactional
    public ProfessorCourseAlertDTO updateAlertStatus(String professorUsername, Long alertId,
            ProfessorAlertStatus nextStatus) {
        ProfessorCourseAlert alert = alertRepository.findByAlertIdAndProfessor_Username(alertId, professorUsername)
                .orElseThrow(() -> new ServicesException("Aviso docente no encontrado para el profesor autenticado."));

        if (nextStatus == null) {
            throw new ServicesException("Debes indicar un estado válido para el aviso.");
        }

        ProfessorAlertStatus current = alert.getStatus();
        if (!isValidForwardTransition(current, nextStatus)) {
            throw new ServicesException(
                    "Transición de estado inválida. El flujo permitido es pendiente -> visto -> resuelto.");
        }

        alert.setStatus(nextStatus);
        alertRepository.save(alert);
        return toAlertDTO(alert);
    }

    @Transactional
    public void dismissBellAlert(String professorUsername, Long alertId) {
        if (alertId == null || alertId <= 0) {
            return;
        }
        alertRepository.dismissBellByAlertIdAndProfessorUsername(alertId, professorUsername);
    }

    @Transactional
    public void dismissBellAlertByTypeFallback(String professorUsername, ProfessorAlertType alertType) {
        if (alertType == null) {
            return;
        }
        List<ProfessorCourseAlert> pending = alertRepository.findBellPendingByProfessorUsername(professorUsername);
        for (ProfessorCourseAlert alert : pending) {
            if (alert.getAlertType() == alertType) {
                alert.setBellDismissed(true);
                alertRepository.save(alert);
                return;
            }
        }
    }

    public int suggestPartsByDuration(Float durationHours) {
        if (durationHours == null || durationHours <= 0f) {
            return 1;
        }
        if (durationHours <= 10f) {
            return 1;
        }
        if (durationHours <= 50f) {
            return 2;
        }
        if (durationHours <= 150f) {
            return 4;
        }
        if (durationHours <= 500f) {
            return 5;
        }
        return 10;
    }

    public int resolveMaxSelectableParts(Float durationHours) {
        if (durationHours != null && durationHours > 0f && durationHours < 10f) {
            return 1;
        }
        return 10;
    }

    public List<BigDecimal> computeIntermediateCheckpoints(int parts, BigDecimal examThreshold) {
        if (parts <= 1) {
            return List.of();
        }

        BigDecimal threshold = examThreshold != null ? examThreshold : DEFAULT_EXAM_THRESHOLD;
        BigDecimal step = threshold.divide(BigDecimal.valueOf(parts), 4, RoundingMode.HALF_UP);

        List<BigDecimal> checkpoints = new ArrayList<>();
        for (int i = 1; i < parts; i++) {
            BigDecimal value = step.multiply(BigDecimal.valueOf(i)).setScale(1, RoundingMode.HALF_UP);
            checkpoints.add(value);
        }
        return checkpoints;
    }

    private void maybeCreateIntermediateAlert(CourseMaterialDispatchConfig config, Enrollment enrollment,
            int progress) {
        int parts = config.getDispatchParts();
        if (parts <= 1) {
            return;
        }

        List<ProfessorCourseAlert> unresolved = alertRepository.findByEnrollmentAndTypeAndStatuses(
                enrollment.getEnrollmentid(),
                ProfessorAlertType.MATERIAL_DISPATCH,
                EnumSet.of(ProfessorAlertStatus.PENDING, ProfessorAlertStatus.VIEWED));

        if (!unresolved.isEmpty()) {
            return;
        }

        List<BigDecimal> checkpoints = computeIntermediateCheckpoints(parts, config.getExamThreshold());
        for (int i = 0; i < checkpoints.size(); i++) {
            int checkpointIndex = i + 1;
            BigDecimal checkpoint = checkpoints.get(i);
            if (progress < checkpoint.doubleValue()) {
                continue;
            }
            if (alertRepository.existsByEnrollment_EnrollmentidAndAlertTypeAndCheckpointIndex(
                    enrollment.getEnrollmentid(), ProfessorAlertType.MATERIAL_DISPATCH, checkpointIndex)) {
                continue;
            }

            ProfessorCourseAlert alert = new ProfessorCourseAlert();
            alert.setProfessor(config.getCourse().getAssignedUser());
            alert.setStudent(enrollment.getUser());
            alert.setCourse(config.getCourse());
            alert.setEnrollment(enrollment);
            alert.setAlertType(ProfessorAlertType.MATERIAL_DISPATCH);
            alert.setCheckpointIndex(checkpointIndex);
            alert.setCheckpointPercent(checkpoint.setScale(2, RoundingMode.HALF_UP));
            alert.setStatus(ProfessorAlertStatus.PENDING);
            alert.setBellDismissed(false);
            alert.setTitle("Enviar siguiente parte del temario");
            alert.setMessage("Alumno " + enrollment.getUser().getUsername() + " en \""
                    + safeCourseTitle(config.getCourse()) + "\" ha alcanzado el "
                    + checkpoint.stripTrailingZeros().toPlainString()
                    + "% de progreso. Debes enviar la siguiente parte del material.");
            alertRepository.save(alert);
            return;
        }
    }

    private void maybeCreateExamAlert(CourseMaterialDispatchConfig config, Enrollment enrollment, int progress) {
        if (progress < 90) {
            return;
        }

        int examCheckpointIndex = Math.max(1, config.getDispatchParts());
        if (alertRepository.existsByEnrollment_EnrollmentidAndAlertTypeAndCheckpointIndex(
                enrollment.getEnrollmentid(), ProfessorAlertType.FINAL_EXAM, examCheckpointIndex)) {
            return;
        }

        ProfessorCourseAlert alert = new ProfessorCourseAlert();
        alert.setProfessor(config.getCourse().getAssignedUser());
        alert.setStudent(enrollment.getUser());
        alert.setCourse(config.getCourse());
        alert.setEnrollment(enrollment);
        alert.setAlertType(ProfessorAlertType.FINAL_EXAM);
        alert.setCheckpointIndex(examCheckpointIndex);
        alert.setCheckpointPercent(DEFAULT_EXAM_THRESHOLD.setScale(2, RoundingMode.HALF_UP));
        alert.setStatus(ProfessorAlertStatus.PENDING);
        alert.setBellDismissed(false);
        alert.setTitle("Preparar examen final");
        alert.setMessage("Alumno " + enrollment.getUser().getUsername() + " en \""
                + safeCourseTitle(config.getCourse())
                + "\" ha alcanzado el 90% de progreso. Debes preparar el examen final.");
        alertRepository.save(alert);
    }

    private boolean isEnrollmentEligible(Enrollment enrollment) {
        if (enrollment == null || enrollment.getEnrollmentid() == null || enrollment.getUser() == null) {
            return false;
        }

        if (!enrollment.getUser().isEnabled()) {
            return false;
        }

        String status = enrollment.getStatus();
        if (status == null) {
            return true;
        }

        String normalized = status.trim().toUpperCase();
        return !"CANCELADO".equals(normalized) && !"COMPLETADO".equals(normalized);
    }

    private boolean isValidForwardTransition(ProfessorAlertStatus current, ProfessorAlertStatus next) {
        if (current == next) {
            return true;
        }
        if (current == ProfessorAlertStatus.PENDING && next == ProfessorAlertStatus.VIEWED) {
            return true;
        }
        return current == ProfessorAlertStatus.VIEWED && next == ProfessorAlertStatus.RESOLVED;
    }

    private CourseDispatchConfigDTO toConfigDTO(CourseMaterialDispatchConfig config) {
        return new CourseDispatchConfigDTO(
                config.getCourse().getCourse_id(),
                config.getDispatchParts(),
                config.getExamThreshold(),
                computeIntermediateCheckpoints(config.getDispatchParts(), config.getExamThreshold()));
    }

    private ProfessorCourseAlertDTO toAlertDTO(ProfessorCourseAlert alert) {
        return new ProfessorCourseAlertDTO(
                alert.getAlertId(),
                alert.getAlertType(),
                alert.getStatus(),
                alert.getCheckpointIndex(),
                alert.getCheckpointPercent(),
                alert.getCourse().getCourse_id(),
                safeCourseTitle(alert.getCourse()),
                alert.getStudent().getUser_id(),
                alert.getStudent().getUsername(),
                alert.getTitle(),
                alert.getMessage(),
                alert.getCreatedAt(),
                alert.isBellDismissed());
    }

    private String safeCourseTitle(Courses course) {
        if (course == null || course.getTitle() == null || course.getTitle().isBlank()) {
            return "Curso";
        }
        return course.getTitle().trim();
    }
}
