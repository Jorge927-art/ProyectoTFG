package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.AdminCourseCatalogItemDTO;
import com.cursosonline.backend.dto.AdminCourseCreateRequestDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ResourceNotFoundException;
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Suite de Pruebas Unitarias para AdminCourseCatalogService")
class AdminCourseCatalogServiceTest {

    @Mock
    private CoursesRepository coursesRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @InjectMocks
    private AdminCourseCatalogService adminCourseCatalogService;

    @Test
    @DisplayName("getAdminCourseCatalog devuelve lista vacía cuando no hay cursos")
    void getAdminCourseCatalog_WhenEmpty_ShouldReturnEmptyList() {
        when(coursesRepository.findAllByOrderByTitleAsc()).thenReturn(List.of());

        List<AdminCourseCatalogItemDTO> result = adminCourseCatalogService.getAdminCourseCatalog();

        assertTrue(result.isEmpty());
        verify(enrollmentRepository, never()).findUsedCourseIds(anyList());
    }

    @Test
    @DisplayName("getAdminCourseCatalog resuelve correctamente cursos usados y no usados")
    void getAdminCourseCatalog_ShouldResolveUsedFlags() {
        Courses byEnrollment = new Courses();
        byEnrollment.setCourse_id(1L);
        byEnrollment.setTitle("Algoritmos");
        byEnrollment.setSite(null);

        Courses byEverUsed = new Courses();
        byEverUsed.setCourse_id(2L);
        byEverUsed.setTitle("Bases");
        byEverUsed.setEverUsed(true);
        byEverUsed.setSite("COLE");

        Courses byAssignedProfessor = new Courses();
        byAssignedProfessor.setCourse_id(3L);
        byAssignedProfessor.setTitle("Compiladores");
        byAssignedProfessor.setAssignedUser(new Users(50L, "prof", "enc", Role.PROFESSOR, "p@u.es", true, List.of()));
        byAssignedProfessor.setSite("COLE");

        when(coursesRepository.findAllByOrderByTitleAsc())
                .thenReturn(List.of(byEnrollment, byEverUsed, byAssignedProfessor));
        when(enrollmentRepository.findUsedCourseIds(List.of(1L, 2L, 3L))).thenReturn(List.of(1L));

        List<AdminCourseCatalogItemDTO> result = adminCourseCatalogService.getAdminCourseCatalog();

        assertEquals(3, result.size());
        assertTrue(result.get(0).used());
        assertTrue(result.get(1).used());
        assertTrue(result.get(2).used());
        assertEquals("COLE", result.get(0).site());
    }

    @Test
    @DisplayName("getAdminCourseCatalog ignora IDs nulos o inválidos al resolver usados")
    void getAdminCourseCatalog_ShouldSkipInvalidIdsInUsedResolution() {
        Courses withoutId = new Courses();
        withoutId.setCourse_id(null);
        withoutId.setTitle("Sin ID");

        Courses withInvalidId = new Courses();
        withInvalidId.setCourse_id(0L);
        withInvalidId.setTitle("ID inválido");

        when(coursesRepository.findAllByOrderByTitleAsc()).thenReturn(List.of(withoutId, withInvalidId));

        List<AdminCourseCatalogItemDTO> result = adminCourseCatalogService.getAdminCourseCatalog();

        assertEquals(2, result.size());
        verify(enrollmentRepository, never()).findUsedCourseIds(anyList());
    }

    @Test
    @DisplayName("createCourse persiste title normalizado, fuerza site COLE y retorna DTO")
    void createCourse_ShouldPersistNormalizedTitleAndSiteCole() {
        AdminCourseCreateRequestDTO request = new AdminCourseCreateRequestDTO(
                "  Arquitectura de Software  ",
                " https://example.edu/course ",
                " Intro ",
                "Ingenieria",
                null,
                "Especialización",
                "ES",
                "ES,EN",
                "UML",
                "docente",
                4.7f,
                1200,
                30.5f);

        when(coursesRepository.existsByTitleKey("arquitecturadesoftware")).thenReturn(false);
        when(coursesRepository.saveAndFlush(any(Courses.class))).thenAnswer(invocation -> {
            Courses saved = invocation.getArgument(0);
            saved.setCourse_id(77L);
            return saved;
        });

        AdminCourseCatalogItemDTO result = adminCourseCatalogService.createCourse(request);

        ArgumentCaptor<Courses> captor = ArgumentCaptor.forClass(Courses.class);
        verify(coursesRepository).saveAndFlush(captor.capture());
        Courses persisted = captor.getValue();

        assertEquals("Arquitectura de Software", persisted.getTitle());
        assertEquals("arquitecturadesoftware", persisted.getTitleKey());
        assertEquals("COLE", persisted.getSite());
        assertFalse(persisted.isEverUsed());
        assertEquals(77L, result.courseId());
        assertEquals("COLE", result.site());
    }

    @Test
    @DisplayName("createCourse rechaza payload nulo")
    void createCourse_WhenRequestIsNull_ShouldThrow() {
        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.createCourse(null));

        assertEquals("El payload del curso es obligatorio.", ex.getMessage());
    }

    @Test
    @DisplayName("createCourse rechaza título vacío")
    void createCourse_WhenTitleIsBlank_ShouldThrow() {
        AdminCourseCreateRequestDTO request = new AdminCourseCreateRequestDTO("   ", null, null, null, null, null, null,
                null, null, null, null, null, null);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.createCourse(request));

        assertEquals("El título es obligatorio.", ex.getMessage());
    }

    @Test
    @DisplayName("createCourse rechaza categoría vacía")
    void createCourse_WhenCategoryIsBlank_ShouldThrow() {
        AdminCourseCreateRequestDTO request = new AdminCourseCreateRequestDTO(
                "Arquitectura",
                null,
                null,
                "   ",
                null,
                "Básico",
                null,
                null,
                null,
                null,
                null,
                null,
                null);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.createCourse(request));

        assertEquals("La categoría es obligatoria.", ex.getMessage());
    }

    @Test
    @DisplayName("createCourse rechaza nivel de dificultad vacío")
    void createCourse_WhenCourseTypeIsBlank_ShouldThrow() {
        AdminCourseCreateRequestDTO request = new AdminCourseCreateRequestDTO(
                "Arquitectura",
                null,
                null,
                "Ingenieria",
                null,
                "   ",
                null,
                null,
                null,
                null,
                null,
                null,
                null);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.createCourse(request));

        assertEquals("El nivel de dificultad es obligatorio.", ex.getMessage());
    }

    @Test
    @DisplayName("createCourse rechaza duración nula")
    void createCourse_WhenDurationIsNull_ShouldThrow() {
        AdminCourseCreateRequestDTO request = new AdminCourseCreateRequestDTO(
                "Arquitectura",
                null,
                null,
                "Ingenieria",
                null,
                "Básico",
                null,
                null,
                null,
                null,
                null,
                null,
                null);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.createCourse(request));

        assertEquals("La duración es obligatoria y debe ser mayor que 0 horas.", ex.getMessage());
    }

    @Test
    @DisplayName("createCourse rechaza duración igual a cero")
    void createCourse_WhenDurationIsZero_ShouldThrow() {
        AdminCourseCreateRequestDTO request = new AdminCourseCreateRequestDTO(
                "Arquitectura",
                null,
                null,
                "Ingenieria",
                null,
                "Básico",
                null,
                null,
                null,
                null,
                null,
                null,
                0f);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.createCourse(request));

        assertEquals("La duración es obligatoria y debe ser mayor que 0 horas.", ex.getMessage());
    }

    @Test
    @DisplayName("createCourse traduce errores de persistencia a mensaje funcional")
    void createCourse_WhenPersistenceFails_ShouldThrowServiceExceptionWithFriendlyMessage() {
        AdminCourseCreateRequestDTO request = new AdminCourseCreateRequestDTO(
                "Arquitectura",
                null,
                null,
                "Ingenieria",
                null,
                "Básico",
                "ES",
                "ES",
                null,
                null,
                null,
                null,
                10f);

        when(coursesRepository.existsByTitleKey("arquitectura")).thenThrow(
                new InvalidDataAccessResourceUsageException("column \"sub-category\" does not exist"));

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.createCourse(request));

        assertEquals(
                "No se pudo crear el curso por un conflicto de persistencia. Verifica formato de datos y esquema de base de datos.",
                ex.getMessage());
    }

    @Test
    @DisplayName("createCourse rechaza idioma vacío")
    void createCourse_WhenLanguageIsBlank_ShouldThrow() {
        AdminCourseCreateRequestDTO request = new AdminCourseCreateRequestDTO(
                "Arquitectura",
                null,
                null,
                "Ingenieria",
                null,
                "Básico",
                "   ",
                "ES",
                null,
                null,
                null,
                null,
                10f);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.createCourse(request));

        assertEquals("El idioma es obligatorio.", ex.getMessage());
    }

    @Test
    @DisplayName("createCourse autocompleta subtítulos cuando viene vacío")
    void createCourse_WhenSubtitleLanguagesIsBlank_ShouldDefaultInformativeText() {
        AdminCourseCreateRequestDTO request = new AdminCourseCreateRequestDTO(
                "Arquitectura",
                null,
                null,
                "Ingenieria",
                null,
                "Básico",
                "ES",
                "   ",
                null,
                null,
                null,
                null,
                10f);

        when(coursesRepository.existsByTitleKey("arquitectura")).thenReturn(false);
        when(coursesRepository.saveAndFlush(any(Courses.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminCourseCatalogItemDTO result = adminCourseCatalogService.createCourse(request);

        assertEquals("Sin subtítulos", result.subtitleLanguages());
    }

    @Test
    @DisplayName("createCourse rechaza duplicados por title_key")
    void createCourse_WhenDuplicateTitleKey_ShouldThrow() {
        AdminCourseCreateRequestDTO request = new AdminCourseCreateRequestDTO("Arqui tec tura", null, null,
                "Ingenieria", null,
                "Básico", "ES", "ES", null, null, null, null, 8f);

        when(coursesRepository.existsByTitleKey("arquitectura")).thenReturn(true);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.createCourse(request));

        assertEquals("Este curso ya existe.", ex.getMessage());
        verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
    }

    @Test
    @DisplayName("patchCourse lanza 404 cuando no existe")
    void patchCourse_WhenCourseNotFound_ShouldThrow() {
        when(coursesRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> adminCourseCatalogService.patchCourse(99L, Map.of("category", "X")));
    }

    @Test
    @DisplayName("patchCourse rechaza intento de modificación de title")
    void patchCourse_WhenTitleIncluded_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(1L);
        when(coursesRepository.findById(1L)).thenReturn(Optional.of(course));

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(1L, Map.of("title", "Nuevo")));

        assertEquals("El título no se puede modificar.", ex.getMessage());
    }

    @Test
    @DisplayName("patchCourse rechaza campos no permitidos")
    void patchCourse_WhenInvalidField_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(1L);
        when(coursesRepository.findById(1L)).thenReturn(Optional.of(course));

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(1L, Map.of("titleKey", "abc")));

        assertEquals("Campo no permitido en actualización parcial: titleKey", ex.getMessage());
    }

    @Test
    @DisplayName("patchCourse rechaza modificación de instructor desde catálogo")
    void patchCourse_WhenInstructorsIncluded_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(2L);
        when(coursesRepository.findById(2L)).thenReturn(Optional.of(course));

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(2L, Map.of("instructors", "Profesor X")));

        assertEquals("Campo no permitido en actualización parcial: instructors", ex.getMessage());
        verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
    }

    @Test
    @DisplayName("patchCourse rechaza modificar rating desde admin")
    void patchCourse_WhenRatingPatchRequested_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(10L);
        course.setEverUsed(true);
        course.setCategory("Negocios");
        course.setCourseType("Intermedio");
        course.setDuration(12f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        when(coursesRepository.findById(10L)).thenReturn(Optional.of(course));

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(10L, Map.of("rating", 40)));

        assertEquals("Campo no permitido en actualización parcial: rating", ex.getMessage());
        verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
    }

    @Test
    @DisplayName("patchCourse bloquea cualquier cambio en curso usado")
    void patchCourse_WhenUsed_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(10L);
        course.setEverUsed(true);
        course.setCategory("Previa");
        course.setCourseType("Intermedio");
        course.setDuration(8f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        course.setSite("EXTERNAL");
        when(coursesRepository.findById(10L)).thenReturn(Optional.of(course));

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(10L, Map.of("category", "Data")));

        assertEquals("Curso activo.", ex.getMessage());
        verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
    }

    @Test
    @DisplayName("patchCourse rechaza modificar numOfViewers desde admin")
    void patchCourse_WhenNumOfViewersPatchRequested_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(11L);
        course.setEverUsed(false);
        course.setCategory("Negocios");
        course.setCourseType("Básico");
        course.setDuration(5f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        when(coursesRepository.findById(11L)).thenReturn(Optional.of(course));
        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(11L, Map.of("numOfViewers", "200")));

        assertEquals("Campo no permitido en actualización parcial: numOfViewers", ex.getMessage());
        verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
    }

    @Test
    @DisplayName("patchCourse convierte textos vacíos a null")
    void patchCourse_WhenTextBlank_ShouldConvertToNull() {
        Courses course = new Courses();
        course.setCourse_id(12L);
        course.setCategory("Previa");
        course.setCourseType("Básico");
        course.setDuration(4f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        when(coursesRepository.findById(12L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(12L)).thenReturn(false);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(12L, Map.of("category", "   ")));

        assertEquals("La categoría es obligatoria.", ex.getMessage());
    }

    @Test
    @DisplayName("patchCourse rechaza dejar vacío el nivel de dificultad")
    void patchCourse_WhenCourseTypeBlank_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(121L);
        course.setCategory("Previa");
        course.setCourseType("Intermedio");
        course.setDuration(6f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        when(coursesRepository.findById(121L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(121L)).thenReturn(false);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(121L, Map.of("courseType", "   ")));

        assertEquals("El nivel de dificultad es obligatorio.", ex.getMessage());
    }

    @Test
    @DisplayName("patchCourse rechaza guardar otros cambios si el curso sigue sin categoría obligatoria")
    void patchCourse_WhenCategoryRemainsMissing_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(122L);
        course.setCategory(null);
        course.setCourseType("Intermedio");
        course.setDuration(6f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        when(coursesRepository.findById(122L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(122L)).thenReturn(false);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(122L, Map.of("language", "ES")));

        assertEquals("La categoría es obligatoria.", ex.getMessage());
        verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
    }

    @Test
    @DisplayName("patchCourse rechaza guardar otros cambios si el curso sigue sin nivel obligatorio")
    void patchCourse_WhenCourseTypeRemainsMissing_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(123L);
        course.setCategory("Negocios");
        course.setCourseType(null);
        course.setDuration(6f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        when(coursesRepository.findById(123L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(123L)).thenReturn(false);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(123L, Map.of("language", "ES")));

        assertEquals("El nivel de dificultad es obligatorio.", ex.getMessage());
        verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
    }

    @Test
    @DisplayName("patchCourse rechaza número inválido para duration")
    void patchCourse_WhenInvalidDurationValue_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(13L);
        course.setCategory("Negocios");
        course.setCourseType("Básico");
        course.setDuration(4f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        when(coursesRepository.findById(13L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(13L)).thenReturn(false);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(13L, Map.of("duration", "abc")));

        assertEquals("Valor numérico inválido para duration.", ex.getMessage());
    }

    @Test
    @DisplayName("patchCourse rechaza tipo inválido para campo textual")
    void patchCourse_WhenTextFieldReceivesInvalidType_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(130L);
        course.setCategory("Negocios");
        course.setCourseType("Básico");
        course.setDuration(4f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        when(coursesRepository.findById(130L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(130L)).thenReturn(false);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(130L, Map.of("category", 123)));

        assertEquals("Tipo de dato inválido para un campo textual.", ex.getMessage());
    }

    @Test
    @DisplayName("patchCourse rechaza tipo inválido para campo numérico")
    void patchCourse_WhenNumericFieldReceivesInvalidType_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(131L);
        course.setCategory("Negocios");
        course.setCourseType("Básico");
        course.setDuration(4f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        when(coursesRepository.findById(131L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(131L)).thenReturn(false);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(131L, Map.of("duration", true)));

        assertEquals("Tipo de dato inválido para duration.", ex.getMessage());
    }

    @Test
    @DisplayName("patchCourse con cambios vacíos devuelve DTO sin persistir")
    void patchCourse_WhenChangesAreEmpty_ShouldReturnCurrentWithoutSave() {
        Courses course = new Courses();
        course.setCourse_id(132L);
        course.setTitle("Curso estable");
        course.setCategory("Negocios");
        course.setCourseType("Básico");
        course.setDuration(6f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        when(coursesRepository.findById(132L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(132L)).thenReturn(false);

        AdminCourseCatalogItemDTO dto = adminCourseCatalogService.patchCourse(132L, Map.of());

        assertEquals(132L, dto.courseId());
        verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
    }

    @Test
    @DisplayName("deleteCourse lanza 404 cuando no existe")
    void deleteCourse_WhenNotFound_ShouldThrow() {
        when(coursesRepository.findById(88L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> adminCourseCatalogService.deleteCourse(88L));
    }

    @Test
    @DisplayName("deleteCourse bloquea curso usado")
    void deleteCourse_WhenUsed_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(14L);
        course.setEverUsed(true);
        course.setCategory("Negocios");
        course.setCourseType("Básico");
        course.setDuration(6f);
        when(coursesRepository.findById(14L)).thenReturn(Optional.of(course));

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.deleteCourse(14L));

        assertEquals("Curso activo.", ex.getMessage());
        verify(coursesRepository, never()).delete(any(Courses.class));
    }

    @Test
    @DisplayName("deleteCourse elimina y flush en curso no usado")
    void deleteCourse_WhenNotUsed_ShouldDelete() {
        Courses course = new Courses();
        course.setCourse_id(15L);
        course.setCategory("Negocios");
        course.setCourseType("Básico");
        course.setDuration(6f);
        when(coursesRepository.findById(15L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(15L)).thenReturn(false);

        adminCourseCatalogService.deleteCourse(15L);

        verify(coursesRepository).delete(course);
        verify(coursesRepository).flush();
    }

    @Test
    @DisplayName("patchCourse rechaza duración nula o vacía en el estado final")
    void patchCourse_WhenDurationBecomesBlank_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(124L);
        course.setCategory("Negocios");
        course.setCourseType("Básico");
        course.setDuration(6f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        when(coursesRepository.findById(124L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(124L)).thenReturn(false);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(124L, Map.of("duration", "   ")));

        assertEquals("La duración es obligatoria y debe ser mayor que 0 horas.", ex.getMessage());
    }

    @Test
    @DisplayName("patchCourse rechaza duración menor o igual que cero")
    void patchCourse_WhenDurationIsZeroOrNegative_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(125L);
        course.setCategory("Negocios");
        course.setCourseType("Básico");
        course.setDuration(6f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        when(coursesRepository.findById(125L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(125L)).thenReturn(false);

        ServicesException zeroEx = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(125L, Map.of("duration", 0)));
        assertEquals("La duración es obligatoria y debe ser mayor que 0 horas.", zeroEx.getMessage());

        ServicesException negativeEx = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(125L, Map.of("duration", -2)));
        assertEquals("La duración es obligatoria y debe ser mayor que 0 horas.", negativeEx.getMessage());
    }

    @Test
    @DisplayName("patchCourse bloquea también cambios de duración en curso usado")
    void patchCourse_WhenUsedAndDurationNeedsCorrection_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(126L);
        course.setCategory("Negocios");
        course.setCourseType("Básico");
        course.setDuration(1f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        course.setEverUsed(true);
        when(coursesRepository.findById(126L)).thenReturn(Optional.of(course));

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(126L, Map.of("duration", 12)));

        assertEquals("Curso activo.", ex.getMessage());
        verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
    }

    @Test
    @DisplayName("patchCourse rechaza otros cambios si el curso sigue sin duración válida")
    void patchCourse_WhenDurationRemainsMissing_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(127L);
        course.setCategory("Negocios");
        course.setCourseType("Básico");
        course.setDuration(null);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        when(coursesRepository.findById(127L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(127L)).thenReturn(false);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(127L, Map.of("language", "ES")));

        assertEquals("La duración es obligatoria y debe ser mayor que 0 horas.", ex.getMessage());
        verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
    }

    @Test
    @DisplayName("patchCourse rechaza guardar cambios si el curso queda sin idioma")
    void patchCourse_WhenLanguageBecomesBlank_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(128L);
        course.setCategory("Negocios");
        course.setCourseType("Básico");
        course.setDuration(8f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        when(coursesRepository.findById(128L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(128L)).thenReturn(false);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(128L, Map.of("language", "   ")));

        assertEquals("El idioma es obligatorio.", ex.getMessage());
    }

    @Test
    @DisplayName("patchCourse autocompleta subtítulos cuando se limpia el campo")
    void patchCourse_WhenSubtitleLanguagesBecomesBlank_ShouldDefaultInformativeText() {
        Courses course = new Courses();
        course.setCourse_id(129L);
        course.setCategory("Negocios");
        course.setCourseType("Básico");
        course.setDuration(8f);
        course.setLanguage("ES");
        course.setSubtitleLanguages("ES");
        when(coursesRepository.findById(129L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(129L)).thenReturn(false);
        when(coursesRepository.saveAndFlush(any(Courses.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminCourseCatalogItemDTO dto = adminCourseCatalogService.patchCourse(129L, Map.of("subtitleLanguages", "   "));

        assertEquals("Sin subtítulos", course.getSubtitleLanguages());
        assertEquals("Sin subtítulos", dto.subtitleLanguages());
    }

    @Test
    @DisplayName("markCourseAsEverUsed ignora id null")
    void markCourseAsEverUsed_WhenNullId_ShouldDoNothing() {
        adminCourseCatalogService.markCourseAsEverUsed(null);

        verify(coursesRepository, never()).findById(any());
    }

    @Test
    @DisplayName("markCourseAsEverUsed ignora curso inexistente")
    void markCourseAsEverUsed_WhenMissingCourse_ShouldDoNothing() {
        when(coursesRepository.findById(33L)).thenReturn(Optional.empty());

        adminCourseCatalogService.markCourseAsEverUsed(33L);

        verify(coursesRepository, never()).save(any(Courses.class));
    }

    @Test
    @DisplayName("markCourseAsEverUsed no repite persistencia si ya estaba marcado")
    void markCourseAsEverUsed_WhenAlreadyTrue_ShouldSkipSave() {
        Courses course = new Courses();
        course.setCourse_id(34L);
        course.setEverUsed(true);
        when(coursesRepository.findById(34L)).thenReturn(Optional.of(course));

        adminCourseCatalogService.markCourseAsEverUsed(34L);

        verify(coursesRepository, never()).save(any(Courses.class));
    }

    @Test
    @DisplayName("markCourseAsEverUsed marca y persiste cuando estaba a false")
    void markCourseAsEverUsed_WhenFalse_ShouldPersist() {
        Courses course = new Courses();
        course.setCourse_id(35L);
        course.setEverUsed(false);
        when(coursesRepository.findById(35L)).thenReturn(Optional.of(course));

        adminCourseCatalogService.markCourseAsEverUsed(35L);

        assertTrue(course.isEverUsed());
        verify(coursesRepository).save(course);
    }
}
