package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.AdminCourseCatalogItemDTO;
import com.cursosonline.backend.dto.AdminCourseCreateRequestDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ResourceNotFoundException;
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
    @DisplayName("createCourse rechaza duplicados por title_key")
    void createCourse_WhenDuplicateTitleKey_ShouldThrow() {
        AdminCourseCreateRequestDTO request = new AdminCourseCreateRequestDTO("Arqui tec tura", null, null, null, null,
                null, null, null, null, null, null, null, null);

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
    @DisplayName("patchCourse bloquea rating/numOfViewers/duration en curso usado")
    void patchCourse_WhenUsedAndRestrictedField_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(10L);
        course.setEverUsed(true);
        when(coursesRepository.findById(10L)).thenReturn(Optional.of(course));

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(10L, Map.of("duration", 40)));

        assertEquals("Curso activo.", ex.getMessage());
        verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
    }

    @Test
    @DisplayName("patchCourse permite cambios descriptivos en curso usado y fuerza site COLE")
    void patchCourse_WhenUsedAndDescriptiveFields_ShouldUpdate() {
        Courses course = new Courses();
        course.setCourse_id(10L);
        course.setEverUsed(true);
        course.setSite("EXTERNAL");
        when(coursesRepository.findById(10L)).thenReturn(Optional.of(course));
        when(coursesRepository.saveAndFlush(any(Courses.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminCourseCatalogItemDTO result = adminCourseCatalogService.patchCourse(10L,
                Map.of("category", "  Data  ", "site", "OTRO"));

        assertEquals("Data", course.getCategory());
        assertEquals("COLE", course.getSite());
        assertTrue(result.used());
        assertEquals("COLE", result.site());
    }

    @Test
    @DisplayName("patchCourse permite editar campos restringidos en curso no usado")
    void patchCourse_WhenNotUsed_ShouldAllowRestrictedFields() {
        Courses course = new Courses();
        course.setCourse_id(11L);
        course.setEverUsed(false);
        when(coursesRepository.findById(11L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(11L)).thenReturn(false);
        when(coursesRepository.saveAndFlush(any(Courses.class))).thenAnswer(invocation -> invocation.getArgument(0));

        adminCourseCatalogService.patchCourse(11L, Map.of(
                "rating", "4.5",
                "numOfViewers", "200",
                "duration", 18));

        assertEquals(4.5f, course.getRating());
        assertEquals(200, course.getNumOfViewers());
        assertEquals(18f, course.getDuration());
        assertEquals("COLE", course.getSite());
    }

    @Test
    @DisplayName("patchCourse convierte textos vacíos a null")
    void patchCourse_WhenTextBlank_ShouldConvertToNull() {
        Courses course = new Courses();
        course.setCourse_id(12L);
        course.setCategory("Previa");
        when(coursesRepository.findById(12L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(12L)).thenReturn(false);
        when(coursesRepository.saveAndFlush(any(Courses.class))).thenAnswer(invocation -> invocation.getArgument(0));

        adminCourseCatalogService.patchCourse(12L, Map.of("category", "   "));

        assertNull(course.getCategory());
    }

    @Test
    @DisplayName("patchCourse rechaza número inválido")
    void patchCourse_WhenInvalidNumericValue_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(13L);
        when(coursesRepository.findById(13L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(13L)).thenReturn(false);

        ServicesException ex = assertThrows(ServicesException.class,
                () -> adminCourseCatalogService.patchCourse(13L, Map.of("numOfViewers", "abc")));

        assertEquals("Valor numérico inválido para numOfViewers.", ex.getMessage());
    }

    @Test
    @DisplayName("patchCourse rechaza tipo inválido para campo textual")
    void patchCourse_WhenTextFieldReceivesInvalidType_ShouldThrow() {
        Courses course = new Courses();
        course.setCourse_id(130L);
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
        when(coursesRepository.findById(15L)).thenReturn(Optional.of(course));
        when(enrollmentRepository.existsEnrollmentByCourseId(15L)).thenReturn(false);

        adminCourseCatalogService.deleteCourse(15L);

        verify(coursesRepository).delete(course);
        verify(coursesRepository).flush();
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
