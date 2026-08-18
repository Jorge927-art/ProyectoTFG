package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.AdminGlobalStatisticsDTO;
import com.cursosonline.backend.entities.AdminGlobalStatsHistory;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
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
import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
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

    @Mock
    private com.cursosonline.backend.repository.AcademicEvaluationRepository academicEvaluationRepository;

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
    void searchProfessorRatingsOnlyReturnsRegisteredProfessors() {
        Users professor = new Users(7L, "profesor_real", "enc", Role.PROFESSOR, "p@test.com", true, new ArrayList<>());
        when(userRepository.findByRole(Role.PROFESSOR)).thenReturn(List.of(professor));
        when(academicEvaluationRepository.getAverageInstructorScoreByProfessorId(7L)).thenReturn(4.5);

        List<com.cursosonline.backend.dto.AdminProfessorRatingDTO> results = service.searchProfessorRatings("real");

        assertEquals(1, results.size());
        assertEquals("profesor_real", results.get(0).username());
        assertEquals(4.5, results.get(0).averageRating());
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

    @Test
    @DisplayName("getGlobalStatistics debe propagar excepción si falla la consulta de usuarios")
    void getGlobalStatistics_FalloRepositorioUsuarios_DebePropagarExcepcion() {
        when(userRepository.countByRoleAndEnabledTrue(Role.STUDENT))
                .thenThrow(new RuntimeException("db error"));

        assertThrows(RuntimeException.class, () -> service.getGlobalStatistics());
    }

    @Test
    @DisplayName("finalizePreviousYearSnapshotNow debe propagar excepción y no persistir si falla ranking")
    void finalizePreviousYearSnapshotNow_FalloRanking_DebePropagarExcepcion() {
        when(userRepository.countByRoleAndEnabledTrue(Role.STUDENT)).thenReturn(100L);
        when(userRepository.countByRoleAndEnabledTrue(Role.PROFESSOR)).thenReturn(7L);
        when(enrollmentRepository.findTopCoursesByActiveStudentCount(any()))
                .thenThrow(new RuntimeException("db error"));

        assertThrows(RuntimeException.class, () -> service.finalizePreviousYearSnapshotNow());
        verify(historyRepository, never()).save(any(AdminGlobalStatsHistory.class));
    }

    @Test
    @DisplayName("getGlobalStatistics debe normalizar valores nulos y saturar contadores fuera de rango")
    void getGlobalStatistics_DatosLimite_DebeNormalizarSnapshot() {
        when(userRepository.countByRoleAndEnabledTrue(Role.STUDENT)).thenReturn((long) Integer.MAX_VALUE + 10);
        when(userRepository.countByRoleAndEnabledTrue(Role.PROFESSOR)).thenReturn(-4L);
        List<Object[]> rows = new ArrayList<>();
        rows.add(new Object[] { null, null, null });
        rows.add(new Object[] { 3L, "Fisica", -2 });
        when(enrollmentRepository.findTopCoursesByActiveStudentCount(any())).thenReturn(rows);

        AdminGlobalStatsHistory previous = history(2025, 80, 6, 30, true);
        AdminGlobalStatsHistory older = history(2024, 70, 5, 25, false);
        when(historyRepository.findBySnapshotYear(2025)).thenReturn(Optional.of(previous));
        when(historyRepository.findBySnapshotYear(2024)).thenReturn(Optional.of(older));
        when(historyRepository.findAllBySnapshotYearInWithTopCourses(List.of(2025, 2024)))
                .thenReturn(List.of(previous, older));

        AdminGlobalStatisticsDTO dto = service.getGlobalStatistics();

        assertEquals(Integer.MAX_VALUE, dto.totalStudents());
        assertEquals(0, dto.totalProfessors());
        assertEquals(2, dto.topCourses().size());
        assertEquals("Curso sin título", dto.topCourses().get(0).courseTitle());
        assertEquals(0, dto.topCourses().get(0).enrolledStudents());
        assertEquals(30, dto.yearlyComparisons().get(1).topCourseEnrollment());
        verify(historyRepository, never()).save(any(AdminGlobalStatsHistory.class));
    }

    @Test
    @DisplayName("getGlobalStatistics debe escalar históricos ficticios y aplicar mínimos positivos")
    void getGlobalStatistics_HistoricoFicticio_DebeEscalarYConservarTopCourses() {
        when(userRepository.countByRoleAndEnabledTrue(Role.STUDENT)).thenReturn(1L);
        when(userRepository.countByRoleAndEnabledTrue(Role.PROFESSOR)).thenReturn(1L);
        when(enrollmentRepository.findTopCoursesByActiveStudentCount(any()))
                .thenReturn(List.<Object[]>of(new Object[] { 10L, "Curso mínimo", 1L }));
        when(historyRepository.findBySnapshotYear(2025)).thenReturn(Optional.empty());
        when(historyRepository.findBySnapshotYear(2024)).thenReturn(Optional.empty());
        when(historyRepository.findAllBySnapshotYearInWithTopCourses(List.of(2025, 2024)))
                .thenReturn(List.of());

        service.getGlobalStatistics();

        ArgumentCaptor<AdminGlobalStatsHistory> captor = ArgumentCaptor.forClass(AdminGlobalStatsHistory.class);
        verify(historyRepository, times(2)).save(captor.capture());
        assertEquals(List.of(2025, 2024), captor.getAllValues().stream()
                .map(history -> history.getSnapshotYear())
                .toList());
        assertTrue(captor.getAllValues().stream().allMatch(history -> !history.isRealData()));
        assertTrue(captor.getAllValues().stream().allMatch(history -> history.getTotalStudents() == 1));
        assertTrue(captor.getAllValues().stream().allMatch(history -> history.getTopCourseEnrollment() == 1));
        assertEquals(1, captor.getAllValues().get(0).getTopCourses().get(0).getEnrolledStudents());
        assertEquals(1, captor.getAllValues().get(0).getTopCourses().get(0).getRankPosition());
    }

    @Test
    @DisplayName("searchProfessorRatings debe filtrar usuarios inválidos y ordenar los resultados")
    void searchProfessorRatings_DatosInvalidos_DebeFiltrarYOrdenar() {
        Users disabled = new Users(1L, "disabled", "enc", Role.PROFESSOR, "disabled@test.com", false,
                new ArrayList<>());
        Users withoutName = new Users(2L, null, "enc", Role.PROFESSOR, "null@test.com", true, new ArrayList<>());
        Users zeta = new Users(3L, "Zeta", "enc", Role.PROFESSOR, "zeta@test.com", true, new ArrayList<>());
        Users alfa = new Users(4L, "alfa", "enc", Role.PROFESSOR, "alfa@test.com", true, new ArrayList<>());
        List<Users> professors = new ArrayList<>();
        professors.add(null);
        professors.add(disabled);
        professors.add(withoutName);
        professors.add(zeta);
        professors.add(alfa);
        when(userRepository.findByRole(Role.PROFESSOR)).thenReturn(professors);
        when(academicEvaluationRepository.getAverageInstructorScoreByProfessorId(3L)).thenReturn(3.5);
        when(academicEvaluationRepository.getAverageInstructorScoreByProfessorId(4L)).thenReturn(4.5);

        List<com.cursosonline.backend.dto.AdminProfessorRatingDTO> results = service.searchProfessorRatings(null);

        assertEquals(2, results.size());
        assertEquals("alfa", results.get(0).username());
        assertEquals("Zeta", results.get(1).username());
    }

    @Test
    @DisplayName("searchProfessorRatings debe normalizar el keyword y admitir rating sin valor")
    void searchProfessorRatings_KeywordNormalizado_DebeFiltrarSinDescartarRatingNulo() {
        Users matching = new Users(5L, "  LauraDocente  ", "enc", Role.PROFESSOR, "laura@test.com", true,
                new ArrayList<>());
        Users other = new Users(6L, "Miguel", "enc", Role.PROFESSOR, "miguel@test.com", true,
                new ArrayList<>());
        when(userRepository.findByRole(Role.PROFESSOR)).thenReturn(List.of(matching, other));
        when(academicEvaluationRepository.getAverageInstructorScoreByProfessorId(5L)).thenReturn(null);

        List<com.cursosonline.backend.dto.AdminProfessorRatingDTO> results = service.searchProfessorRatings("  LAURA ");

        assertEquals(1, results.size());
        assertEquals("  LauraDocente  ", results.get(0).username());
        assertEquals(null, results.get(0).averageRating());
    }

    @Test
    @DisplayName("getGlobalStatistics debe convertir históricos recuperados en comparativas reales")
    void getGlobalStatistics_HistoricosReales_DebeMapearComparativas() {
        when(userRepository.countByRoleAndEnabledTrue(Role.STUDENT)).thenReturn(20L);
        when(userRepository.countByRoleAndEnabledTrue(Role.PROFESSOR)).thenReturn(4L);
        when(enrollmentRepository.findTopCoursesByActiveStudentCount(any())).thenReturn(List.of());
        AdminGlobalStatsHistory previous = history(2025, 18, 3, 12, true);
        AdminGlobalStatsHistory older = history(2024, 15, 2, 9, false);
        when(historyRepository.findBySnapshotYear(2025)).thenReturn(Optional.of(previous));
        when(historyRepository.findBySnapshotYear(2024)).thenReturn(Optional.of(older));
        when(historyRepository.findAllBySnapshotYearInWithTopCourses(List.of(2025, 2024)))
                .thenReturn(List.of(previous, older));

        AdminGlobalStatisticsDTO dto = service.getGlobalStatistics();

        assertEquals(18, dto.yearlyComparisons().get(1).totalStudents());
        assertEquals(3, dto.yearlyComparisons().get(1).totalProfessors());
        assertEquals(12, dto.yearlyComparisons().get(1).topCourseEnrollment());
        assertTrue(dto.yearlyComparisons().get(1).realData());
        assertEquals(15, dto.yearlyComparisons().get(2).totalStudents());
        assertFalse(dto.yearlyComparisons().get(2).realData());
        verify(historyRepository, never()).save(any(AdminGlobalStatsHistory.class));
    }

    @Test
    @DisplayName("finalizePreviousYearSnapshotNow debe crear el histórico cuando aún no existe")
    void finalizePreviousYearSnapshotNow_SinHistorico_DebeCrearRegistro() {
        when(userRepository.countByRoleAndEnabledTrue(Role.STUDENT)).thenReturn(12L);
        when(userRepository.countByRoleAndEnabledTrue(Role.PROFESSOR)).thenReturn(2L);
        when(enrollmentRepository.findTopCoursesByActiveStudentCount(any())).thenReturn(List.of());
        when(historyRepository.findBySnapshotYear(2025)).thenReturn(Optional.empty());

        assertEquals(2025, service.finalizePreviousYearSnapshotNow());

        ArgumentCaptor<AdminGlobalStatsHistory> captor = ArgumentCaptor.forClass(AdminGlobalStatsHistory.class);
        verify(historyRepository).save(captor.capture());
        assertEquals(2025, captor.getValue().getSnapshotYear());
        assertTrue(captor.getValue().isRealData());
        assertEquals(0, captor.getValue().getTopCourseEnrollment());
        assertNotNull(captor.getValue().getTopCourses());
        assertTrue(captor.getValue().getTopCourses().isEmpty());
    }

    private AdminGlobalStatsHistory history(int year, int students, int professors, int topEnrollment, boolean real) {
        AdminGlobalStatsHistory history = new AdminGlobalStatsHistory();
        history.setSnapshotYear(year);
        history.setTotalStudents(students);
        history.setTotalProfessors(professors);
        history.setTopCourseEnrollment(topEnrollment);
        history.setRealData(real);
        return history;
    }
}
