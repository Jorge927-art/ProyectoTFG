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
import static org.mockito.ArgumentMatchers.anyLong;

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

        // NUEVO MOCK: Añadimos el repositorio de matrículas para que Mockito lo inyecte
        // automáticamente en el controlador
        @Mock
        private EnrollmentRepository enrollmentRepository;

        @Mock
        private Authentication authentication;

        private Users mockSender;
        private Users mockReceiver;

        @BeforeEach
        void setUp() {
                MockitoAnnotations.openMocks(this);

                // Configuración del Emisor (Estudiante Luis)
                mockSender = new Users();
                mockSender.setUser_id(1L);
                mockSender.setUsername("luis_student");
                mockSender.setEmail("luis@tfg.com");
                mockSender.setRole(Role.STUDENT);

                // Configuración del Receptor (Profesor u otro Alumno)
                mockReceiver = new Users();
                mockReceiver.setUser_id(2L);
                mockReceiver.setUsername("profesor_juan");
                mockReceiver.setEmail("juan@tfg.com");
                mockReceiver.setRole(Role.PROFESSOR);

                // Simular que el usuario siempre está autenticado por defecto
                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("luis_student");
        }

        @Test
        @DisplayName("Debe retornar lista vacía (HTTP 200) cuando el alumno no posee documentos recibidos en PostgreSQL")
        void debeRetornarListaVaciaCuandoNoHayDocumentos() {
                Mockito.when(documentMetadataRepository.findReceivedDocumentsByUsername("luis_student"))
                                .thenReturn(Collections.emptyList());

                ResponseEntity<?> response = documentController.getUserDocuments(authentication);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertTrue(response.getBody() instanceof List);
                List<?> bodyList = (List<?>) response.getBody();
                assertTrue(bodyList.isEmpty());
        }

        @Test
        @DisplayName("Debe retornar el listado ordenado de metadatos cuando existen registros recibidos en la base de datos")
        void debeRetornarMetadatosDeDocumentos() {
                DocumentMetadata doc1 = new DocumentMetadata(1L, "documents/uuid1_t1.pdf", "Tema1.pdf",
                                LocalDateTime.now(),
                                mockSender, mockReceiver, null, FolderType.RECEIVED);
                DocumentMetadata doc2 = new DocumentMetadata(2L, "documents/uuid2_e1.docx", "Ensayo.docx",
                                LocalDateTime.now(),
                                mockSender, mockReceiver, null, FolderType.RECEIVED);

                Mockito.when(documentMetadataRepository.findReceivedDocumentsByUsername("luis_student"))
                                .thenReturn(Arrays.asList(doc1, doc2));

                ResponseEntity<?> response = documentController.getUserDocuments(authentication);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                List<?> bodyList = (List<?>) response.getBody();
                assertEquals(2, bodyList.size());

                DocumentMetadata firstResult = (DocumentMetadata) bodyList.get(0);
                assertEquals("Tema1.pdf", firstResult.getOriginalname());
        }

        @Test
        @DisplayName("Debe procesar y persistir con éxito (HTTP 200) un archivo multipart válido duplicando para emisor (SENT) y receptor (RECEIVED)")
        void debeSubirDocumentoValidoConExito() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file",
                                "MiPractica.pdf",
                                "application/pdf",
                                "Contenido binario simulado de prueba".getBytes());

                Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockSender));
                Mockito.when(userRepository.findById(2L)).thenReturn(Optional.of(mockReceiver));
                Mockito.when(fileStorageService.storeFile(any(), eq("documents")))
                                .thenReturn("documents/uuid_mock.pdf");

                ResponseEntity<?> response = documentController.uploadDocument(authentication, validFile, 2L);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertNotNull(bodyMap);
                assertEquals("Documento enviado con éxito al destinatario", bodyMap.get("message"));
                assertEquals("MiPractica.pdf", bodyMap.get("originalname"));

                // Verificación rigurosa: Se deben invocar exactamente dos inserciones en la
                // base de datos (SENT y RECEIVED)
                Mockito.verify(documentMetadataRepository, Mockito.times(2)).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("Debe retornar HTTP 400 Bad Request cuando el FileStorageService rechaza el archivo por validación perimetral dual")
        void debeRechazarSubidaPorExtensionInvalida() {
                MockMultipartFile invalidFile = new MockMultipartFile(
                                "file",
                                "Malware.exe",
                                "application/x-msdownload",
                                "Bytes maliciosos".getBytes());

                Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockSender));
                Mockito.when(userRepository.findById(2L)).thenReturn(Optional.of(mockReceiver));

                Mockito.when(fileStorageService.storeFile(any(), eq("documents")))
                                .thenThrow(new IllegalArgumentException(
                                                "Extensión de documento no permitida (.exe). Solo se admite PDF, DOCX o TXT."));

                ResponseEntity<?> response = documentController.uploadDocument(authentication, invalidFile, 2L);

                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertNotNull(bodyMap);
                assertEquals("Extensión de documento no permitida (.exe). Solo se admite PDF, DOCX o TXT.",
                                bodyMap.get("error"));

                Mockito.verify(documentMetadataRepository, Mockito.never()).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("Debe retornar HTTP 400 Bad Request cuando la regla perimetral frena el autoenvío sin consultar repositorios")
        void debeRechazarAutoEnvio() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file",
                                "MiPractica.pdf",
                                "application/pdf",
                                "Contenido binario simulado de prueba".getBytes());

                Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockSender));

                // Ejecutamos pasando receiverId = 1L (idéntico al del emisor mockSender)
                ResponseEntity<?> response = documentController.uploadDocument(authentication, validFile, 1L);

                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertNotNull(bodyMap);
                assertEquals("No puedes enviarte un documento a ti mismo.", bodyMap.get("error"));

                // Verificamos rigurosamente que NO se haya interactuado con la infraestructura
                // debido al cortocircuito defensivo
                Mockito.verify(userRepository, Mockito.never()).findById(anyLong());
                Mockito.verify(documentMetadataRepository, Mockito.never()).save(any(DocumentMetadata.class));
        }
}
