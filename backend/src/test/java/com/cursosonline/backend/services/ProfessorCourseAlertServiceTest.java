package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.ProfessorCourseAlertDTO;
import com.cursosonline.backend.entities.CourseMaterialDispatchConfig;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.ProfessorAlertStatus;
import com.cursosonline.backend.entities.ProfessorAlertType;
import com.cursosonline.backend.entities.ProfessorCourseAlert;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.repository.CourseMaterialDispatchConfigRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.ProfessorCourseAlertRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfessorCourseAlertServiceTest {

    @Mock
    private CourseMaterialDispatchConfigRepository configRepository;

    @Mock
    private ProfessorCourseAlertRepository alertRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @InjectMocks
    private ProfessorCourseAlertService service;

    private Courses course;
    private Users professor;
    private Users student;
    private Enrollment enrollment;

    @BeforeEach
    void setUp() {
        professor = new Users();
        professor.setUser_id(10L);
        professor.setUsername("profesor");
        professor.setRole(Role.PROFESSOR);
        professor.setEnabled(true);

        student = new Users();
        student.setUser_id(20L);
        student.setUsername("alumno");
        student.setRole(Role.STUDENT);
        student.setEnabled(true);

        course = new Courses();
        course.setCourse_id(30L);
        course.setTitle("Curso largo");
        course.setDuration(624f);
        course.setAssignedUser(professor);

        enrollment = new Enrollment();
        enrollment.setEnrollmentid(40L);
        enrollment.setUser(student);
        enrollment.setCourse(course);
        enrollment.setStatus("EN_CURSO");
        enrollment.setStarted_at(LocalDateTime.of(2026, 1, 1, 0, 0));

        ReflectionTestUtils.setField(service, "clock",
                Clock.fixed(Instant.parse("2026-01-02T00:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void createConfigForCourse_acceptsTenPartsForLongCourse() {
        when(configRepository.existsByCourseId(30L)).thenReturn(false);
        when(configRepository.save(any(CourseMaterialDispatchConfig.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CourseMaterialDispatchConfig result = service.createConfigForCourse(course, professor, 10);

        assertSame(course, result.getCourse());
        assertEquals(10, result.getDispatchParts());
        assertEquals(ProfessorCourseAlertService.DEFAULT_EXAM_THRESHOLD, result.getExamThreshold());
        verify(configRepository).save(result);
    }

    @Test
    void createConfigForCourse_rejectsInvalidInputs() {
        assertThrows(ServicesException.class, () -> service.createConfigForCourse(null, professor, 1));
        assertThrows(ServicesException.class, () -> service.createConfigForCourse(course, null, 1));

        when(configRepository.existsByCourseId(30L)).thenReturn(true);
        assertThrows(ServicesException.class, () -> service.createConfigForCourse(course, professor, 1));

        when(configRepository.existsByCourseId(30L)).thenReturn(false);
        assertThrows(ServicesException.class, () -> service.createConfigForCourse(course, professor, 11));
    }

    @Test
    void createConfigForCourse_normalizesZeroToOneAndShortCourseAllowsOnlyOne() {
        course.setDuration(9f);
        when(configRepository.existsByCourseId(30L)).thenReturn(false);
        when(configRepository.save(any(CourseMaterialDispatchConfig.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CourseMaterialDispatchConfig result = service.createConfigForCourse(course, professor, 0);

        assertEquals(1, result.getDispatchParts());
        assertThrows(ServicesException.class, () -> service.createConfigForCourse(course, professor, 2));
    }

    @Test
    void findConfigAndMissingAssignedCoursesReturnExpectedValues() {
        CourseMaterialDispatchConfig config = new CourseMaterialDispatchConfig();
        config.setCourse(course);
        config.setDispatchParts(4);
        config.setExamThreshold(new BigDecimal("90.0"));
        when(configRepository.findByCourseId(30L)).thenReturn(Optional.of(config));
        when(configRepository.existsByCourseId(30L)).thenReturn(true);
        when(configRepository.existsByCourseId(31L)).thenReturn(false);

        assertTrue(service.findConfigByCourse(30L).isPresent());
        assertEquals(List.of(31L), service.findAssignedCoursesWithoutConfig(Arrays.asList(30L, 31L, null, 0L)));
        assertEquals(List.of(), service.findAssignedCoursesWithoutConfig(List.of()));
        when(configRepository.findByCourseId(99L)).thenReturn(Optional.empty());
        assertTrue(service.findConfigByCourse(99L).isEmpty());
    }

    @Test
    void createInitialEnrollmentAlertIsIdempotentAndRequiresProfessor() {
        when(alertRepository.existsByEnrollment_EnrollmentidAndAlertTypeAndCheckpointIndex(
                40L, ProfessorAlertType.INITIAL_CONTACT, 0)).thenReturn(false);

        service.createInitialEnrollmentAlertIfApplicable(enrollment);

        verify(alertRepository).save(argThat(alert -> alert.getAlertType() == ProfessorAlertType.INITIAL_CONTACT
                && alert.getStatus() == ProfessorAlertStatus.PENDING
                && alert.getCheckpointIndex() == 0
                && alert.getMessage().contains("Curso largo")));

        when(alertRepository.existsByEnrollment_EnrollmentidAndAlertTypeAndCheckpointIndex(
                40L, ProfessorAlertType.INITIAL_CONTACT, 0)).thenReturn(true);
        service.createInitialEnrollmentAlertIfApplicable(enrollment);
        verify(alertRepository, times(1)).save(any(ProfessorCourseAlert.class));

        course.setAssignedUser(null);
        service.createInitialEnrollmentAlertIfApplicable(enrollment);
        verify(alertRepository, times(1)).save(any(ProfessorCourseAlert.class));
    }

    @Test
    void publicHelpersCalculatePartsAndCheckpoints() {
        assertEquals(1, service.suggestPartsByDuration(null));
        assertEquals(1, service.suggestPartsByDuration(10f));
        assertEquals(2, service.suggestPartsByDuration(50f));
        assertEquals(4, service.suggestPartsByDuration(150f));
        assertEquals(5, service.suggestPartsByDuration(500f));
        assertEquals(10, service.suggestPartsByDuration(624f));
        assertEquals(1, service.resolveMaxSelectableParts(9f));
        assertEquals(10, service.resolveMaxSelectableParts(624f));
        assertEquals(List.of(), service.computeIntermediateCheckpoints(1, null));
        assertEquals(List.of(new BigDecimal("30.0"), new BigDecimal("60.0")),
                service.computeIntermediateCheckpoints(3, new BigDecimal("90")));
    }

    @Test
    void scheduledGenerationCreatesIntermediateAndExamAlerts() {
        enrollment.setStarted_at(LocalDateTime.of(2025, 12, 1, 0, 0));
        CourseMaterialDispatchConfig config = new CourseMaterialDispatchConfig();
        config.setCourse(course);
        config.setDispatchParts(4);
        config.setExamThreshold(new BigDecimal("90"));
        when(configRepository.findAllByCourse_AssignedUser_IsNotNull()).thenReturn(List.of(config));
        when(enrollmentRepository.findAllByCourseId(30L)).thenReturn(List.of(enrollment));
        when(alertRepository.findByEnrollmentAndTypeAndStatuses(eq(40L), eq(ProfessorAlertType.MATERIAL_DISPATCH),
                anySet()))
                .thenReturn(List.of());
        when(alertRepository.existsByEnrollment_EnrollmentidAndAlertTypeAndCheckpointIndex(
                anyLong(), any(ProfessorAlertType.class), anyInt())).thenReturn(false);

        service.generateScheduledAlerts();

        verify(alertRepository, times(2)).save(any(ProfessorCourseAlert.class));
    }

    @Test
    void scheduledGenerationSkipsIneligibleEnrollments() {
        Enrollment cancelled = new Enrollment();
        cancelled.setEnrollmentid(41L);
        cancelled.setUser(student);
        cancelled.setCourse(course);
        cancelled.setStatus("CANCELADO");
        when(configRepository.findAllByCourse_AssignedUser_IsNotNull()).thenReturn(List.of());
        service.generateScheduledAlerts();
        verifyNoInteractions(enrollmentRepository, alertRepository);

        when(configRepository.findAllByCourse_AssignedUser_IsNotNull()).thenReturn(List.of());
        assertDoesNotThrow(() -> service.generateScheduledAlerts());
    }

    @Test
    void alertQueriesAndStatusTransitionsAreEnforced() {
        ProfessorCourseAlert alert = new ProfessorCourseAlert();
        alert.setAlertId(50L);
        alert.setProfessor(professor);
        alert.setStudent(student);
        alert.setCourse(course);
        alert.setEnrollment(enrollment);
        alert.setAlertType(ProfessorAlertType.MATERIAL_DISPATCH);
        alert.setStatus(ProfessorAlertStatus.PENDING);
        alert.setCheckpointIndex(1);
        alert.setCheckpointPercent(new BigDecimal("22.5"));
        alert.setTitle("Material");
        alert.setMessage("Enviar");
        alert.setBellDismissed(false);
        when(alertRepository.findByProfessor_UsernameOrderByCreatedAtDesc("profesor"))
                .thenReturn(List.of(alert));
        when(alertRepository.findByAlertIdAndProfessor_Username(50L, "profesor"))
                .thenReturn(Optional.of(alert));

        List<ProfessorCourseAlertDTO> alerts = service.getProfessorAlerts("profesor");
        assertEquals(1, alerts.size());
        assertEquals(50L, alerts.get(0).alertId());

        assertEquals(ProfessorAlertStatus.PENDING,
                service.updateAlertStatus("profesor", 50L, ProfessorAlertStatus.PENDING).status());
        assertEquals(ProfessorAlertStatus.VIEWED,
                service.updateAlertStatus("profesor", 50L, ProfessorAlertStatus.VIEWED).status());
        assertThrows(ServicesException.class,
                () -> service.updateAlertStatus("profesor", 50L, ProfessorAlertStatus.PENDING));
        assertThrows(ServicesException.class,
                () -> service.updateAlertStatus("profesor", 50L, null));
        when(alertRepository.findByAlertIdAndProfessor_Username(99L, "profesor"))
                .thenReturn(Optional.empty());
        assertThrows(ServicesException.class,
                () -> service.updateAlertStatus("profesor", 99L, ProfessorAlertStatus.VIEWED));

        service.dismissBellAlert("profesor", 50L);
        service.dismissBellAlert("profesor", 0L);
        verify(alertRepository).dismissBellByAlertIdAndProfessorUsername(50L, "profesor");
    }

    @Test
    void oldestBellSummaryUsesRemainingCountAndTypeTitles() {
        ProfessorCourseAlert alert = new ProfessorCourseAlert();
        alert.setAlertId(60L);
        alert.setStudent(student);
        alert.setCourse(course);
        alert.setAlertType(ProfessorAlertType.FINAL_EXAM);
        when(alertRepository.findBellPendingByProfessorUsername("profesor")).thenReturn(List.of(alert, alert));

        var summary = service.getOldestBellAlertSummary("profesor");
        assertTrue(summary.isPresent());
        assertEquals("Aviso docente: examen final", summary.get().title());
        assertEquals(1L, summary.get().remainingCountAfterThis());

        when(alertRepository.findBellPendingByProfessorUsername("profesor")).thenReturn(List.of());
        assertTrue(service.getOldestBellAlertSummary("profesor").isEmpty());
    }

    @Test
    void fallbackDismissalHandlesTypesAndNulls() {
        ProfessorCourseAlert alert = new ProfessorCourseAlert();
        alert.setAlertType(ProfessorAlertType.MATERIAL_DISPATCH);
        when(alertRepository.findBellPendingByProfessorUsername("profesor")).thenReturn(List.of(alert));

        service.dismissBellAlertByTypeFallback("profesor", ProfessorAlertType.MATERIAL_DISPATCH);
        assertTrue(alert.isBellDismissed());
        service.dismissBellAlertByTypeFallback("profesor", null);
        verify(alertRepository).save(alert);
    }

    @Test
    void resolvesOnlyOldestViewedAlertForEligibleDeliveryType() {
        ProfessorCourseAlert oldest = new ProfessorCourseAlert();
        oldest.setStatus(ProfessorAlertStatus.VIEWED);
        when(alertRepository.findOldestViewedByProfessorStudentCourseAndTypes(
                eq("profesor"), eq(20L), eq(30L), anyCollection()))
                .thenReturn(List.of(oldest));

        service.resolveOldestViewedAlertAfterSuccessfulDelivery("profesor", 20L, 30L, false);

        assertEquals(ProfessorAlertStatus.RESOLVED, oldest.getStatus());
        verify(alertRepository).save(oldest);

        reset(alertRepository);
        service.resolveOldestViewedAlertAfterSuccessfulDelivery("profesor", 20L, 30L, true);
        verify(alertRepository).findOldestViewedByProfessorStudentCourseAndTypes(
                eq("profesor"), eq(20L), eq(30L), argThat(types -> types.contains(ProfessorAlertType.FINAL_EXAM)));
        verify(alertRepository, never()).save(any());
    }
}
