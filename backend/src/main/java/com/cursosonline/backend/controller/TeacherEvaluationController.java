package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.TeacherGradeRequest;
import com.cursosonline.backend.dto.StudentPerformanceDTO;
import com.cursosonline.backend.dto.CourseMetricsDTO;
import com.cursosonline.backend.dto.TeacherCourseGradeDTO;
import com.cursosonline.backend.entities.CourseGrade;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.UserSystemNotification;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.CourseGradeRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.repository.UserSystemNotificationRepository;
import com.cursosonline.backend.entities.Users;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Controlador REST para gestionar las evaluaciones de los estudiantes por parte
 * de los profesores.
 * Proporciona endpoints para que los profesores puedan calificar a los
 * estudiantes.
 * TeacherEvaluationController
 */
@RestController
@RequestMapping("/api/v1/teacher/evaluations")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PROFESSOR')")
public class TeacherEvaluationController {

    private static final int MAX_FEEDBACK_LENGTH = 300;
    private static final String GRADE_PUBLISHED_TYPE = "GRADE_PUBLISHED";
    private static final String GRADE_PUBLISHED_TITLE = "Nueva nota publicada";

    private final EnrollmentRepository enrollmentRepository;
    private final CourseGradeRepository courseGradeRepository;
    private final UserRepository userRepository;
    private final UserSystemNotificationRepository userSystemNotificationRepository;

    /**
     * Endpoint POST para que un profesor califique a un estudiante en una matrícula
     * específica.
     * 
     * @param request   Objeto TeacherGradeRequest con los datos de la calificación.
     * @param principal Objeto Principal que contiene la información del profesor
     *                  autenticado.
     * @return ResponseEntity con el resultado de la operación o un mensaje de error
     *         en caso de fallo.
     */
    @PostMapping("/submit")
    public ResponseEntity<?> gradeStudent(@RequestBody TeacherGradeRequest request, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        String teacherUsername = principal.getName();

        // BLINDAJE DE SEGURIDAD EXCLUSIVO: ¿Es este profesor el instructor real del
        // curso?
        boolean isAuthorized = enrollmentRepository.isInstructorAuthorizedForEnrollment(
                request.enrollmentId(),
                teacherUsername);

        if (!isAuthorized) {
            return ResponseEntity.status(403).body(Map.of(
                    "error",
                    "Acceso denegado: No eres el instructor asignado a esta asignatura o la matrícula no existe."));
        }

        // RECUPERACIÓN Y PERSISTENCIA DE LA CALIFICACIÓN EN POSTGRESQL
        Enrollment enrollment = enrollmentRepository.findById(request.enrollmentId())
                .orElseThrow(() -> new IllegalArgumentException("Matrícula no encontrada"));

        List<CourseGrade> existingGrades = courseGradeRepository
                .findAllByEnrollmentIdOrderByGradeIdAsc(request.enrollmentId());
        String requestedTitle = request.title() != null ? request.title().trim() : "";
        if (requestedTitle.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El título de la calificación es obligatorio."));
        }

        String normalizedFeedback = normalizeFeedback(request.feedback());
        if (normalizedFeedback.length() > MAX_FEEDBACK_LENGTH) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error",
                    "La aclaración del profesor no puede superar " + MAX_FEEDBACK_LENGTH + " caracteres."));
        }

        // Nota Final de Asignatura: nota definitiva, ponderación de trabajos + examen
        // que el profesor introduce manualmente. Una vez enviada, es inmutable.
        if (isFinalCourseGradeTitle(requestedTitle)) {
            boolean alreadySubmitted = existingGrades.stream()
                    .anyMatch(grade -> grade.getTitle() != null && isFinalCourseGradeTitle(grade.getTitle()));

            if (alreadySubmitted) {
                return ResponseEntity.status(409).body(Map.of(
                        "error",
                        "La Nota Final de la Asignatura ya fue enviada. Es definitiva y no puede modificarse."));
            }

            CourseGrade finalCourseGrade = new CourseGrade();
            finalCourseGrade.setTitle(requestedTitle);
            finalCourseGrade.setScore(request.score());
            finalCourseGrade.setComments(normalizedFeedback);
            finalCourseGrade.setEnrollment(enrollment);
            courseGradeRepository.save(finalCourseGrade);
            notifyStudentGradePublished(enrollment, requestedTitle, request.score());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Nota Final de Asignatura registrada con éxito. Es definitiva."));
        }

        boolean incomingIsExam = isExamGradeTitle(requestedTitle);

        if (incomingIsExam) {
            CourseGrade existingExam = existingGrades.stream()
                    .filter(grade -> grade.getTitle() != null && isExamGradeTitle(grade.getTitle()))
                    .findFirst()
                    .orElse(null);

            if (existingExam != null) {
                existingExam.setTitle(requestedTitle);
                existingExam.setScore(request.score());
                existingExam.setComments(normalizedFeedback);
                courseGradeRepository.save(existingExam);
                notifyStudentGradePublished(enrollment, requestedTitle, request.score());

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Calificación de examen actualizada con éxito por el docente autorizado."));
            }
        }

        long sameTitleCount = existingGrades.stream()
                .filter(grade -> grade.getTitle() != null && grade.getTitle().trim().equalsIgnoreCase(requestedTitle))
                .count();

        String resolvedTitle = requestedTitle;
        if (!incomingIsExam && sameTitleCount > 0) {
            resolvedTitle = requestedTitle + " (" + (sameTitleCount + 1) + ")";
        }

        CourseGrade newGrade = new CourseGrade();
        newGrade.setTitle(resolvedTitle);
        newGrade.setScore(request.score());
        newGrade.setComments(normalizedFeedback);
        newGrade.setEnrollment(enrollment);

        courseGradeRepository.save(newGrade);
        notifyStudentGradePublished(enrollment, resolvedTitle, request.score());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Calificación registrada con éxito por el docente autorizado."));
    }

    /**
     * Endpoint GET para que un profesor obtenga las calificaciones de un estudiante
     * en una matrícula específica.
     * 
     * @param enrollmentId
     * @param principal
     * @return
     */
    @GetMapping("/enrollments/{enrollmentId}/grades")
    public ResponseEntity<?> getEnrollmentGrades(@PathVariable Long enrollmentId, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        String teacherUsername = principal.getName();
        boolean isAuthorized = enrollmentRepository.isInstructorAuthorizedForEnrollment(enrollmentId, teacherUsername);

        if (!isAuthorized) {
            return ResponseEntity.status(403).body(Map.of(
                    "error",
                    "Acceso denegado: No eres el instructor asignado a esta asignatura o la matrícula no existe."));
        }

        List<TeacherCourseGradeDTO> grades = courseGradeRepository.findAllByEnrollmentIdOrderByGradeIdAsc(enrollmentId)
                .stream()
                .map(grade -> new TeacherCourseGradeDTO(
                        grade.getGradeId(),
                        grade.getTitle(),
                        grade.getScore(),
                        grade.getComments()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(grades);
    }

    /**
     * Determina si un título de calificación corresponde a un examen o evaluación
     * final.
     * 
     * @param title
     * @return
     */
    private boolean isExamGradeTitle(String title) {
        String normalized = title.toLowerCase(Locale.ROOT);

        if (normalized.contains("trabajo")
                || normalized.contains("proyecto")
                || normalized.contains("actividad")
                || normalized.contains("práctica")
                || normalized.contains("practica")) {
            return false;
        }

        return normalized.contains("examen")
                || normalized.contains("evaluación final")
                || normalized.contains("evaluacion final")
                || normalized.equals("final");
    }

    /**
     * Determina si un título de calificación corresponde a la Nota Final de la
     * Asignatura.
     * 
     * @param title
     * @return
     */
    private boolean isFinalCourseGradeTitle(String title) {
        return title.trim().equalsIgnoreCase("Nota Final Asignatura");
    }

    private String normalizeFeedback(String feedback) {
        if (feedback == null) {
            return "";
        }
        return feedback.trim();
    }

    private void notifyStudentGradePublished(Enrollment enrollment, String gradeTitle, java.math.BigDecimal score) {
        if (enrollment == null || enrollment.getUser() == null) {
            return;
        }

        String normalizedTitle = gradeTitle == null || gradeTitle.isBlank()
                ? "Nueva calificación"
                : gradeTitle.trim();
        String normalizedScore = score != null ? score.toPlainString() : "N/A";

        UserSystemNotification notification = new UserSystemNotification();
        notification.setReceiver(enrollment.getUser());
        notification.setType(GRADE_PUBLISHED_TYPE);
        notification.setTitle(GRADE_PUBLISHED_TITLE);
        notification.setMessage("Se publicó la nota de '" + normalizedTitle + "': " + normalizedScore + " / 10.");
        notification.setRedirectUrl("/student");
        notification.setRead(false);
        userSystemNotificationRepository.save(notification);
    }

    /**
     * Endpoint GET para obtener el rendimiento de los estudiantes en un curso
     * específico.
     * 
     * @param courseId ID del curso para el cual se desea obtener el rendimiento de
     *                 los estudiantes.
     * @return ResponseEntity con la lista de StudentPerformanceDTO que contiene el
     *         rendimiento individual de los estudiantes y la media del grupo.
     */
    @GetMapping("/courses/{courseId}/management/students")
    public ResponseEntity<List<StudentPerformanceDTO>> getCourseStudentsPerformance(@PathVariable Long courseId) {
        // 1. Recuperamos matrículas activas para incluir enrollmentId real en el DTO
        List<Enrollment> activeEnrollments = enrollmentRepository.findActiveStudentEnrollmentsByCourseId(courseId);

        // 2. Calculamos de forma aislada la media aritmética general del grupo
        Double groupAvg = courseGradeRepository.getGroupAverageScore(courseId);
        double stabilizedGroupAvg = (groupAvg != null) ? groupAvg : 0.0;

        List<StudentPerformanceDTO> performanceList = new ArrayList<>();

        // 3. Procesamos a alta velocidad en memoria el rendimiento individual
        for (Enrollment enrollment : activeEnrollments) {
            Users student = enrollment.getUser();
            Double studentAvg = courseGradeRepository.getIndividualStudentAverageScore(courseId, student.getUser_id());
            double stabilizedStudentAvg = (studentAvg != null) ? studentAvg : 0.0;

            performanceList.add(new StudentPerformanceDTO(
                    enrollment.getEnrollmentid(),
                    student.getUser_id(),
                    student.getUsername(),
                    student.getEmail(),
                    stabilizedStudentAvg,
                    stabilizedGroupAvg));
        }

        return ResponseEntity.ok(performanceList);
    }

    /**
     * Endpoint GET para obtener métricas de gestión del curso, incluyendo el número
     * de estudiantes activos, la media del grupo y el número de entregas
     * pendientes.
     * 
     * @param courseId ID del curso para el cual se desean obtener las métricas de
     *                 gestión.
     * @return ResponseEntity con un CourseMetricsDTO que contiene las métricas del
     *         curso.
     */
    @GetMapping("/courses/{courseId}/management/metrics")
    public ResponseEntity<CourseMetricsDTO> getCourseManagementMetrics(@PathVariable Long courseId) {
        List<Users> activeStudents = userRepository.findActiveStudentsByCourseId(courseId);
        Double groupAvg = courseGradeRepository.getGroupAverageScore(courseId);
        double stabilizedGroupAvg = (groupAvg != null) ? groupAvg : 0.0;

        // Simulación controlada y estática de entregas pendientes para no forzar
        // dependencias externas en el pom
        long pendingSubmissions = 0L;

        return ResponseEntity.ok(new CourseMetricsDTO(
                activeStudents.size(),
                stabilizedGroupAvg,
                pendingSubmissions));
    }
}
