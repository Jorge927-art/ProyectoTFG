package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.DocumentMetadata;
import com.cursosonline.backend.entities.FolderType;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.repository.DocumentMetadataRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.services.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("DocumentController - Integracion endpoint /course/enrollment/{enrollmentId}")
class DocumentControllerEnrollmentEndpointIntegrationTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @MockitoBean
    private DocumentMetadataRepository documentMetadataRepository;

    @MockitoBean
    private EnrollmentRepository enrollmentRepository;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private FileStorageService fileStorageService;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    @Test
    @WithMockUser(username = "profesor_juan", authorities = { "PROFESSOR" })
    @DisplayName("debe devolver 200 y lista de documentos para profesor autorizado")
    void shouldReturnDocumentsForAuthorizedProfessor() throws Exception {
        Long enrollmentId = 2001L;

        Users sender = new Users();
        sender.setUser_id(1L);
        sender.setUsername("student_luis");
        sender.setEmail("luis@correo.com");
        sender.setRole(Role.STUDENT);

        Users receiver = new Users();
        receiver.setUser_id(2L);
        receiver.setUsername("profesor_juan");
        receiver.setEmail("juan@correo.com");
        receiver.setRole(Role.PROFESSOR);

        DocumentMetadata doc = new DocumentMetadata();
        doc.setDocumentid(99L);
        doc.setFilename("documents/uuid_entrega.pdf");
        doc.setOriginalname("Entrega_Final.pdf");
        doc.setSender(sender);
        doc.setReceiver(receiver);
        doc.setFolder_type(FolderType.RECEIVED);
        doc.setRead(false);

        when(enrollmentRepository.isInstructorAuthorizedForEnrollment(enrollmentId, "profesor_juan"))
                .thenReturn(true);
        when(documentMetadataRepository.findDocumentsByEnrollmentId(enrollmentId))
                .thenReturn(List.of(doc));

        mockMvc.perform(get("/api/v1/documents/course/enrollment/{enrollmentId}", enrollmentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].documentid").value(99))
                .andExpect(jsonPath("$[0].originalname").value("Entrega_Final.pdf"))
                .andExpect(jsonPath("$[0].sender.username").value("student_luis"));

        verify(enrollmentRepository, times(1))
                .isInstructorAuthorizedForEnrollment(enrollmentId, "profesor_juan");
        verify(documentMetadataRepository, times(1)).findDocumentsByEnrollmentId(enrollmentId);
    }

    @Test
    @WithMockUser(username = "alumno_luis", roles = { "STUDENT" })
    @DisplayName("debe devolver 403 para usuario autenticado sin rol de profesor")
    void shouldReturnForbiddenForAuthenticatedNonProfessor() throws Exception {
        Long enrollmentId = 2001L;

        mockMvc.perform(get("/api/v1/documents/course/enrollment/{enrollmentId}", enrollmentId))
                .andExpect(status().isForbidden());

        verify(enrollmentRepository, never()).isInstructorAuthorizedForEnrollment(enrollmentId, "alumno_luis");
        verifyNoInteractions(documentMetadataRepository);
    }

    @Test
    @DisplayName("debe devolver 401 o 403 para usuario anonimo")
    void shouldReturnUnauthorizedOrForbiddenForAnonymousUser() throws Exception {
        Long enrollmentId = 2001L;

        int statusCode = mockMvc.perform(get("/api/v1/documents/course/enrollment/{enrollmentId}", enrollmentId))
                .andReturn()
                .getResponse()
                .getStatus();

        assertTrue(statusCode == 401 || statusCode == 403);
        verifyNoInteractions(enrollmentRepository);
        verifyNoInteractions(documentMetadataRepository);
    }
}
