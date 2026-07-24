package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.TeacherGradeRequest;
import com.cursosonline.backend.dto.StudentPerformanceDTO;
import com.cursosonline.backend.dto.CourseMetricsDTO;
import com.cursosonline.backend.entities.CourseGrade;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.CourseGradeRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.entities.Users;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/v1/teacher/evaluations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PROFESSOR')")
public class TeacherEvaluationController {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseGradeRepository courseGradeRepository;
    private final UserRepository userRepository;

    /**
     * Endpoint exclusivo para que un profesor califique a un alumno.
     * Valida estrictamente que el profesor imparte la asignatura antes de guardar
     * la nota.
     */
    @PostMapping("/submit")
    public ResponseEntity<?> gradeStudent(@RequestBody TeacherGradeRequest request, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Sesión inválida o expirada."));
        }

        String teacherUsername = principal.getName();

        // 1. BLINDAJE DE SEGURIDAD EXCLUSIVO: ¿Es este profesor el instructor real del
        // curso?
        boolean isAuthorized = enrollmentRepository.isInstructorAuthorizedForEnrollment(
                request.enrollmentId(),
                teacherUsername);

        if (!isAuthorized) {
            return ResponseEntity.status(403).body(Map.of(
                    "error",
                    "Acceso denegado: No eres el instructor asignado a esta asignatura o la matrícula no existe."));
        }

        // 2. RECUPERACIÓN Y PERSISTENCIA DE LA CALIFICACIÓN EN POSTGRESQL
        Enrollment enrollment = enrollmentRepository.findById(request.enrollmentId())
                .orElseThrow(() -> new IllegalArgumentException("Matrícula no encontrada"));

        CourseGrade newGrade = new CourseGrade();
        newGrade.setTitle(request.title());
        newGrade.setScore(request.score());
        newGrade.setFeedback(request.feedback());
        newGrade.setEnrollment(enrollment);

        courseGradeRepository.save(newGrade);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Calificación registrada con éxito por el docente autorizado."));
    }

    /**
     * [CONSOLA DOCENTE - ALUMNADO Y RENDIMIENTO]: Lista de alumnos activos del
     * curso
     * mapeados junto con su rendimiento individual frente a la media global del
     * grupo.
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
     * [CONSOLA DOCENTE - MÉTRICAS DE CALIFICACIÓN]: Proporciona indicadores
     * analíticos
     * de control y volumen total para la tercera pestaña del modal.
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
