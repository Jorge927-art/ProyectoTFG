package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.DocumentMetadata;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.DocumentMetadataRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.services.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;

@DisplayName("Suite de Pruebas Unitarias de Aislamiento: DocumentController [TFG Backend]")
public class DocumentControllerTest {

    @InjectMocks
    private DocumentController documentController;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private DocumentMetadataRepository documentMetadataRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    private Users mockUser;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        mockUser = new Users();
        mockUser.setUser_id(1L);
        mockUser.setUsername("luis_student");
        mockUser.setEmail("luis@tfg.com");

        // Simular que el usuario siempre está autenticado por defecto
        Mockito.when(authentication.isAuthenticated()).thenReturn(true);
        Mockito.when(authentication.getName()).thenReturn("luis_student");
    }

    @Test
    @DisplayName("Debe retornar lista vacía (HTTP 200) cuando el alumno no posee documentos persistidos en PostgreSQL")
    void debeRetornarListaVaciaCuandoNoHayDocumentos() {
        Mockito.when(documentMetadataRepository.findAllByUserUsernameOrderByDocumentidDesc("luis_student"))
                .thenReturn(Collections.emptyList());

        ResponseEntity<?> response = documentController.getUserDocuments(authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof List);
        List<?> bodyList = (List<?>) response.getBody();
        assertTrue(bodyList.isEmpty());
    }

    @Test
    @DisplayName("Debe retornar el listado ordenado de metadatos cuando existen registros asociados en la base de datos")
    void debeRetornarMetadatosDeDocumentos() {
        DocumentMetadata doc1 = new DocumentMetadata(1L, "documents/uuid1_t1.pdf", "Tema1.pdf", LocalDateTime.now(),
                mockUser);
        DocumentMetadata doc2 = new DocumentMetadata(2L, "documents/uuid2_e1.docx", "Ensayo.docx", LocalDateTime.now(),
                mockUser);

        Mockito.when(documentMetadataRepository.findAllByUserUsernameOrderByDocumentidDesc("luis_student"))
                .thenReturn(Arrays.asList(doc1, doc2));

        ResponseEntity<?> response = documentController.getUserDocuments(authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> bodyList = (List<?>) response.getBody();
        assertEquals(2, bodyList.size());

        DocumentMetadata firstResult = (DocumentMetadata) bodyList.get(0);
        assertEquals("Tema1.pdf", firstResult.getOriginalname());
    }

    @Test
    @DisplayName("Debe procesar y persistir con éxito (HTTP 200) un archivo multipart válido (.pdf, .docx, .txt)")
    void debeSubirDocumentoValidoConExito() {
        MockMultipartFile validFile = new MockMultipartFile(
                "file",
                "MiPractica.pdf",
                "application/pdf",
                "Contenido binario simulado de prueba".getBytes());

        Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockUser));
        Mockito.when(fileStorageService.storeFile(any(), eq("documents"))).thenReturn("documents/uuid_mock.pdf");

        ResponseEntity<?> response = documentController.uploadDocument(authentication, validFile);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
        assertNotNull(bodyMap);
        assertEquals("Documento procesado y almacenado con éxito", bodyMap.get("message"));
        assertEquals("MiPractica.pdf", bodyMap.get("originalname"));

        Mockito.verify(documentMetadataRepository, Mockito.times(1)).save(any(DocumentMetadata.class));
    }

    @Test
    @DisplayName("Debe retornar HTTP 400 Bad Request cuando el FileStorageService rechaza el archivo por validación perimetral dual")
    void debeRechazarSubidaPorExtensionInvalida() {
        MockMultipartFile invalidFile = new MockMultipartFile(
                "file",
                "Malware.exe",
                "application/x-msdownload",
                "Bytes maliciosos".getBytes());

        Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockUser));

        // Forzamos la excepción controlada de tu FileStorageService
        Mockito.when(fileStorageService.storeFile(any(), eq("documents")))
                .thenThrow(new IllegalArgumentException(
                        "Extensión de documento no permitida (.exe). Solo se admite PDF, DOCX o TXT."));

        ResponseEntity<?> response = documentController.uploadDocument(authentication, invalidFile);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
        assertNotNull(bodyMap);
        assertEquals("Extensión de documento no permitida (.exe). Solo se admite PDF, DOCX o TXT.",
                bodyMap.get("error"));

        // Verificamos protección perimetral: nunca debe llamar al repositorio
        Mockito.verify(documentMetadataRepository, Mockito.never()).save(any(DocumentMetadata.class));
    }
}
