package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.AdminGlobalStatisticsDTO;
import com.cursosonline.backend.entities.AdminGlobalStatsHistory;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.repository.AdminGlobalStatsHistoryRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Suite de Pruebas Unitarias para AdminGlobalStatisticsService")
class AdminGlobalStatisticsServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private AdminGlobalStatsHistoryRepository historyRepository;

    @InjectMocks
    private AdminGlobalStatisticsService service;

    @BeforeEach
    void setUp() throws Exception {
        Field clockField = AdminGlobalStatisticsService.class.getDeclaredField("clock");
        clockField.setAccessible(true);
        clockField.set(service, Clock.fixed(Instant.parse("2026-08-03T10:00:00Z"), ZoneId.of("UTC")));
    }

    @Test
    @DisplayName("getGlobalStatistics debe reflejar el año actual en vivo y crear históricos ficticios faltantes")
    void getGlobalStatistics_DebeRetornarActualYSembrarFicticios() {
        when(userRepository.countByRoleAndEnabledTrue(Role.STUDENT)).thenReturn(120L);
        when(userRepository.countByRoleAndEnabledTrue(Role.PROFESSOR)).thenReturn(9L);
        when(enrollmentRepository.findTopCoursesByActiveStudentCount(any()))
                .thenReturn(List.of(
                        new Object[] { 10L, "Algebra", 45L },
                        new Object[] { 20L, "Historia", 30L }));

        when(historyRepository.findBySnapshotYear(2025)).thenReturn(Optional.empty());
        when(historyRepository.findBySnapshotYear(2024)).thenReturn(Optional.empty());
        when(historyRepository.findAllBySnapshotYearInWithTopCourses(List.of(2025, 2024))).thenReturn(List.of());

        AdminGlobalStatisticsDTO dto = service.getGlobalStatistics();

        assertEquals(2026, dto.currentYear());
        assertEquals(120, dto.totalStudents());
        assertEquals(9, dto.totalProfessors());
        assertEquals(2, dto.topCourses().size());
        assertEquals("Algebra", dto.topCourses().get(0).courseTitle());
        assertEquals(45, dto.topCourses().get(0).enrolledStudents());
        assertEquals(3, dto.yearlyComparisons().size());
        assertEquals(2026, dto.yearlyComparisons().get(0).year());
        assertTrue(dto.yearlyComparisons().get(0).realData());

        verify(historyRepository, times(2)).save(any(AdminGlobalStatsHistory.class));
    }

    @Test
    @DisplayName("finalizePreviousYearSnapshot debe sobrescribir histórico del año cerrado como real")
    void finalizePreviousYearSnapshot_DebePersistirDatoReal() {
        when(userRepository.countByRoleAndEnabledTrue(Role.STUDENT)).thenReturn(100L);
        when(userRepository.countByRoleAndEnabledTrue(Role.PROFESSOR)).thenReturn(7L);
        when(enrollmentRepository.findTopCoursesByActiveStudentCount(any()))
                .thenReturn(List.<Object[]>of(new Object[] { 5L, "Fisica", 28L }));

        AdminGlobalStatsHistory existing = new AdminGlobalStatsHistory();
        existing.setSnapshotYear(2025);
        existing.setRealData(false);
        when(historyRepository.findBySnapshotYear(2025)).thenReturn(Optional.of(existing));

        int finalizedYear = service.finalizePreviousYearSnapshotNow();

        ArgumentCaptor<AdminGlobalStatsHistory> captor = ArgumentCaptor.forClass(AdminGlobalStatsHistory.class);
        verify(historyRepository).save(captor.capture());

        assertEquals(2025, finalizedYear);

        AdminGlobalStatsHistory saved = captor.getValue();
        assertEquals(2025, saved.getSnapshotYear());
        assertEquals(100, saved.getTotalStudents());
        assertEquals(7, saved.getTotalProfessors());
        assertEquals(28, saved.getTopCourseEnrollment());
        assertTrue(saved.isRealData());
        assertNotNull(saved.getTopCourses());
        assertFalse(saved.getTopCourses().isEmpty());
        assertEquals("Fisica", saved.getTopCourses().get(0).getCourseTitle());
    }
}
