package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.AdminCourseProfessorReassignmentResultDTO;
import com.cursosonline.backend.dto.AdminProfessorCourseDTO;
import com.cursosonline.backend.dto.AdminProfessorOptionDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.UserSystemNotification;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ResourceNotFoundException;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.repository.UserSystemNotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Suite de Pruebas Unitarias para AdminCourseAssignmentService")
class AdminCourseAssignmentServiceTest {

        @Mock
        private UserRepository userRepository;

        @Mock
        private CoursesRepository coursesRepository;

        @Mock
        private UserSystemNotificationRepository userSystemNotificationRepository;

        @Mock
        private AdminCourseCatalogService adminCourseCatalogService;

        @InjectMocks
        private AdminCourseAssignmentService adminCourseAssignmentService;

        private Users professorA;
        private Users professorB;
        private Users disabledProfessor;
        private Users studentUser;
        private Courses course;

        @BeforeEach
        void setUp() {
                professorA = new Users(10L, "alfa_docente", "enc", Role.PROFESSOR, "a@uni.es", true, new ArrayList<>());
                professorB = new Users(20L, "beta_docente", "enc", Role.PROFESSOR, "b@uni.es", true, new ArrayList<>());
                disabledProfessor = new Users(21L, "gamma_docente", "enc", Role.PROFESSOR, "g@uni.es", false,
                                new ArrayList<>());
                studentUser = new Users(30L, "laura_student", "enc", Role.STUDENT, "s@uni.es", true, new ArrayList<>());

                course = new Courses();
                course.setCourse_id(300L);
                course.setTitle("Arquitectura de Software");
                course.setAssignedUser(professorA);
                course.setInstructors(professorA.getUsername());
        }

        @Test
        @DisplayName("getEnabledProfessorsAlphabetical debe filtrar habilitados y ordenar alfabéticamente")
        void getEnabledProfessorsAlphabetical_ShouldFilterAndSort() {
                when(userRepository.findByRole(Role.PROFESSOR))
                                .thenReturn(List.of(professorB, disabledProfessor, professorA));

                List<AdminProfessorOptionDTO> result = adminCourseAssignmentService.getEnabledProfessorsAlphabetical();

                assertEquals(2, result.size());
                assertEquals("alfa_docente", result.get(0).username());
                assertEquals("beta_docente", result.get(1).username());
        }

        @Test
        @DisplayName("getEnabledProfessorsAlphabetical debe ignorar usuarios nulos y usar nombre vacío si falta")
        void getEnabledProfessorsAlphabetical_ShouldIgnoreNullUsersAndHandleNullUsername() {
                Users professorWithoutName = new Users(40L, null, "enc", Role.PROFESSOR, "n@uni.es", true,
                                new ArrayList<>());
                when(userRepository.findByRole(Role.PROFESSOR))
                                .thenReturn(Arrays.asList(null, professorWithoutName, professorB, disabledProfessor));

                List<AdminProfessorOptionDTO> result = adminCourseAssignmentService.getEnabledProfessorsAlphabetical();

                assertEquals(2, result.size());
                assertEquals(40L, result.get(0).userId());
                assertNull(result.get(0).username());
                assertEquals("beta_docente", result.get(1).username());
        }

        @Test
        @DisplayName("getCoursesAssignedToProfessor debe rechazar usuarios que no son PROFESSOR")
        void getCoursesAssignedToProfessor_WithNonProfessor_ShouldThrow() {
                when(userRepository.findById(30L)).thenReturn(Optional.of(studentUser));

                ServicesException ex = assertThrows(ServicesException.class,
                                () -> adminCourseAssignmentService.getCoursesAssignedToProfessor(30L));

                assertEquals("Acción inválida: el usuario seleccionado no tiene rol PROFESSOR.", ex.getMessage());
                verify(coursesRepository, never()).findAllByAssignedUser_UserIdOrderByTitleAsc(anyLong());
        }

        @Test
        @DisplayName("getCoursesAssignedToProfessor debe mapear cursos del titular")
        void getCoursesAssignedToProfessor_ShouldMapCourses() {
                when(userRepository.findById(10L)).thenReturn(Optional.of(professorA));
                when(coursesRepository.findAllByAssignedUser_UserIdOrderByTitleAsc(10L)).thenReturn(List.of(course));

                List<AdminProfessorCourseDTO> result = adminCourseAssignmentService.getCoursesAssignedToProfessor(10L);

                assertEquals(1, result.size());
                assertEquals(300L, result.get(0).courseId());
                assertEquals("alfa_docente", result.get(0).currentProfessorUsername());
        }

        @Test
        @DisplayName("reassignCourseProfessor debe reasignar, actualizar instructors y emitir dos notificaciones")
        void reassignCourseProfessor_WithCurrentProfessor_ShouldNotifyBothSides() {
                when(coursesRepository.findById(300L)).thenReturn(Optional.of(course));
                when(userRepository.findById(20L)).thenReturn(Optional.of(professorB));
                when(coursesRepository.saveAndFlush(any(Courses.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                AdminCourseProfessorReassignmentResultDTO result = adminCourseAssignmentService
                                .reassignCourseProfessor(300L, 20L);

                assertEquals(300L, result.courseId());
                assertEquals("alfa_docente", result.previousProfessorUsername());
                assertEquals("beta_docente", result.newProfessorUsername());
                assertEquals(professorB, course.getAssignedUser());
                assertEquals("beta_docente", course.getInstructors());

                ArgumentCaptor<UserSystemNotification> notificationCaptor = ArgumentCaptor
                                .forClass(UserSystemNotification.class);
                verify(userSystemNotificationRepository, times(2)).save(notificationCaptor.capture());

                List<UserSystemNotification> notifications = notificationCaptor.getAllValues();
                assertEquals(2, notifications.size());
                assertTrue(notifications.stream().anyMatch(n -> n.getReceiver().getUser_id().equals(10L)
                                && n.getType().equals("COURSE_ASSIGNMENT_CHANGE")
                                && n.getMessage().contains("desvinculado")));
                assertTrue(notifications.stream().anyMatch(n -> n.getReceiver().getUser_id().equals(20L)
                                && n.getType().equals("COURSE_ASSIGNMENT_CHANGE")
                                && n.getMessage().contains("asignado")));
                verify(adminCourseCatalogService).markCourseAsEverUsed(300L);
        }

        @Test
        @DisplayName("reassignCourseProfessor debe rechazar reasignar a un profesor que ya es titular del curso")
        void reassignCourseProfessor_WithSameProfessor_ShouldThrow() {
                when(coursesRepository.findById(300L)).thenReturn(Optional.of(course));
                when(userRepository.findById(10L)).thenReturn(Optional.of(professorA));

                ServicesException ex = assertThrows(ServicesException.class,
                                () -> adminCourseAssignmentService.reassignCourseProfessor(300L, 10L));

                assertEquals("El profesor seleccionado ya es titular de esta asignatura.", ex.getMessage());
                verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
                verify(userSystemNotificationRepository, never()).save(any(UserSystemNotification.class));
                verify(adminCourseCatalogService, never()).markCourseAsEverUsed(anyLong());
        }

        @Test
        @DisplayName("reassignCourseProfessor con curso sin titular previo debe emitir solo notificación de entrada")
        void reassignCourseProfessor_WithoutCurrentProfessor_ShouldNotifyOnlyIncoming() {
                course.setAssignedUser(null);
                course.setInstructors(null);

                when(coursesRepository.findById(300L)).thenReturn(Optional.of(course));
                when(userRepository.findById(20L)).thenReturn(Optional.of(professorB));
                when(coursesRepository.saveAndFlush(any(Courses.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                AdminCourseProfessorReassignmentResultDTO result = adminCourseAssignmentService
                                .reassignCourseProfessor(300L, 20L);

                assertNull(result.previousProfessorUserId());
                assertNull(result.previousProfessorUsername());

                verify(userSystemNotificationRepository, times(1)).save(any(UserSystemNotification.class));
                verify(adminCourseCatalogService).markCourseAsEverUsed(300L);
        }

        @Test
        @DisplayName("reassignCourseProfessor debe rechazar profesor entrante deshabilitado")
        void reassignCourseProfessor_DisabledProfessor_ShouldThrow() {
                when(coursesRepository.findById(300L)).thenReturn(Optional.of(course));
                when(userRepository.findById(21L)).thenReturn(Optional.of(disabledProfessor));

                ServicesException ex = assertThrows(ServicesException.class,
                                () -> adminCourseAssignmentService.reassignCourseProfessor(300L, 21L));

                assertEquals("Acción inválida: no se puede asignar un profesor deshabilitado.", ex.getMessage());
                verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
                verify(userSystemNotificationRepository, never()).save(any(UserSystemNotification.class));
        }

        @Test
        @DisplayName("reassignCourseProfessor debe rechazar cuando no se informa profesor entrante")
        void reassignCourseProfessor_WithNullNewProfessorId_ShouldThrow() {
                ServicesException ex = assertThrows(ServicesException.class,
                                () -> adminCourseAssignmentService.reassignCourseProfessor(300L, null));

                assertEquals("Debes seleccionar un profesor entrante válido.", ex.getMessage());
                verify(coursesRepository, never()).findById(anyLong());
                verify(userRepository, never()).findById(anyLong());
                verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
                verify(userSystemNotificationRepository, never()).save(any(UserSystemNotification.class));
        }

        @Test
        @DisplayName("reassignCourseProfessor debe rechazar usuarios entrantes sin rol PROFESSOR")
        void reassignCourseProfessor_WithIncomingNonProfessor_ShouldThrow() {
                when(coursesRepository.findById(300L)).thenReturn(Optional.of(course));
                when(userRepository.findById(30L)).thenReturn(Optional.of(studentUser));

                ServicesException ex = assertThrows(ServicesException.class,
                                () -> adminCourseAssignmentService.reassignCourseProfessor(300L, 30L));

                assertEquals("Acción inválida: solo se puede reasignar a usuarios con rol PROFESSOR.", ex.getMessage());
                verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
                verify(userSystemNotificationRepository, never()).save(any(UserSystemNotification.class));
        }

        @Test
        @DisplayName("reassignCourseProfessor debe usar título seguro cuando viene como texto null")
        void reassignCourseProfessor_ShouldUseSafeCourseTitle_WhenTitleLiteralNull() {
                course.setTitle(" null ");
                when(coursesRepository.findById(300L)).thenReturn(Optional.of(course));
                when(userRepository.findById(20L)).thenReturn(Optional.of(professorB));
                when(coursesRepository.saveAndFlush(any(Courses.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                adminCourseAssignmentService.reassignCourseProfessor(300L, 20L);

                ArgumentCaptor<UserSystemNotification> notificationCaptor = ArgumentCaptor
                                .forClass(UserSystemNotification.class);
                verify(userSystemNotificationRepository, times(2)).save(notificationCaptor.capture());
                List<UserSystemNotification> notifications = notificationCaptor.getAllValues();
                assertTrue(notifications.stream().allMatch(n -> n.getMessage().contains("Curso sin título")));
        }

        @Test
        @DisplayName("getCoursesAssignedToProfessor debe lanzar ResourceNotFound si el profesor no existe")
        void getCoursesAssignedToProfessor_WithUnknownProfessor_ShouldThrowNotFound() {
                when(userRepository.findById(999L)).thenReturn(Optional.empty());

                ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                                () -> adminCourseAssignmentService.getCoursesAssignedToProfessor(999L));

                assertEquals("Profesor no encontrado con id: 999", ex.getMessage());
                verify(coursesRepository, never()).findAllByAssignedUser_UserIdOrderByTitleAsc(anyLong());
        }

        @Test
        @DisplayName("reassignCourseProfessor debe lanzar ResourceNotFound si el curso no existe")
        void reassignCourseProfessor_WithUnknownCourse_ShouldThrowNotFound() {
                when(coursesRepository.findById(999L)).thenReturn(Optional.empty());

                ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                                () -> adminCourseAssignmentService.reassignCourseProfessor(999L, 20L));

                assertEquals("Curso no encontrado con id: 999", ex.getMessage());
                verify(userRepository, never()).findById(anyLong());
                verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
        }

        @Test
        @DisplayName("reassignCourseProfessor debe lanzar ResourceNotFound si el profesor entrante no existe")
        void reassignCourseProfessor_WithUnknownNewProfessor_ShouldThrowNotFound() {
                when(coursesRepository.findById(300L)).thenReturn(Optional.of(course));
                when(userRepository.findById(999L)).thenReturn(Optional.empty());

                ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                                () -> adminCourseAssignmentService.reassignCourseProfessor(300L, 999L));

                assertEquals("Profesor entrante no encontrado con id: 999", ex.getMessage());
                verify(coursesRepository, never()).saveAndFlush(any(Courses.class));
                verify(userSystemNotificationRepository, never()).save(any(UserSystemNotification.class));
        }
}
