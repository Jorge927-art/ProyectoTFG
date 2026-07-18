package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.DocumentMetadata;
import com.cursosonline.backend.entities.FolderType;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.DocumentMetadataRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.services.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class DocumentControllerIntegrationTest {

    @Autowired
    private DocumentController documentController;

    @MockitoBean
    private FileStorageService fileStorageService;

    @MockitoBean
    private DocumentMetadataRepository documentMetadataRepository;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private EnrollmentRepository enrollmentRepository;

    private Users mockSender;
    private Users mockReceiver;
    private MockMultipartFile validFile;

    @BeforeEach
    void setUp() {
        mockSender = new Users();
        mockSender.setUser_id(1L);
        mockSender.setUsername("docente_emisor");
        mockSender.setEnabled(true);

        mockReceiver = new Users();
        mockReceiver.setUser_id(2L);
        mockReceiver.setUsername("alumno_receptor");
        mockReceiver.setEnabled(true);

        // Simulamos un archivo binario Multipart legítimo para simular la transmisión
        validFile = new MockMultipartFile(
                "file",
                "proyecto_final.pdf",
                "application/pdf",
                "%PDF-1.4...".getBytes());
    }

    @Test
    @WithMockUser(username = "docente_emisor")
    void debeTransmitirYPersistirMetadatosDelDocumentoCorrectamente() throws Exception {
        // 1. Configuramos el comportamiento asíncrono de las dependencias
        when(userRepository.findByUsername("docente_emisor")).thenReturn(Optional.of(mockSender));
        when(userRepository.findById(2L)).thenReturn(Optional.of(mockReceiver));
        when(fileStorageService.storeFile(any(MultipartFile.class), eq("documents")))
                .thenReturn("documents/proyecto_final.pdf");

        // 2. Creamos y configuramos el objeto Authentication de forma explícita
        org.springframework.security.core.Authentication mockAuth = mock(
                org.springframework.security.core.Authentication.class);
        when(mockAuth.getName()).thenReturn("docente_emisor");
        when(mockAuth.isAuthenticated()).thenReturn(true);

        // 3. Ejecutamos la llamada al endpoint mutacional del controlador
        ResponseEntity<?> response = documentController.uploadDocument(
                mockAuth,
                validFile,
                2L);

        // 4. Aserciones de control para verificar la creación e inmutabilidad
        assertNotNull(response.getBody());
        assertEquals(200, response.getStatusCode().value());

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertEquals("Documento enviado con éxito al destinatario", body.get("message"));
        assertEquals("proyecto_final.pdf", body.get("originalname"));

        // Verificamos que se duplica el registro en BD para simular bandejas (SENT y
        // RECEIVED)
        verify(documentMetadataRepository, times(2)).save(any(DocumentMetadata.class));
    }

    @Test
    @WithMockUser(username = "alumno_receptor")
    void debePermitirLaDescargaSeguraSiElUsuarioEsElReceptorLegitimo() throws Exception {
        Long mockDocId = 999L;
        DocumentMetadata mockDoc = new DocumentMetadata();
        mockDoc.setDocumentid(mockDocId);
        mockDoc.setFilename("documents/proyecto_final.pdf");
        mockDoc.setOriginalname("proyecto_final.pdf");
        mockDoc.setSender(mockSender);
        mockDoc.setReceiver(mockReceiver);

        org.springframework.core.io.Resource mockResource = mock(org.springframework.core.io.Resource.class);
        when(mockResource.exists()).thenReturn(true);

        // 1. Simulamos la recuperación de metadatos legítimos
        when(documentMetadataRepository.findById(mockDocId)).thenReturn(Optional.of(mockDoc));
        when(fileStorageService.loadFileAsResource("documents/proyecto_final.pdf")).thenReturn(mockResource);

        // 2. Invocamos el método de descarga segura del controlador
        org.springframework.security.core.Authentication auth = mock(
                org.springframework.security.core.Authentication.class);
        when(auth.getName()).thenReturn("alumno_receptor");
        when(auth.isAuthenticated()).thenReturn(true);

        ResponseEntity<?> response = documentController.downloadDocumentSecure(auth, mockDocId);

        // 3. Verificamos que se levanten las cabeceras binarias correctas
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getHeaders().getFirst(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION));
    }

    @Test
    @WithMockUser(username = "usuario_intruso")
    void debeActivarCortocircuitoAntiIdorYDenegarLaDescargaAUnUsuarioNoAutorizado() {
        Long mockDocId = 999L;
        DocumentMetadata mockDoc = new DocumentMetadata();
        mockDoc.setSender(mockSender);
        mockDoc.setReceiver(mockReceiver);

        when(documentMetadataRepository.findById(mockDocId)).thenReturn(Optional.of(mockDoc));

        org.springframework.security.core.Authentication auth = mock(
                org.springframework.security.core.Authentication.class);
        when(auth.getName()).thenReturn("usuario_intruso");
        when(auth.isAuthenticated()).thenReturn(true);

        // Invocamos la descarga con la sesión del intruso
        ResponseEntity<?> response = documentController.downloadDocumentSecure(auth, mockDocId);

        // Verificamos que el cortocircuito defensivo retorne un HTTP 403 Forbidden
        // directo
        assertEquals(403, response.getStatusCode().value());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body);
        assertTrue(body.get("error").toString().contains("Acceso denegado"));
    }

    @Test
    @WithMockUser(username = "alumno_receptor")
    void debeMarcarUnDocumentoComoLeidoCorrectamenteSiEsElReceptor() {
        Long mockDocId = 777L;
        DocumentMetadata mockDoc = new DocumentMetadata();
        mockDoc.setDocumentid(mockDocId);
        mockDoc.setReceiver(mockReceiver);
        mockDoc.setFolder_type(FolderType.RECEIVED);
        mockDoc.setRead(false);

        when(documentMetadataRepository.findById(mockDocId)).thenReturn(Optional.of(mockDoc));

        org.springframework.security.core.Authentication auth = mock(
                org.springframework.security.core.Authentication.class);
        when(auth.getName()).thenReturn("alumno_receptor");
        when(auth.isAuthenticated()).thenReturn(true);

        ResponseEntity<?> response = documentController.markAsRead(auth, mockDocId);

        assertEquals(200, response.getStatusCode().value());
        // Verificamos que se llame al método save reflejando la mutación en PostgreSQL
        verify(documentMetadataRepository, times(1)).save(mockDoc);
        assertTrue(mockDoc.isRead());
    }
}
