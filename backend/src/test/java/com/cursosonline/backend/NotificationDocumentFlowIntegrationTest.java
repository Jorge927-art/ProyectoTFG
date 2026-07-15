package com.cursosonline.backend;

import com.cursosonline.backend.controller.DocumentController;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.DocumentMetadata;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.FolderType;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.DocumentMetadataRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.services.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Auditoría de Calidad: Test de Integración del Flujo de Notificaciones y Seguridad")
class NotificationDocumentFlowIntegrationTest {

    private MockMvc mockMvc;

    @Mock
    private FileStorageService fileStorageService;
    @Mock
    private DocumentMetadataRepository documentMetadataRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private EnrollmentRepository enrollmentRepository;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private DocumentController documentController;

    private Users studentUser;
    private Users teacherUser;
    private Courses course;
    private Enrollment enrollment;
    private DocumentMetadata mockDoc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(documentController).build();

        // 1. Configurar Alumno y Profesor
        studentUser = new Users();
        studentUser.setUser_id(1L);
        studentUser.setUsername("alumno_tfg");
        studentUser.setEmail("alumno@test.com");
        if (Role.values().length > 0) {
            studentUser.setRole(Role.values()[0]);
        }

        teacherUser = new Users();
        teacherUser.setUser_id(2L);
        teacherUser.setUsername("profesor_tfg");
        teacherUser.setEmail("profesor@test.com");
        if (Role.values().length > 0) {
            teacherUser.setRole(Role.values()[0]);
        }

        // 2. Configurar Asignatura y Matrícula
        course = new Courses();
        course.setCourse_id(501L);
        course.setTitle("Desarrollo Cloud");
        course.setInstructors("profesor_tfg");

        enrollment = new Enrollment();
        enrollment.setEnrollmentid(10L);
        enrollment.setUser(studentUser);
        enrollment.setCourse(course);

        // 3. Documento Base para Consultas y Parciales
        mockDoc = new DocumentMetadata();
        mockDoc.setDocumentid(100L);
        mockDoc.setFilename("uploads/documents/archivo.pdf");
        mockDoc.setOriginalname("archivo.pdf");
        mockDoc.setSender(studentUser);
        mockDoc.setReceiver(teacherUser);
        mockDoc.setFolder_type(FolderType.RECEIVED);
        mockDoc.setRead(false);
    }

    @Test
    @DisplayName("Flujo Integrado: Subir entrega académica debe registrar metadatos dirigidos al receiver_id")
    void shouldRegisterAssignmentAndTriggerNotificationFlow() throws Exception {
        MockMultipartFile assignmentFile = new MockMultipartFile(
                "file", "proyecto_final.pdf", MediaType.APPLICATION_PDF_VALUE, "pdf-bytes".getBytes());

        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("alumno_tfg");
        when(userRepository.findByUsername("alumno_tfg")).thenReturn(Optional.of(studentUser));
        when(enrollmentRepository.findAllByUserIdWithCourses(1L)).thenReturn(List.of(enrollment));
        when(userRepository.findByUsername("profesor_tfg")).thenReturn(Optional.of(teacherUser));
        when(fileStorageService.storeFile(any(), eq("documents"))).thenReturn("uploads/documents/proyecto_final.pdf");

        mockMvc.perform(multipart("/api/v1/documents/upload/assignment")
                .file(assignmentFile)
                .param("courseId", "501")
                .param("evaluationType", "ENTREGA_FINAL")
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.filename").value("uploads/documents/proyecto_final.pdf"));

        verify(documentMetadataRepository, times(2)).save(any(DocumentMetadata.class));
    }

    @Test
    @DisplayName("Cortocircuito Anti-IDOR: Debe retornar 403 Forbidden si un tercero intenta descargar el documento")
    void shouldReturnForbiddenWhenUserIsNotSenderNorReceiver() throws Exception {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("hacker_username");
        when(documentMetadataRepository.findById(100L)).thenReturn(Optional.of(mockDoc));

        mockMvc.perform(get("/api/v1/documents/download/100")
                .principal(authentication))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error")
                        .value("Acceso denegado: No tienes permisos legítimos para descargar este archivo."));

        verify(fileStorageService, never()).loadFileAsResource(anyString());
    }

    @Test
    @DisplayName("Cortocircuito Anti-IDOR: Debe permitir la descarga segura si el usuario es el receptor legítimo")
    void shouldAllowDownloadWhenUserIsLegitimateReceiver() throws Exception {
        Resource mockResource = mock(Resource.class);
        when(mockResource.exists()).thenReturn(true);

        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("profesor_tfg");
        when(documentMetadataRepository.findById(100L)).thenReturn(Optional.of(mockDoc));
        when(fileStorageService.loadFileAsResource("uploads/documents/archivo.pdf")).thenReturn(mockResource);

        mockMvc.perform(get("/api/v1/documents/download/100")
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"archivo.pdf\""));
    }

    @Test
    @DisplayName("Notificaciones Frontend: Marcar como leído debe alterar el booleano 'isRead' y refrescar la campana")
    void shouldUpdateIsReadStatusLegitimately() throws Exception {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("profesor_tfg");
        when(documentMetadataRepository.findById(100L)).thenReturn(Optional.of(mockDoc));

        mockMvc.perform(patch("/api/v1/documents/100/read")
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isRead").value(true))
                .andExpect(jsonPath("$.message").value("Documento marcado como leído correctamente."));

        verify(documentMetadataRepository, times(1)).save(mockDoc);
    }
}
