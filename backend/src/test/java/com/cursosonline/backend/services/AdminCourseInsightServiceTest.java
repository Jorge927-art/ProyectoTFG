package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.AdminCourseDetailDTO;
import com.cursosonline.backend.dto.AdminCourseSearchResultDTO;
import com.cursosonline.backend.dto.AdminCourseUserStatsDTO;
import com.cursosonline.backend.entities.*;
import com.cursosonline.backend.exception.ResourceNotFoundException;
import com.cursosonline.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Suite de Pruebas Unitarias para AdminCourseInsightService")
class AdminCourseInsightServiceTest {

    @Mock
    private CoursesRepository coursesRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserService userService;

    @Mock
    private CourseGradeRepository courseGradeRepository;

    @Mock
    private AcademicEvaluationRepository academicEvaluationRepository;

    @InjectMocks
    private AdminCourseInsightService adminCourseInsightService;

    private Users studentUser;
    private Users professorUser;
    private Courses course;

    @BeforeEach
    void setUp() {
        studentUser = new Users(10L, "laura_student", "enc", Role.STUDENT, "laura@a.com", true, new ArrayList<>());
        professorUser = new Users(20L, "laura_teacher", "enc", Role.PROFESSOR, "laura.t@a.com", true,
                new ArrayList<>());

        course = new Courses();
        course.setCourse_id(300L);
        course.setTitle("Arquitectura de Software");
        course.setCategory("Ingenieria");
    }

    /*
     * =========================================================================
     * 1. VERIFICACIÓN: searchCourses
     * =========================================================================
     */
    @Test
    @DisplayName("searchCourses debe devolver lista vacía si el keyword es nulo o está en blanco")
    void searchCourses_ConKeywordVacio_DebeRetornarListaVacia() {
        assertTrue(adminCourseInsightService.searchCourses("").isEmpty());
        assertTrue(adminCourseInsightService.searchCourses("   ").isEmpty());
        assertTrue(adminCourseInsightService.searchCourses(null).isEmpty());
    }

    @Test
    @DisplayName("searchCourses debe mapear los cursos encontrados al DTO ligero")
    void searchCourses_DebeMapearResultadosCorrectamente() {
        when(coursesRepository.searchCoursesPredictive(anyString(), anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(course)));

        List<AdminCourseSearchResultDTO> result = adminCourseInsightService.searchCourses("Arquitectura");

        assertEquals(1, result.size());
        assertEquals(300L, result.get(0).courseId());
        assertEquals("Arquitectura de Software", result.get(0).title());
        assertEquals("Ingenieria", result.get(0).category());
    }

    /*
     * =========================================================================
     * 2. VERIFICACIÓN: getCourseDetail
     * =========================================================================
     */
    @Test
    @DisplayName("getCourseDetail debe lanzar ResourceNotFoundException si el curso no existe")
    void getCourseDetail_CursoNoEncontrado_DebeLanzarExcepcion() {
        when(coursesRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> adminCourseInsightService.getCourseDetail(999L));
    }

    @Test
    @DisplayName("getCourseDetail debe incluir al profesor asignado y a los alumnos inscritos")
    void getCourseDetail_ConProfesorAsignado_DebeIncluirloEnElDTO() {
        course.setAssignedUser(professorUser);
        when(coursesRepository.findById(300L)).thenReturn(Optional.of(course));

        Enrollment enrollment = new Enrollment();
        enrollment.setUser(studentUser);
        when(enrollmentRepository.findAllByCourseId(300L)).thenReturn(List.of(enrollment));

        AdminCourseDetailDTO detail = adminCourseInsightService.getCourseDetail(300L);

        assertNotNull(detail.professor());
        assertEquals("laura_teacher", detail.professor().username());
        assertEquals(1, detail.students().size());
        assertEquals("laura_student", detail.students().get(0).username());
    }

    @Test
    @DisplayName("getCourseDetail debe devolver professor=null si el curso no tiene profesor asignado")
    void getCourseDetail_SinProfesorAsignado_DebeDevolverProfesorNull() {
        when(coursesRepository.findById(300L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.findAllByCourseId(300L)).thenReturn(List.of());

        AdminCourseDetailDTO detail = adminCourseInsightService.getCourseDetail(300L);

        assertNull(detail.professor());
        assertTrue(detail.students().isEmpty());
    }

    /*
     * =========================================================================
     * 3. VERIFICACIÓN: getUserStatsInCourse
     * =========================================================================
     */
    @Test
    @DisplayName("getUserStatsInCourse debe lanzar ResourceNotFoundException si el curso no existe")
    void getUserStatsInCourse_CursoNoEncontrado_DebeLanzarExcepcion() {
        when(coursesRepository.existsById(999L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class,
                () -> adminCourseInsightService.getUserStatsInCourse(999L, 10L));
    }

    @Test
    @DisplayName("getUserStatsInCourse debe lanzar ResourceNotFoundException si el usuario no existe")
    void getUserStatsInCourse_UsuarioNoEncontrado_DebeLanzarExcepcion() {
        when(coursesRepository.existsById(300L)).thenReturn(true);
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> adminCourseInsightService.getUserStatsInCourse(300L, 999L));
    }

    @Test
    @DisplayName("getUserStatsInCourse (PROFESSOR) debe omitir progreso individual y notas, pero incluir las métricas colectivas")
    void getUserStatsInCourse_CasoProfesor_DebeOmitirProgresoYNotas() {
        when(coursesRepository.existsById(300L)).thenReturn(true);
        when(userRepository.findById(20L)).thenReturn(Optional.of(professorUser));
        Enrollment activeEnrollment = new Enrollment();
        when(enrollmentRepository.findActiveStudentEnrollmentsByCourseId(300L)).thenReturn(List.of(activeEnrollment));
        when(userService.calculateCurrentProgress(activeEnrollment)).thenReturn(72);
        when(enrollmentRepository.findAllByCourseId(300L)).thenReturn(List.of(new Enrollment(), new Enrollment()));
        when(courseGradeRepository.countStudentsWithPassingGradeByCourseId(300L)).thenReturn(1L);
        when(academicEvaluationRepository.getAverageCourseScoreByCourseIds(List.of(300L))).thenReturn(4.5);
        when(academicEvaluationRepository.getAverageInstructorScoreByCourseIds(List.of(300L))).thenReturn(4.8);

        AdminCourseUserStatsDTO stats = adminCourseInsightService.getUserStatsInCourse(300L, 20L);

        assertEquals(1, stats.activeStudentsInCourse());
        assertNull(stats.studentProgressPercentage(), "El profesor no debe tener progreso individual");
        assertEquals(72, stats.courseAverageProgressPercentage());
        assertTrue(stats.studentGrades().isEmpty(), "El profesor no debe tener notas");
        assertEquals(50, stats.completionRatePercentage(), "1 de 2 matrículas aprobadas = 50%");
        assertEquals(4.5, stats.averageCourseRating());
        assertEquals(4.8, stats.averageInstructorRating());

        // Verificación explícita de que NO se consultó la matrícula individual del
        // profesor
        org.mockito.Mockito.verify(enrollmentRepository, org.mockito.Mockito.never())
                .findByUserIdAndCourseId(anyLong(), anyLong());
    }

    @Test
    @DisplayName("getUserStatsInCourse (STUDENT) debe incluir progreso individual y notas")
    void getUserStatsInCourse_CasoAlumno_DebeIncluirProgresoYNotas() {
        when(coursesRepository.existsById(300L)).thenReturn(true);
        when(userRepository.findById(10L)).thenReturn(Optional.of(studentUser));
        when(enrollmentRepository.findAllByCourseId(300L)).thenReturn(List.of(new Enrollment()));
        when(courseGradeRepository.countStudentsWithPassingGradeByCourseId(300L)).thenReturn(1L);
        when(academicEvaluationRepository.getAverageCourseScoreByCourseIds(List.of(300L))).thenReturn(null);
        when(academicEvaluationRepository.getAverageInstructorScoreByCourseIds(List.of(300L))).thenReturn(null);

        Enrollment enrollment = new Enrollment();
        enrollment.setUser(studentUser);
        enrollment.setCourse(course);
        CourseGrade grade = new CourseGrade();
        grade.setTitle("Examen Final");
        grade.setScore(new BigDecimal("8.5"));
        enrollment.setGrades(List.of(grade));

        Enrollment activeEnrollment = new Enrollment();
        when(enrollmentRepository.findActiveStudentEnrollmentsByCourseId(300L)).thenReturn(List.of(activeEnrollment));

        when(enrollmentRepository.findByUserIdAndCourseId(10L, 300L)).thenReturn(Optional.of(enrollment));
        when(userService.calculateCurrentProgress(activeEnrollment)).thenReturn(60);
        when(userService.calculateCurrentProgress(enrollment)).thenReturn(65);

        AdminCourseUserStatsDTO stats = adminCourseInsightService.getUserStatsInCourse(300L, 10L);

        assertEquals(1, stats.activeStudentsInCourse());
        assertEquals(65, stats.studentProgressPercentage());
        assertEquals(60, stats.courseAverageProgressPercentage());
        assertEquals(1, stats.studentGrades().size());
        assertEquals("Examen Final", stats.studentGrades().get(0).title());
        assertEquals(new BigDecimal("8.5"), stats.studentGrades().get(0).score());
        assertEquals(100, stats.completionRatePercentage(), "1 de 1 matrícula aprobada = 100%");
        assertNull(stats.averageCourseRating(), "Sin valoraciones aún -> null");
        assertNull(stats.averageInstructorRating(), "Sin valoraciones aún -> null");
    }

    @Test
    @DisplayName("getUserStatsInCourse debe lanzar ResourceNotFoundException si el alumno no está matriculado en ese curso")
    void getUserStatsInCourse_AlumnoNoMatriculado_DebeLanzarExcepcion() {
        when(coursesRepository.existsById(300L)).thenReturn(true);
        when(userRepository.findById(10L)).thenReturn(Optional.of(studentUser));
        when(enrollmentRepository.findActiveStudentEnrollmentsByCourseId(300L)).thenReturn(List.of());
        when(enrollmentRepository.findByUserIdAndCourseId(10L, 300L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> adminCourseInsightService.getUserStatsInCourse(300L, 10L));
    }

    @Test
    @DisplayName("completionRatePercentage debe devolver 0 si el curso no tiene ningún alumno inscrito, sin dividir por cero")
    void getUserStatsInCourse_SinAlumnosInscritos_TasaDeFinalizacionDebeSerCero() {
        when(coursesRepository.existsById(300L)).thenReturn(true);
        when(userRepository.findById(20L)).thenReturn(Optional.of(professorUser));
        when(enrollmentRepository.findActiveStudentEnrollmentsByCourseId(300L)).thenReturn(List.of());
        when(enrollmentRepository.findAllByCourseId(300L)).thenReturn(List.of());
        when(academicEvaluationRepository.getAverageCourseScoreByCourseIds(List.of(300L))).thenReturn(null);
        when(academicEvaluationRepository.getAverageInstructorScoreByCourseIds(List.of(300L))).thenReturn(null);

        AdminCourseUserStatsDTO stats = adminCourseInsightService.getUserStatsInCourse(300L, 20L);

        assertEquals(0, stats.completionRatePercentage());
        assertEquals(0, stats.courseAverageProgressPercentage());
        org.mockito.Mockito.verify(courseGradeRepository, org.mockito.Mockito.never())
                .countStudentsWithPassingGradeByCourseId(anyLong());
    }
}