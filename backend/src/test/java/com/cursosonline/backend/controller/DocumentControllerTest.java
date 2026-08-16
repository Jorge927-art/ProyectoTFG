package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.UserDirectoryDTO;
import com.cursosonline.backend.entities.DocumentMetadata;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.FolderType;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.DocumentMetadataRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.services.FileStorageService;
import com.cursosonline.backend.services.ProfessorCourseAlertService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;

@DisplayName("Suite de Pruebas Unitarias de Aislamiento: DocumentController [TFG Backend]")
public class DocumentControllerTest {

        private MockMvc mockMvc;

        @InjectMocks
        private DocumentController documentController;

        @Mock
        private FileStorageService fileStorageService;

        @Mock
        private DocumentMetadataRepository documentMetadataRepository;

        @Mock
        private CoursesRepository coursesRepository;

        @Mock
        private UserRepository userRepository;

        // NUEVO MOCK: Añadimos el repositorio de matrículas para que Mockito lo inyecte
        // automáticamente en el controlador
        @Mock
        private EnrollmentRepository enrollmentRepository;

        @Mock
        private ProfessorCourseAlertService professorCourseAlertService;

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
                this.mockMvc = org.springframework.test.web.servlet.setup.MockMvcBuilders
                                .standaloneSetup(documentController)
                                .build();
        }

        @Test
        @DisplayName("Debe retornar lista vacía (HTTP 200) cuando el alumno no posee documentos recibidos en PostgreSQL")
        void debeRetornarListaVaciaCuandoNoHayDocumentos() {
                Mockito.when(documentMetadataRepository.findReceivedGeneralDocumentsByUsername("luis_student"))
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
                DocumentMetadata doc1 = new DocumentMetadata();
                doc1.setDocumentid(1L);
                doc1.setFilename("documents/uuid1_t1.pdf");
                doc1.setOriginalname("Tema1.pdf");
                doc1.setUpload_date(LocalDateTime.now());
                doc1.setSender(mockSender);
                doc1.setReceiver(mockReceiver);
                doc1.setCourse(null);
                doc1.setFolder_type(FolderType.RECEIVED);

                DocumentMetadata doc2 = new DocumentMetadata();
                doc2.setDocumentid(2L);
                doc2.setFilename("documents/uuid2_e1.docx");
                doc2.setOriginalname("Ensayo.docx");
                doc2.setUpload_date(LocalDateTime.now());
                doc2.setSender(mockSender);
                doc2.setReceiver(mockReceiver);
                doc2.setCourse(null);
                doc2.setFolder_type(FolderType.RECEIVED);

                Mockito.when(documentMetadataRepository.findReceivedGeneralDocumentsByUsername("luis_student"))
                                .thenReturn(Arrays.asList(doc1, doc2));

                ResponseEntity<?> response = documentController.getUserDocuments(authentication);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                List<?> bodyList = (List<?>) response.getBody();
                assertEquals(2, bodyList.size());

                Map<?, ?> firstResult = (Map<?, ?>) bodyList.get(0);
                assertEquals("Tema1.pdf", firstResult.get("originalname"));
        }

        @Test
        @DisplayName("Debe devolver 400 cuando el archivo subido está vacío")
        void debeRechazarSubidaConArchivoVacio() {
                MockMultipartFile emptyFile = new MockMultipartFile("file", "vacío.pdf", "application/pdf",
                                new byte[0]);

                ResponseEntity<?> response = documentController.uploadDocument(authentication, emptyFile, 2L);

                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("El archivo transmitido está vacío o es inválido.", bodyMap.get("error"));
        }

        @Test
        @DisplayName("Debe devolver 400 cuando el archivo supera el límite de tamaño")
        void debeRechazarSubidaPorTamanoExcedido() {
                byte[] payload = new byte[(int) (101L * 1024L * 1024L)];
                MockMultipartFile oversizedFile = new MockMultipartFile(
                                "file",
                                "pesado.pdf",
                                "application/pdf",
                                payload);

                ResponseEntity<?> response = documentController.uploadDocument(authentication, oversizedFile, 2L);

                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("El archivo excede el límite de 100MB configurado para documentos académicos.",
                                bodyMap.get("error"));
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
                Mockito.when(fileStorageService.storeDocumentFile(any(),
                                eq(FileStorageService.DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS)))
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
        @DisplayName("Debe enviar desde alumno a profesor con curso y mostrar el recibido en bandeja general del profesor")
        void debeEnrutarEnvioDeAlumnoAProfesorConCursoABandejaGeneral() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file", "documento-profesor.pdf", "application/pdf", "Contenido".getBytes());

                Courses course = new Courses();
                course.setCourse_id(501L);
                Users professor = new Users();
                professor.setUser_id(8L);
                professor.setUsername("profesor_juan");
                professor.setRole(Role.PROFESSOR);

                Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockSender));
                Mockito.when(userRepository.findById(8L)).thenReturn(Optional.of(professor));
                Mockito.when(enrollmentRepository.existsByUsernameAndCourseId("luis_student", 501L))
                                .thenReturn(true);
                Mockito.when(coursesRepository.findById(501L)).thenReturn(Optional.of(course));
                Mockito.when(fileStorageService.storeDocumentFile(any(),
                                eq(FileStorageService.DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS)))
                                .thenReturn("documents/alumno-profesor.pdf");

                ResponseEntity<?> response = documentController.uploadDocument(authentication, validFile, 8L, 501L);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                ArgumentCaptor<DocumentMetadata> metadataCaptor = ArgumentCaptor.forClass(DocumentMetadata.class);
                Mockito.verify(documentMetadataRepository, Mockito.times(2)).save(metadataCaptor.capture());

                List<DocumentMetadata> saved = metadataCaptor.getAllValues();
                DocumentMetadata sent = saved.stream()
                                .filter(document -> document.getFolder_type() == FolderType.SENT)
                                .findFirst().orElseThrow();
                DocumentMetadata received = saved.stream()
                                .filter(document -> document.getFolder_type() == FolderType.RECEIVED)
                                .findFirst().orElseThrow();

                assertEquals(501L, sent.getCourse().getCourse_id());
                assertNull(received.getCourse());
        }

        @Test
        @DisplayName("Debe enviar desde alumno a otro alumno con curso solo en salida y recibido en bandeja general")
        void debeEnrutarEnvioDeAlumnoAOtroAlumnoConCursoABandejaGeneral() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file", "documento-companero.pdf", "application/pdf", "Contenido".getBytes());

                Courses course = new Courses();
                course.setCourse_id(502L);
                Users studentReceiver = new Users();
                studentReceiver.setUser_id(9L);
                studentReceiver.setUsername("pedro_student");
                studentReceiver.setRole(Role.STUDENT);

                Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockSender));
                Mockito.when(userRepository.findById(9L)).thenReturn(Optional.of(studentReceiver));
                Mockito.when(enrollmentRepository.existsByUsernameAndCourseId("luis_student", 502L))
                                .thenReturn(true);
                Mockito.when(coursesRepository.findById(502L)).thenReturn(Optional.of(course));
                Mockito.when(fileStorageService.storeDocumentFile(any(),
                                eq(FileStorageService.DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS)))
                                .thenReturn("documents/alumno-companero.pdf");

                ResponseEntity<?> response = documentController.uploadDocument(authentication, validFile, 9L, 502L);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                ArgumentCaptor<DocumentMetadata> metadataCaptor = ArgumentCaptor.forClass(DocumentMetadata.class);
                Mockito.verify(documentMetadataRepository, Mockito.times(2)).save(metadataCaptor.capture());

                List<DocumentMetadata> saved = metadataCaptor.getAllValues();
                DocumentMetadata sent = saved.stream()
                                .filter(document -> document.getFolder_type() == FolderType.SENT)
                                .findFirst().orElseThrow();
                DocumentMetadata received = saved.stream()
                                .filter(document -> document.getFolder_type() == FolderType.RECEIVED)
                                .findFirst().orElseThrow();

                assertEquals(502L, sent.getCourse().getCourse_id());
                assertNull(received.getCourse());
        }

        @Test
        @DisplayName("Debe enrutar un documento de alumno a administrador a la bandeja general del admin")
        void debeEnrutarEnvioDeAlumnoAAdministradorABandejaGeneral() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file", "documento-admin.pdf", "application/pdf", "Contenido".getBytes());

                Courses course = new Courses();
                course.setCourse_id(503L);
                Users adminReceiver = new Users();
                adminReceiver.setUser_id(10L);
                adminReceiver.setUsername("Jorge");
                adminReceiver.setRole(Role.ADMIN);

                Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockSender));
                Mockito.when(userRepository.findById(10L)).thenReturn(Optional.of(adminReceiver));
                Mockito.when(enrollmentRepository.existsByUsernameAndCourseId("luis_student", 503L))
                                .thenReturn(true);
                Mockito.when(coursesRepository.findById(503L)).thenReturn(Optional.of(course));
                Mockito.when(fileStorageService.storeDocumentFile(any(),
                                eq(FileStorageService.DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS)))
                                .thenReturn("documents/alumno-admin.pdf");

                ResponseEntity<?> response = documentController.uploadDocument(authentication, validFile, 10L, 503L);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                ArgumentCaptor<DocumentMetadata> metadataCaptor = ArgumentCaptor.forClass(DocumentMetadata.class);
                Mockito.verify(documentMetadataRepository, Mockito.times(2)).save(metadataCaptor.capture());
                DocumentMetadata received = metadataCaptor.getAllValues().stream()
                                .filter(document -> document.getFolder_type() == FolderType.RECEIVED)
                                .findFirst().orElseThrow();

                assertNull(received.getCourse());
                assertEquals("Jorge", received.getReceiver().getUsername());
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

                Mockito.when(fileStorageService.storeDocumentFile(any(),
                                eq(FileStorageService.DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS)))
                                .thenThrow(new IllegalArgumentException(
                                                "Extensión de documento no permitida (exe). Solo se admite PDF, DOCX, TXT o MP4."));

                ResponseEntity<?> response = documentController.uploadDocument(authentication, invalidFile, 2L);

                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertNotNull(bodyMap);
                assertEquals("Extensión de documento no permitida (exe). Solo se admite PDF, DOCX, TXT o MP4.",
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

        @Test
        @DisplayName("Debe procesar entrega académica con selección determinista cuando existe una única matrícula válida")
        void debeSubirAssignmentConMatriculaUnica() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file",
                                "Entrega2.pdf",
                                "application/pdf",
                                "Contenido de entrega única".getBytes());

                Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockSender));
                Mockito.when(userRepository.findByUsername("profesor_juan")).thenReturn(Optional.of(mockReceiver));

                Courses course = new Courses();
                course.setCourse_id(101L);
                course.setInstructors("profesor_juan");

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(2001L);
                enrollment.setUser(mockSender);
                enrollment.setCourse(course);

                // SINCRONIZACIÓN EXPLICITA CON TU CONTROLADOR REAL: Usamos el ID del usuario
                // emisor (1L)
                Mockito.when(enrollmentRepository.findAllByUserIdWithCourses(1L))
                                .thenReturn(List.of(enrollment));

                Mockito.when(fileStorageService.storeDocumentFile(any(),
                                eq(FileStorageService.DocumentValidationProfile.BASIC_DOCUMENTS)))
                                .thenReturn("documents/uuid_assignment.pdf");

                ResponseEntity<?> response = documentController.uploadAssignmentDocument(
                                authentication,
                                validFile,
                                101L,
                                "EXAMEN");

                assertEquals(HttpStatus.OK, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertNotNull(bodyMap);
                assertEquals("documents/uuid_assignment.pdf", bodyMap.get("filename"));
                assertEquals("Entrega2.pdf", bodyMap.get("originalname"));

                ArgumentCaptor<DocumentMetadata> metadataCaptor = ArgumentCaptor.forClass(DocumentMetadata.class);
                Mockito.verify(documentMetadataRepository, Mockito.times(2)).save(metadataCaptor.capture());
                assertEquals(List.of("EXAMEN", "EXAMEN"), metadataCaptor.getAllValues().stream()
                                .map(metadata -> metadata.getEvaluation_type())
                                .toList());
        }

        @Test
        @DisplayName("Debe rechazar vídeo cuando un alumno intenta enviar un examen")
        void debeRechazarVideoEnAssignmentDeExamen() {
                MockMultipartFile video = new MockMultipartFile(
                                "file", "examen.mp4", "video/mp4", "video".getBytes());
                Courses course = new Courses();
                course.setCourse_id(101L);
                course.setInstructors("profesor_juan");
                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(2002L);
                enrollment.setUser(mockSender);
                enrollment.setCourse(course);

                Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockSender));
                Mockito.when(enrollmentRepository.findAllByUserIdWithCourses(1L)).thenReturn(List.of(enrollment));

                ResponseEntity<?> response = documentController.uploadAssignmentDocument(
                                authentication, video, 101L, "EXAMEN");

                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                assertTrue(((Map<?, ?>) response.getBody()).get("error").toString()
                                .contains("Los exámenes solo admiten archivos PDF"));
                Mockito.verify(fileStorageService, never()).storeDocumentFile(any(), any());
                Mockito.verify(documentMetadataRepository, never()).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("Debe retornar HTTP 409 Conflict cuando existen múltiples matrículas del mismo alumno para la misma asignatura")
        void debeRetornarConflictSiHayMatriculasDuplicadasEnUploadAssignment() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file",
                                "Entrega1.pdf",
                                "application/pdf",
                                "Contenido de entrega".getBytes());

                Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockSender));

                Courses course = new Courses();
                course.setCourse_id(101L);
                course.setInstructors("profesor_juan");

                Enrollment enrollmentA = new Enrollment();
                enrollmentA.setEnrollmentid(1001L);
                enrollmentA.setUser(mockSender);
                enrollmentA.setCourse(course);

                Enrollment enrollmentB = new Enrollment();
                enrollmentB.setEnrollmentid(1002L);
                enrollmentB.setUser(mockSender);
                enrollmentB.setCourse(course);

                // Simulamos el escenario conflictivo que tu controlador intercepta con un 409
                Mockito.when(enrollmentRepository.findAllByUserIdWithCourses(1L))
                                .thenReturn(List.of(enrollmentA, enrollmentB));

                ResponseEntity<?> response = documentController.uploadAssignmentDocument(
                                authentication,
                                validFile,
                                101L,
                                "TRABAJO");

                assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertNotNull(bodyMap);
                assertEquals("Inconsistencia detectada: existen múltiples matrículas para el mismo alumno y asignatura.",
                                bodyMap.get("error"));

                Mockito.verify(documentMetadataRepository, Mockito.never()).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("Debe devolver las entregas de una matrícula concreta para el profesor autorizado")
        void debeDevolverDocumentosPorEnrollmentIdSiProfesorAutorizado() {
                Long enrollmentId = 2001L;
                Mockito.when(authentication.getName()).thenReturn("profesor_juan");
                Mockito.when(enrollmentRepository.isInstructorAuthorizedForEnrollment(enrollmentId, "profesor_juan"))
                                .thenReturn(true);

                Courses course = new Courses();
                course.setCourse_id(101L);

                DocumentMetadata doc = new DocumentMetadata();
                doc.setDocumentid(99L);
                doc.setFilename("documents/uuid_feedback.pdf");
                doc.setOriginalname("Entrega_Final.pdf");
                doc.setSender(mockSender);
                doc.setReceiver(mockReceiver);
                doc.setCourse(course);
                doc.setFolder_type(FolderType.RECEIVED);

                Mockito.when(documentMetadataRepository
                                .findReceivedDocumentsByEnrollmentIdForInstructor(enrollmentId, "profesor_juan"))
                                .thenReturn(List.of(doc));

                ResponseEntity<?> response = documentController.getDocumentsByEnrollmentId(authentication,
                                enrollmentId);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertTrue(response.getBody() instanceof List);

                List<?> payload = (List<?>) response.getBody();
                assertEquals(1, payload.size());
                Map<?, ?> first = (Map<?, ?>) payload.get(0);
                assertEquals("Entrega_Final.pdf", first.get("originalname"));
        }

        @Test
        @DisplayName("Debe devolver 401 cuando el directorio administrativo se consulta sin autenticación válida")
        void debeRechazarDirectorioAdminSinAutenticacionValida() {
                ResponseEntity<?> response = documentController.getAdminUsersDirectory(null);

                assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("No autenticado o token JWT inválido.", bodyMap.get("error"));
        }

        @Test
        @DisplayName("Debe devolver 403 cuando un usuario no instructor intenta ver entregas por matrícula")
        void debeRechazarEntregasPorMatriculaSiNoEsInstructorAutorizado() {
                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("alumno_no_autorizado");
                Mockito.when(enrollmentRepository.isInstructorAuthorizedForEnrollment(10L, "alumno_no_autorizado"))
                                .thenReturn(false);

                ResponseEntity<?> response = documentController.getDocumentsByEnrollmentId(authentication, 10L);

                assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertTrue(bodyMap.get("error").toString().contains("Acceso denegado"));
        }

        @Test
        @DisplayName("Debe devolver 403 si un usuario no participante intenta descargar un documento privado")
        void debeRechazarDescargaSiNoEsEmisorNiReceptor() {
                Long documentId = 11L;
                DocumentMetadata privateDoc = new DocumentMetadata();
                privateDoc.setSender(mockSender);
                privateDoc.setReceiver(mockReceiver);
                privateDoc.setFilename("documents/secured.pdf");
                privateDoc.setOriginalname("privado.pdf");

                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("intruso");
                Mockito.when(documentMetadataRepository.findById(documentId)).thenReturn(Optional.of(privateDoc));

                ResponseEntity<?> response = documentController.downloadDocumentSecure(authentication, documentId);

                assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertTrue(bodyMap.get("error").toString().contains("Acceso denegado"));
                Mockito.verify(fileStorageService, Mockito.never()).loadFileAsResource(anyString());
        }

        @Test
        @DisplayName("Debe devolver 401 al solicitar la agenda de profesores sin autenticación")
        void debeRechazarDirectorioDeProfesoresSinAutenticacion() {
                ResponseEntity<?> response = documentController.getMyTeachers(null);

                assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("No autenticado.", bodyMap.get("error"));
        }

        @Test
        @DisplayName("Debe ignorar matrículas sin curso o sin instructores sin romper la respuesta")
        void debeIgnorarMatriculasSinCursoOSinInstructoresEnDirectorioProfesores() {
                Enrollment enrollmentWithoutCourse = new Enrollment();
                enrollmentWithoutCourse.setEnrollmentid(9001L);
                enrollmentWithoutCourse.setUser(mockSender);
                enrollmentWithoutCourse.setCourse(null);

                Enrollment enrollmentWithoutInstructors = new Enrollment();
                enrollmentWithoutInstructors.setEnrollmentid(9002L);
                enrollmentWithoutInstructors.setUser(mockSender);
                Courses courseWithoutInstructors = new Courses();
                courseWithoutInstructors.setCourse_id(777L);
                courseWithoutInstructors.setInstructors(null);
                enrollmentWithoutInstructors.setCourse(courseWithoutInstructors);

                Users professor = new Users();
                professor.setUser_id(10L);
                professor.setUsername("profesor_juan");
                professor.setEmail("juan@tfg.com");
                professor.setRole(Role.PROFESSOR);
                professor.setEnabled(true);

                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("luis_student");
                Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockSender));
                Mockito.when(enrollmentRepository.findAllByUserIdWithCourses(mockSender.getUser_id()))
                                .thenReturn(List.of(enrollmentWithoutCourse, enrollmentWithoutInstructors));
                Mockito.when(userRepository.findByRole(Role.PROFESSOR)).thenReturn(List.of(professor));

                ResponseEntity<?> response = documentController.getMyTeachers(authentication);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertTrue(response.getBody() instanceof List);
                List<?> payload = (List<?>) response.getBody();
                assertTrue(payload.isEmpty());
        }

        @Test
        @DisplayName("Debe tolerar profesores sin rol definido en el directorio de profesores")
        void debeTolerarProfesoresSinRolDefinidoEnDirectorioProfesores() {
                Users professorWithoutRole = new Users();
                professorWithoutRole.setUser_id(10L);
                professorWithoutRole.setUsername("profesor_sin_rol");
                professorWithoutRole.setEmail("sinrol@tfg.com");
                professorWithoutRole.setRole(null);
                professorWithoutRole.setEnabled(true);

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(9003L);
                enrollment.setUser(mockSender);
                Courses course = new Courses();
                course.setCourse_id(888L);
                course.setInstructors("profesor_sin_rol");
                enrollment.setCourse(course);

                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("luis_student");
                Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockSender));
                Mockito.when(enrollmentRepository.findAllByUserIdWithCourses(mockSender.getUser_id()))
                                .thenReturn(List.of(enrollment));
                Mockito.when(userRepository.findByRole(Role.PROFESSOR)).thenReturn(List.of(professorWithoutRole));

                ResponseEntity<?> response = documentController.getMyTeachers(authentication);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertTrue(response.getBody() instanceof List);
                List<?> payload = (List<?>) response.getBody();
                assertEquals(1, payload.size());
                UserDirectoryDTO teacher = (UserDirectoryDTO) payload.get(0);
                assertEquals("UNKNOWN", teacher.getRole());
        }

        @Test
        @DisplayName("Debe ocultar lógicamente documentos generales recibidos del usuario autenticado")
        void debeOcultarDocumentosGeneralesRecibidos() {
                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("luis_student");
                Mockito.when(documentMetadataRepository.hideAllReceivedGeneralDocumentsByUsername("luis_student"))
                                .thenReturn(3);

                ResponseEntity<?> response = documentController.hideAllReceivedGeneralDocuments(authentication);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                Map<?, ?> body = (Map<?, ?>) response.getBody();
                assertNotNull(body);
                assertEquals(3, body.get("hiddenCount"));
                Mockito.verify(documentMetadataRepository, Mockito.times(1))
                                .hideAllReceivedGeneralDocumentsByUsername("luis_student");
        }

        @Test
        @DisplayName("Debe ocultar lógicamente documentos generales enviados del usuario autenticado")
        void debeOcultarDocumentosGeneralesEnviados() {
                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("luis_student");
                Mockito.when(documentMetadataRepository.hideAllSentGeneralDocumentsByUsername("luis_student"))
                                .thenReturn(4);

                ResponseEntity<?> response = documentController.hideAllSentGeneralDocuments(authentication);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                Map<?, ?> body = (Map<?, ?>) response.getBody();
                assertNotNull(body);
                assertEquals(4, body.get("hiddenCount"));
                Mockito.verify(documentMetadataRepository, Mockito.times(1))
                                .hideAllSentGeneralDocumentsByUsername("luis_student");
        }

        @Test
        @DisplayName("Debe devolver 401 si se intenta limpiar bandejas sin autenticación")
        void debeRechazarOcultacionSinAutenticacion() {
                ResponseEntity<?> receivedResponse = documentController.hideAllReceivedGeneralDocuments(null);
                ResponseEntity<?> sentResponse = documentController.hideAllSentGeneralDocuments(null);

                assertEquals(HttpStatus.UNAUTHORIZED, receivedResponse.getStatusCode());
                assertEquals(HttpStatus.UNAUTHORIZED, sentResponse.getStatusCode());
        }

        @Test
        @DisplayName("Debe devolver 500 controlado si el repositorio falla al recuperar el directorio administrativo")
        void debeDevolverErrorControladoSiElRepositorioFalla() {
                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(userRepository.findAll()).thenThrow(new RuntimeException("boom"));

                ResponseEntity<?> response = documentController.getAdminUsersDirectory(authentication);

                assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertTrue(bodyMap.get("error").toString()
                                .contains("Error al recuperar el directorio administrativo de usuarios"));
        }

        @Test
        @DisplayName("Debe procesar envío masivo del profesor sin violar receiver_id al enviar a toda la clase")
        void debeProcesarEnvioMasivoProfesorConReceiverIdCero() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file",
                                "guia_general.pdf",
                                "application/pdf",
                                "Contenido para toda la clase".getBytes());

                Users studentA = new Users();
                studentA.setUser_id(21L);
                studentA.setUsername("student_a");
                studentA.setRole(Role.STUDENT);

                Users studentB = new Users();
                studentB.setUser_id(22L);
                studentB.setUsername("student_b");
                studentB.setRole(Role.STUDENT);

                Courses course = new Courses();
                course.setCourse_id(2958L);

                Enrollment enrollmentA = new Enrollment();
                enrollmentA.setEnrollmentid(5001L);
                enrollmentA.setUser(studentA);
                enrollmentA.setCourse(course);

                Enrollment enrollmentB = new Enrollment();
                enrollmentB.setEnrollmentid(5002L);
                enrollmentB.setUser(studentB);
                enrollmentB.setCourse(course);

                Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockSender));
                Mockito.when(coursesRepository.findById(2958L)).thenReturn(Optional.of(course));
                Mockito.when(fileStorageService.storeDocumentFile(any(),
                                eq(FileStorageService.DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS)))
                                .thenReturn("documents/uuid_bulk.pdf");
                Mockito.when(enrollmentRepository.findActiveStudentEnrollmentsByCourseId(2958L))
                                .thenReturn(List.of(enrollmentA, enrollmentB));

                ResponseEntity<?> response = documentController.professorUploadDocument(authentication, validFile,
                                2958L,
                                0L,
                                "DOCUMENTO");

                assertEquals(HttpStatus.OK, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertNotNull(bodyMap);
                assertEquals("Documento transmitido con éxito de forma masiva a toda la clase", bodyMap.get("message"));
                assertEquals(2, bodyMap.get("totalStudents"));

                // 2 alumnos => 4 registros (SENT + RECEIVED por alumno)
                Mockito.verify(documentMetadataRepository, Mockito.times(4)).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("Debe rechazar vídeo cuando un profesor envía un examen")
        void debeRechazarVideoEnProfessorUploadDeExamen() {
                MockMultipartFile video = new MockMultipartFile(
                                "file", "examen.mp4", "video/mp4", "video".getBytes());
                Users professor = new Users();
                professor.setUser_id(30L);
                professor.setUsername("profesor_juan");
                professor.setRole(Role.PROFESSOR);
                Users student = new Users();
                student.setUser_id(31L);
                student.setUsername("alumno_luis");
                student.setRole(Role.STUDENT);
                Courses course = new Courses();
                course.setCourse_id(2959L);

                Mockito.when(authentication.getName()).thenReturn("profesor_juan");
                Mockito.when(userRepository.findByUsername("profesor_juan")).thenReturn(Optional.of(professor));
                Mockito.when(coursesRepository.findById(2959L)).thenReturn(Optional.of(course));
                Mockito.when(userRepository.findById(31L)).thenReturn(Optional.of(student));

                ResponseEntity<?> response = documentController.professorUploadDocument(
                                authentication, video, 2959L, 31L, "EXAMEN");

                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                assertTrue(((Map<?, ?>) response.getBody()).get("error").toString()
                                .contains("Los exámenes solo admiten archivos PDF"));
                Mockito.verify(fileStorageService, never()).storeDocumentFile(any(), any());
                Mockito.verify(documentMetadataRepository, never()).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("Debe enrutar TRABAJO individual a bandeja de asignaturas del alumno (course no nulo)")
        void debeEnrutarTrabajoIndividualABandejaAsignaturas() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file",
                                "trabajo_tema_3.pdf",
                                "application/pdf",
                                "Entrega individual de trabajo".getBytes());

                Users professor = new Users();
                professor.setUser_id(10L);
                professor.setUsername("profesor_juan");
                professor.setRole(Role.PROFESSOR);

                Users student = new Users();
                student.setUser_id(77L);
                student.setUsername("student_objetivo");
                student.setRole(Role.STUDENT);

                Courses course = new Courses();
                course.setCourse_id(3001L);
                course.setTitle("Arquitectura de Software");

                Mockito.when(authentication.getName()).thenReturn("profesor_juan");
                Mockito.when(userRepository.findByUsername("profesor_juan")).thenReturn(Optional.of(professor));
                Mockito.when(coursesRepository.findById(3001L)).thenReturn(Optional.of(course));
                Mockito.when(userRepository.findById(77L)).thenReturn(Optional.of(student));
                Mockito.when(fileStorageService.storeDocumentFile(any(),
                                eq(FileStorageService.DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS)))
                                .thenReturn("documents/uuid_trabajo.pdf");

                ResponseEntity<?> response = documentController.professorUploadDocument(
                                authentication,
                                validFile,
                                3001L,
                                77L,
                                "TRABAJO");

                assertEquals(HttpStatus.OK, response.getStatusCode());

                ArgumentCaptor<DocumentMetadata> metadataCaptor = ArgumentCaptor.forClass(DocumentMetadata.class);
                Mockito.verify(documentMetadataRepository, Mockito.times(2)).save(metadataCaptor.capture());

                List<DocumentMetadata> saved = metadataCaptor.getAllValues();
                DocumentMetadata sent = saved.stream()
                                .filter(d -> d.getFolder_type() == FolderType.SENT)
                                .findFirst()
                                .orElseThrow();
                DocumentMetadata received = saved.stream()
                                .filter(d -> d.getFolder_type() == FolderType.RECEIVED)
                                .findFirst()
                                .orElseThrow();

                assertNotNull(sent.getCourse(), "SENT debe quedar asociado al curso de trabajo.");
                assertEquals(3001L, sent.getCourse().getCourse_id());
                assertEquals("TRABAJO", sent.getEvaluation_type());

                assertNotNull(received.getCourse(), "RECEIVED de trabajo debe quedar en bandeja de asignaturas.");
                assertEquals(3001L, received.getCourse().getCourse_id());
                assertEquals("TRABAJO", received.getEvaluation_type());
                assertEquals("student_objetivo", received.getReceiver().getUsername());
        }

        @Test
        @DisplayName("Debe enrutar DOCUMENTO masivo a Gestion de Documentos Academicos (RECEIVED con course nulo)")
        void debeEnrutarDocumentoMasivoABandejaGeneralAlumno() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file",
                                "guia_general.pdf",
                                "application/pdf",
                                "Guia general para la clase".getBytes());

                Users professor = new Users();
                professor.setUser_id(10L);
                professor.setUsername("profesor_juan");
                professor.setRole(Role.PROFESSOR);

                Users studentA = new Users();
                studentA.setUser_id(21L);
                studentA.setUsername("student_a");
                studentA.setRole(Role.STUDENT);

                Users studentB = new Users();
                studentB.setUser_id(22L);
                studentB.setUsername("student_b");
                studentB.setRole(Role.STUDENT);

                Courses course = new Courses();
                course.setCourse_id(2958L);

                Enrollment enrollmentA = new Enrollment();
                enrollmentA.setEnrollmentid(5001L);
                enrollmentA.setUser(studentA);
                enrollmentA.setCourse(course);

                Enrollment enrollmentB = new Enrollment();
                enrollmentB.setEnrollmentid(5002L);
                enrollmentB.setUser(studentB);
                enrollmentB.setCourse(course);

                Mockito.when(authentication.getName()).thenReturn("profesor_juan");
                Mockito.when(userRepository.findByUsername("profesor_juan")).thenReturn(Optional.of(professor));
                Mockito.when(coursesRepository.findById(2958L)).thenReturn(Optional.of(course));
                Mockito.when(fileStorageService.storeDocumentFile(any(),
                                eq(FileStorageService.DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS)))
                                .thenReturn("documents/uuid_bulk_doc.pdf");
                Mockito.when(enrollmentRepository.findActiveStudentEnrollmentsByCourseId(2958L))
                                .thenReturn(List.of(enrollmentA, enrollmentB));

                ResponseEntity<?> response = documentController.professorUploadDocument(
                                authentication,
                                validFile,
                                2958L,
                                0L,
                                "DOCUMENTO");

                assertEquals(HttpStatus.OK, response.getStatusCode());

                ArgumentCaptor<DocumentMetadata> metadataCaptor = ArgumentCaptor.forClass(DocumentMetadata.class);
                Mockito.verify(documentMetadataRepository, Mockito.times(4)).save(metadataCaptor.capture());

                List<DocumentMetadata> saved = metadataCaptor.getAllValues();
                List<DocumentMetadata> sentDocs = saved.stream()
                                .filter(d -> d.getFolder_type() == FolderType.SENT)
                                .toList();
                List<DocumentMetadata> receivedDocs = saved.stream()
                                .filter(d -> d.getFolder_type() == FolderType.RECEIVED)
                                .toList();

                assertEquals(2, sentDocs.size());
                assertEquals(2, receivedDocs.size());

                assertTrue(sentDocs.stream()
                                .allMatch(d -> d.getCourse() != null && d.getCourse().getCourse_id() == 2958L),
                                "Los registros SENT deben conservar el curso para trazabilidad del emisor.");

                assertTrue(receivedDocs.stream().allMatch(d -> d.getCourse() == null),
                                "Los registros RECEIVED de tipo DOCUMENTO deben caer en la bandeja general (sin curso).");
                assertTrue(receivedDocs.stream().allMatch(d -> "DOCUMENTO".equals(d.getEvaluation_type())));
        }

        @Test
        @DisplayName("Debe devolver el directorio administrativo de usuarios para poblar el selector del panel")
        void debeDevolverDirectorioAdministrativoDeUsuarios() {
                Users admin = new Users();
                admin.setUser_id(90L);
                admin.setUsername("root_admin");
                admin.setRole(Role.ADMIN);
                admin.setEnabled(true);

                Users student = new Users();
                student.setUser_id(91L);
                student.setUsername("laura_student");
                student.setRole(Role.STUDENT);
                student.setEnabled(true);

                Mockito.when(userRepository.findAll()).thenReturn(List.of(admin, student));

                ResponseEntity<?> response = documentController.getAdminUsersDirectory(authentication);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertTrue(response.getBody() instanceof List);
                List<?> payload = (List<?>) response.getBody();
                assertEquals(2, payload.size());
                Map<?, ?> first = (Map<?, ?>) payload.get(0);
                assertEquals("root_admin", first.get("username"));
        }

        @Test
        @DisplayName("Debe devolver el directorio administrativo de cursos para poblar el selector colectivo")
        void debeDevolverDirectorioAdministrativoDeCursos() {
                Courses course = new Courses();
                course.setCourse_id(77L);
                course.setTitle("Álgebra");
                course.setCategory("Matemáticas");

                Mockito.when(coursesRepository.findAll(any(org.springframework.data.domain.Sort.class)))
                                .thenReturn(List.of(course));

                ResponseEntity<?> response = documentController.getAdminCoursesDirectory(authentication);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertTrue(response.getBody() instanceof List);
                List<?> payload = (List<?>) response.getBody();
                Map<?, ?> first = (Map<?, ?>) payload.get(0);
                assertEquals(77L, first.get("courseId"));
                assertEquals("Álgebra", first.get("title"));
        }

        @Test
        @DisplayName("Debe devolver 401 cuando el directorio administrativo de cursos se consulta sin autenticación")
        void debeRechazarDirectorioAdminCursosSinAutenticacion() {
                ResponseEntity<?> response = documentController.getAdminCoursesDirectory(null);

                assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("No autenticado o token JWT inválido.", bodyMap.get("error"));
        }

        @Test
        @DisplayName("Debe devolver 500 controlado si falla la consulta del directorio administrativo de cursos")
        void debeDevolverErrorControladoSiFallaDirectorioAdminCursos() {
                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(coursesRepository.findAll(any(org.springframework.data.domain.Sort.class)))
                                .thenThrow(new RuntimeException("boom-courses"));

                ResponseEntity<?> response = documentController.getAdminCoursesDirectory(authentication);

                assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertTrue(bodyMap.get("error").toString()
                                .contains("Error al recuperar el directorio administrativo de cursos"));
        }

        @Test
        @DisplayName("Debe devolver destinatarios académicos del profesor por curso incluyendo alumnos, profesorado y admins")
        void debeDevolverDestinatariosAcademicosDelProfesorPorCurso() {
                Users professor = new Users();
                professor.setUser_id(10L);
                professor.setUsername("profesor_juan");
                professor.setEmail("juan@tfg.com");
                professor.setRole(Role.PROFESSOR);
                professor.setEnabled(true);

                Users student = new Users();
                student.setUser_id(20L);
                student.setUsername("laura_student");
                student.setEmail("laura@tfg.com");
                student.setRole(Role.STUDENT);
                student.setEnabled(true);

                Users admin = new Users();
                admin.setUser_id(30L);
                admin.setUsername("root_admin");
                admin.setEmail("admin@tfg.com");
                admin.setRole(Role.ADMIN);
                admin.setEnabled(true);

                Courses course = new Courses();
                course.setCourse_id(501L);
                course.setTitle("Programación I");
                course.setInstructors("profesor_juan");

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(7001L);
                enrollment.setUser(student);
                enrollment.setCourse(course);

                Mockito.when(authentication.getName()).thenReturn("profesor_juan");
                Mockito.when(userRepository.findByUsername("profesor_juan")).thenReturn(Optional.of(professor));
                Mockito.when(coursesRepository.findById(501L)).thenReturn(Optional.of(course));
                Mockito.when(enrollmentRepository.findActiveStudentEnrollmentsByCourseId(501L))
                                .thenReturn(List.of(enrollment));
                Mockito.when(userRepository.findByRole(Role.PROFESSOR)).thenReturn(List.of(professor));
                Mockito.when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of(admin));

                ResponseEntity<?> response = documentController.getProfessorRecipientsByCourse(authentication, 501L);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertTrue(response.getBody() instanceof List);

                List<?> payload = (List<?>) response.getBody();
                assertEquals(2, payload.size());
        }

        @Test
        @DisplayName("Debe devolver 401 cuando el profesor consulta destinatarios sin autenticación")
        void debeRechazarDestinatariosProfesorSinAutenticacion() {
                ResponseEntity<?> response = documentController.getProfessorRecipientsByCourse(null, 501L);

                assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("No autenticado o token JWT inválido.", bodyMap.get("error"));
        }

        @Test
        @DisplayName("Debe devolver 500 controlado cuando el principal autenticado llega en blanco")
        void debeDevolverErrorControladoEnDestinatariosSiPrincipalEnBlanco() {
                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("   ");

                ResponseEntity<?> response = documentController.getProfessorRecipientsByCourse(authentication, 501L);

                assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertTrue(bodyMap.get("error").toString()
                                .contains("Error al recuperar destinatarios académicos del profesor"));
        }

        @Test
        @DisplayName("Debe devolver 500 controlado cuando el curso solicitado por destinatarios no existe")
        void debeDevolverErrorControladoEnDestinatariosSiCursoNoExiste() {
                Users professor = new Users();
                professor.setUser_id(10L);
                professor.setUsername("profesor_juan");
                professor.setEmail("juan@tfg.com");
                professor.setRole(Role.PROFESSOR);
                professor.setEnabled(true);

                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("profesor_juan");
                Mockito.when(userRepository.findByUsername("profesor_juan")).thenReturn(Optional.of(professor));
                Mockito.when(coursesRepository.findById(9999L)).thenReturn(Optional.empty());

                ResponseEntity<?> response = documentController.getProfessorRecipientsByCourse(authentication, 9999L);

                assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertTrue(bodyMap.get("error").toString()
                                .contains("Error al recuperar destinatarios académicos del profesor"));
        }

        @Test
        @DisplayName("Debe permitir al admin enviar un documento colectivo a todos los alumnos activos de un curso")
        void debePermitirEnvioColectivoAdminPorCurso() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file",
                                "circular.pdf",
                                "application/pdf",
                                "Circular administrativa".getBytes());

                Users admin = new Users();
                admin.setUser_id(90L);
                admin.setUsername("root_admin");
                admin.setRole(Role.ADMIN);

                Users studentA = new Users();
                studentA.setUser_id(31L);
                studentA.setUsername("student_a");
                studentA.setRole(Role.STUDENT);

                Users studentB = new Users();
                studentB.setUser_id(32L);
                studentB.setUsername("student_b");
                studentB.setRole(Role.STUDENT);

                Courses course = new Courses();
                course.setCourse_id(501L);
                course.setTitle("Programación I");

                Enrollment enrollmentA = new Enrollment();
                enrollmentA.setEnrollmentid(7001L);
                enrollmentA.setUser(studentA);
                enrollmentA.setCourse(course);

                Enrollment enrollmentB = new Enrollment();
                enrollmentB.setEnrollmentid(7002L);
                enrollmentB.setUser(studentB);
                enrollmentB.setCourse(course);

                Mockito.when(authentication.getName()).thenReturn("root_admin");
                Mockito.when(userRepository.findByUsername("root_admin")).thenReturn(Optional.of(admin));
                Mockito.when(coursesRepository.findById(501L)).thenReturn(Optional.of(course));
                Mockito.when(enrollmentRepository.findActiveStudentEnrollmentsByCourseId(501L))
                                .thenReturn(List.of(enrollmentA, enrollmentB));
                Mockito.when(fileStorageService.storeDocumentFile(any(),
                                eq(FileStorageService.DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS)))
                                .thenReturn("documents/uuid_circular.pdf");

                ResponseEntity<?> response = documentController.uploadDocumentToCourseByAdmin(authentication, validFile,
                                501L);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertNotNull(bodyMap);
                assertEquals("Documento transmitido con éxito al grupo de alumnos de la asignatura",
                                bodyMap.get("message"));
                assertEquals(2, bodyMap.get("totalStudents"));
                Mockito.verify(documentMetadataRepository, Mockito.times(4)).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("Debe resolver al profesor autenticado por username sin importar mayúsculas/minúsculas")
        void debeResolverProfesorPorUsernameIgnoreCaseEnProfessorUpload() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file",
                                "guia_case.pdf",
                                "application/pdf",
                                "Contenido con principal en casing distinto".getBytes());

                Mockito.when(authentication.getName()).thenReturn("Laura");
                Mockito.when(userRepository.findByUsername("Laura")).thenReturn(Optional.empty());

                Users lauraLowercase = new Users();
                lauraLowercase.setUser_id(30L);
                lauraLowercase.setUsername("laura");
                lauraLowercase.setEmail("laura@demo.com");
                lauraLowercase.setRole(Role.PROFESSOR);
                Mockito.when(userRepository.findByUsernameIgnoreCase("Laura")).thenReturn(Optional.of(lauraLowercase));

                Users studentA = new Users();
                studentA.setUser_id(31L);
                studentA.setUsername("student_case");
                studentA.setRole(Role.STUDENT);

                Courses course = new Courses();
                course.setCourse_id(2958L);

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(6001L);
                enrollment.setUser(studentA);
                enrollment.setCourse(course);

                Mockito.when(fileStorageService.storeDocumentFile(any(),
                                eq(FileStorageService.DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS)))
                                .thenReturn("documents/uuid_case.pdf");
                Mockito.when(coursesRepository.findById(2958L)).thenReturn(Optional.of(course));
                Mockito.when(enrollmentRepository.findActiveStudentEnrollmentsByCourseId(2958L))
                                .thenReturn(List.of(enrollment));

                ResponseEntity<?> response = documentController.professorUploadDocument(authentication, validFile,
                                2958L,
                                0L,
                                "DOCUMENTO");

                assertEquals(HttpStatus.OK, response.getStatusCode());
                Mockito.verify(documentMetadataRepository, Mockito.times(2)).save(any(DocumentMetadata.class));
        }

        @Test
        @WithMockUser(username = "luis_student")
        void debe_permitir_la_descarga_si_el_usuario_es_el_receptor_legitimo_antiIDOR() throws Exception {
                Long documentId = 1L;
                DocumentMetadata mockDoc = new DocumentMetadata();

                Users sender = new Users();
                sender.setUsername("profesor_juan");

                Users receiver = new Users();
                receiver.setUsername("luis_student");

                mockDoc.setSender(sender);
                mockDoc.setReceiver(receiver);
                mockDoc.setFilename("documents/uuid_tarea.pdf");
                mockDoc.setOriginalname("Tarea1.pdf");

                Resource mockResource = mock(Resource.class);
                when(mockResource.exists()).thenReturn(true);
                when(mockResource.isReadable()).thenReturn(true);

                when(documentMetadataRepository.findById(documentId)).thenReturn(java.util.Optional.of(mockDoc));
                when(fileStorageService.loadFileAsResource("documents/uuid_tarea.pdf")).thenReturn(mockResource);

                mockMvc.perform(get("/api/v1/documents/download/{documentId}", documentId)
                                .principal(authentication))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM))
                                .andExpect(header().string("Content-Disposition",
                                                "attachment; filename=\"Tarea1.pdf\""));
        }

        @Test
        @WithMockUser(username = "atacante_student")
        void debe_bloquear_la_descarga_y_devolver_403_si_un_tercero_intenta_un_ataque_IDOR() throws Exception {
                Long documentId = 2L;
                DocumentMetadata privateDoc = new DocumentMetadata();

                Users sender = new Users();
                sender.setUsername("profesor_juan");

                Users receiver = new Users();
                receiver.setUsername("luis_student");

                privateDoc.setSender(sender);
                privateDoc.setReceiver(receiver);

                when(documentMetadataRepository.findById(documentId)).thenReturn(java.util.Optional.of(privateDoc));
                when(authentication.getName()).thenReturn("atacante_student");

                mockMvc.perform(get("/api/v1/documents/download/{documentId}", documentId)
                                .principal(authentication))
                                .andExpect(status().isForbidden())
                                .andExpect(jsonPath("$.error").value(
                                                "Acceso denegado: No tienes permisos legítimos para descargar este archivo."));

                verify(fileStorageService, never()).loadFileAsResource(anyString());
        }

        @Test
        @DisplayName("Debe devolver 401 cuando se consulta el directorio de compañeros sin autenticación")
        void debeRechazarDirectorioClassmatesSinAutenticacion() {
                ResponseEntity<?> response = documentController.getMyClassmates(null);

                assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("No autenticado.", bodyMap.get("error"));
        }

        @Test
        @DisplayName("Debe devolver 500 cuando falla la carga de compañeros")
        void debeDevolverErrorControladoSiFallaClassmates() {
                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("luis_student");
                Mockito.when(userRepository.findClassmatesByUsername("luis_student"))
                                .thenThrow(new RuntimeException("db-classmates-down"));

                ResponseEntity<?> response = documentController.getMyClassmates(authentication);

                assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("db-classmates-down", bodyMap.get("error"));
        }

        @Test
        @DisplayName("Debe devolver 500 si un administrador no tiene rol definido en el directorio de admins")
        void debeDevolverErrorControladoSiAdminNoTieneRol() {
                Users adminSinRol = new Users();
                adminSinRol.setUser_id(501L);
                adminSinRol.setUsername("admin_sin_rol");
                adminSinRol.setEmail("admin@demo.com");
                adminSinRol.setRole(null);

                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of(adminSinRol));

                ResponseEntity<?> response = documentController.getPlatformAdmins(authentication);

                assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertNotNull(bodyMap.get("error"));
        }

        @Test
        @DisplayName("Debe devolver 401 cuando se consulta el directorio de admins sin autenticación")
        void debeRechazarDirectorioAdminsSinAutenticacion() {
                ResponseEntity<?> response = documentController.getPlatformAdmins(null);

                assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("No autenticado.", bodyMap.get("error"));
        }

        @Test
        @DisplayName("Debe devolver 200 con administradores cuando todos tienen rol válido")
        void debeDevolverDirectorioAdminsConRolValido() {
                Users admin = new Users();
                admin.setUser_id(77L);
                admin.setUsername("root_admin");
                admin.setEmail("root@demo.com");
                admin.setRole(Role.ADMIN);

                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of(admin));

                ResponseEntity<?> response = documentController.getPlatformAdmins(authentication);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertTrue(response.getBody() instanceof List);
                List<?> payload = (List<?>) response.getBody();
                assertEquals(1, payload.size());
        }

        // =========================================================================
        // NUEVOS TESTS DE AUDITORÍA: CONTROL DE LECTURA DE LA CAMPANA (CON MÉTODO REAL
        // 'READ')
        // =========================================================================

        @Test
        @DisplayName("CAMPANA - CASO POSITIVO: Debe marcar un documento recibido como leído con éxito (HTTP 200)")
        void debeMarcarDocumentoComoLeidoConExito() {
                Long documentId = 50L;
                DocumentMetadata mockDoc = new DocumentMetadata();
                mockDoc.setDocumentid(documentId);
                mockDoc.setReceiver(mockReceiver);
                mockDoc.setFolder_type(FolderType.RECEIVED);

                // AJUSTADO A TU BACKEND REAL: Firma de variable 'read' generada por Lombok
                mockDoc.setRead(false);

                Mockito.when(authentication.getName()).thenReturn("profesor_juan");
                Mockito.when(documentMetadataRepository.findById(documentId)).thenReturn(Optional.of(mockDoc));

                ResponseEntity<?> response = documentController.markAsRead(authentication, documentId);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertNotNull(bodyMap);
                assertEquals("Documento marcado como leído correctamente.", bodyMap.get("message"));

                // AJUSTADO A TU BACKEND REAL: Firma de método 'isRead' autogenerada
                assertTrue(mockDoc.isRead(), "El estado booleano de la variable interna debe haber mutado a true.");

                Mockito.verify(documentMetadataRepository, Mockito.times(1)).save(mockDoc);
        }

        @Test
        @DisplayName("CAMPANA - CASO NEGATIVO: Debe denegar el marcado como leído (HTTP 403) si un tercero intenta la acción")
        void debeDenegarMarkAsReadSiElUsuarioNoEsElReceptor() {
                Long documentId = 50L;
                DocumentMetadata mockDoc = new DocumentMetadata();
                mockDoc.setDocumentid(documentId);
                mockDoc.setReceiver(mockReceiver);
                mockDoc.setFolder_type(FolderType.RECEIVED);

                Mockito.when(authentication.getName()).thenReturn("luis_student");
                Mockito.when(documentMetadataRepository.findById(documentId)).thenReturn(Optional.of(mockDoc));

                ResponseEntity<?> response = documentController.markAsRead(authentication, documentId);

                assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertNotNull(bodyMap);
                assertEquals("Acceso denegado: No puedes modificar el estado de este documento.", bodyMap.get("error"));

                Mockito.verify(documentMetadataRepository, Mockito.never()).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("CAMPANA - Debe devolver 401 cuando se intenta marcar como leído sin autenticación")
        void debeRechazarMarkAsReadSinAutenticacion() {
                ResponseEntity<?> response = documentController.markAsRead(null, 50L);

                assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("No autenticado o token JWT inválido.", bodyMap.get("error"));
        }

        @Test
        @DisplayName("CAMPANA - Debe devolver 403 cuando el documento no pertenece a RECEIVED")
        void debeDenegarMarkAsReadSiNoEsCarpetaReceived() {
                Long documentId = 51L;
                DocumentMetadata mockDoc = new DocumentMetadata();
                mockDoc.setDocumentid(documentId);
                mockDoc.setReceiver(mockReceiver);
                mockDoc.setFolder_type(FolderType.SENT);
                mockDoc.setRead(false);

                Mockito.when(authentication.getName()).thenReturn("profesor_juan");
                Mockito.when(documentMetadataRepository.findById(documentId)).thenReturn(Optional.of(mockDoc));

                ResponseEntity<?> response = documentController.markAsRead(authentication, documentId);

                assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("Acceso denegado: No puedes modificar el estado de este documento.", bodyMap.get("error"));
                Mockito.verify(documentMetadataRepository, never()).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("CAMPANA - Debe devolver 500 controlado cuando el documento no existe")
        void debeDevolverErrorControladoEnMarkAsReadCuandoNoExisteDocumento() {
                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("profesor_juan");
                Mockito.when(documentMetadataRepository.findById(999L)).thenReturn(Optional.empty());

                ResponseEntity<?> response = documentController.markAsRead(authentication, 999L);

                assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertTrue(bodyMap.get("error").toString()
                                .contains("Error al actualizar el estado de lectura del documento"));
        }

        @Test
        @DisplayName("CAMPANA - No debe persistir cambios cuando el documento ya estaba marcado como leído")
        void noDebePersistirMarkAsReadCuandoYaEstaLeido() {
                Long documentId = 52L;
                DocumentMetadata mockDoc = new DocumentMetadata();
                mockDoc.setDocumentid(documentId);
                mockDoc.setReceiver(mockReceiver);
                mockDoc.setFolder_type(FolderType.RECEIVED);
                mockDoc.setRead(true);

                Mockito.when(authentication.getName()).thenReturn("profesor_juan");
                Mockito.when(documentMetadataRepository.findById(documentId)).thenReturn(Optional.of(mockDoc));

                ResponseEntity<?> response = documentController.markAsRead(authentication, documentId);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                Mockito.verify(documentMetadataRepository, never()).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("Debe devolver 401 cuando se consultan enviados sin autenticación")
        void debeRechazarSentDocumentsSinAutenticacion() {
                ResponseEntity<?> response = documentController.getSentDocuments(null);

                assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("No autenticado o token JWT inválido.", bodyMap.get("error"));
        }

        @Test
        @DisplayName("Debe devolver 500 controlado si falla la consulta de enviados")
        void debeDevolverErrorControladoEnSentDocumentsSiFallaRepositorio() {
                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("luis_student");
                Mockito.when(documentMetadataRepository.findSentGeneralDocumentsByUsername("luis_student"))
                                .thenThrow(new RuntimeException("boom-sent"));

                ResponseEntity<?> response = documentController.getSentDocuments(authentication);

                assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("Error al recuperar los documentos enviados", bodyMap.get("error"));
        }

        @Test
        @DisplayName("Debe devolver recibidos por asignatura para usuario autenticado")
        void debeDevolverReceivedByCourseConSesionValida() {
                Courses course = new Courses();
                course.setCourse_id(501L);

                DocumentMetadata doc = new DocumentMetadata();
                doc.setDocumentid(901L);
                doc.setFilename("documents/uuid-course.pdf");
                doc.setOriginalname("Actividad_1.pdf");
                doc.setCourse(course);
                doc.setSender(mockSender);
                doc.setReceiver(mockReceiver);
                doc.setFolder_type(FolderType.RECEIVED);

                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("luis_student");
                Mockito.when(documentMetadataRepository.findReceivedDocumentsByUsernameAndCourse("luis_student", 501L))
                                .thenReturn(List.of(doc));

                ResponseEntity<?> response = documentController.getReceivedDocumentsByCourse(authentication, 501L);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertTrue(response.getBody() instanceof List);
                List<?> payload = (List<?>) response.getBody();
                assertEquals(1, payload.size());
                Map<?, ?> first = (Map<?, ?>) payload.get(0);
                assertEquals("Actividad_1.pdf", first.get("originalname"));
        }

        @Test
        @DisplayName("Debe devolver enviados por asignatura para usuario autenticado")
        void debeDevolverSentByCourseConSesionValida() {
                Courses course = new Courses();
                course.setCourse_id(702L);

                DocumentMetadata doc = new DocumentMetadata();
                doc.setDocumentid(902L);
                doc.setFilename("documents/uuid-sent-course.pdf");
                doc.setOriginalname("Entrega_Final.pdf");
                doc.setCourse(course);
                doc.setSender(mockSender);
                doc.setReceiver(mockReceiver);
                doc.setFolder_type(FolderType.SENT);

                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("luis_student");
                Mockito.when(documentMetadataRepository.findSentDocumentsByUsernameAndCourse("luis_student", 702L))
                                .thenReturn(List.of(doc));

                ResponseEntity<?> response = documentController.getSentDocumentsByCourse(authentication, 702L);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertTrue(response.getBody() instanceof List);
                List<?> payload = (List<?>) response.getBody();
                assertEquals(1, payload.size());
                Map<?, ?> first = (Map<?, ?>) payload.get(0);
                assertEquals("Entrega_Final.pdf", first.get("originalname"));
        }

        @Test
        @DisplayName("Debe bloquear envío colectivo admin cuando no hay alumnos activos")
        void debeBloquearEnvioColectivoAdminSinAlumnos() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file",
                                "circular.pdf",
                                "application/pdf",
                                "Circular vacia".getBytes());

                Users admin = new Users();
                admin.setUser_id(90L);
                admin.setUsername("root_admin");
                admin.setRole(Role.ADMIN);

                Courses course = new Courses();
                course.setCourse_id(900L);

                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("root_admin");
                Mockito.when(userRepository.findByUsername("root_admin")).thenReturn(Optional.of(admin));
                Mockito.when(coursesRepository.findById(900L)).thenReturn(Optional.of(course));
                Mockito.when(enrollmentRepository.findActiveStudentEnrollmentsByCourseId(900L)).thenReturn(List.of());

                ResponseEntity<?> response = documentController.uploadDocumentToCourseByAdmin(authentication, validFile,
                                900L);

                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertTrue(bodyMap.get("error").toString().contains("no hay alumnos activos matriculados"));
                Mockito.verify(documentMetadataRepository, never()).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("Debe bloquear envío masivo del profesor cuando no hay alumnos matriculados")
        void debeBloquearEnvioMasivoProfesorSinAlumnos() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file",
                                "guia.pdf",
                                "application/pdf",
                                "Guia".getBytes());

                Users professor = new Users();
                professor.setUser_id(10L);
                professor.setUsername("profesor_juan");
                professor.setRole(Role.PROFESSOR);

                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("profesor_juan");
                Mockito.when(userRepository.findByUsername("profesor_juan")).thenReturn(Optional.of(professor));
                Courses course = new Courses();
                course.setCourse_id(77L);
                Mockito.when(coursesRepository.findById(77L)).thenReturn(Optional.of(course));
                Mockito.when(enrollmentRepository.findActiveStudentEnrollmentsByCourseId(77L)).thenReturn(List.of());
                Mockito.when(fileStorageService.storeDocumentFile(any(),
                                eq(FileStorageService.DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS)))
                                .thenReturn("documents/uuid_guide.pdf");

                ResponseEntity<?> response = documentController.professorUploadDocument(authentication, validFile, 77L,
                                0L,
                                "DOCUMENTO");

                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertTrue(bodyMap.get("error").toString().contains("no hay alumnos matriculados"));
                Mockito.verify(documentMetadataRepository, never()).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("Debe devolver 500 controlado en envío individual del profesor si el receptor no existe")
        void debeDevolverErrorControladoEnEnvioIndividualProfesorSiReceptorNoExiste() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file",
                                "nota.pdf",
                                "application/pdf",
                                "Nota".getBytes());

                Users professor = new Users();
                professor.setUser_id(10L);
                professor.setUsername("profesor_juan");
                professor.setRole(Role.PROFESSOR);

                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("profesor_juan");
                Mockito.when(userRepository.findByUsername("profesor_juan")).thenReturn(Optional.of(professor));
                Mockito.when(coursesRepository.findById(200L)).thenReturn(Optional.of(new Courses()));
                Mockito.when(fileStorageService.storeDocumentFile(any(),
                                eq(FileStorageService.DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS)))
                                .thenReturn("documents/uuid_note.pdf");
                Mockito.when(userRepository.findById(999L)).thenReturn(Optional.empty());

                ResponseEntity<?> response = documentController.professorUploadDocument(authentication, validFile, 200L,
                                999L,
                                "DOCUMENTO");

                assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("Error crítico al procesar la transmisión académica del profesor", bodyMap.get("error"));
                Mockito.verify(documentMetadataRepository, never()).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("Debe devolver 400 cuando el alumno no tiene matrícula activa para la asignatura")
        void debeBloquearAssignmentSiNoHayMatriculaActivaParaAsignatura() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file",
                                "entrega.pdf",
                                "application/pdf",
                                "Entrega".getBytes());

                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("luis_student");
                Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockSender));

                Courses otherCourse = new Courses();
                otherCourse.setCourse_id(1234L);
                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(9991L);
                enrollment.setUser(mockSender);
                enrollment.setCourse(otherCourse);

                Mockito.when(enrollmentRepository.findAllByUserIdWithCourses(mockSender.getUser_id()))
                                .thenReturn(List.of(enrollment));

                ResponseEntity<?> response = documentController.uploadAssignmentDocument(authentication, validFile,
                                5000L,
                                "TRABAJO");

                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("No se encontró una matrícula activa para esta asignatura.", bodyMap.get("error"));
                Mockito.verify(documentMetadataRepository, never()).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("Debe devolver 400 cuando la asignatura no tiene profesor asignado para entregas")
        void debeBloquearAssignmentSiNoHayProfesorAsignado() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file",
                                "entrega.pdf",
                                "application/pdf",
                                "Entrega".getBytes());

                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("luis_student");
                Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockSender));

                Courses course = new Courses();
                course.setCourse_id(101L);
                course.setInstructors("Sin asignar");

                Enrollment enrollment = new Enrollment();
                enrollment.setEnrollmentid(1212L);
                enrollment.setUser(mockSender);
                enrollment.setCourse(course);

                Mockito.when(enrollmentRepository.findAllByUserIdWithCourses(mockSender.getUser_id()))
                                .thenReturn(List.of(enrollment));

                ResponseEntity<?> response = documentController.uploadAssignmentDocument(authentication, validFile,
                                101L,
                                "TRABAJO");

                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertTrue(bodyMap.get("error").toString().contains("Profesor no asignado"));
                Mockito.verify(documentMetadataRepository, never()).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("Debe devolver 400 cuando professor-upload recibe una asignatura inexistente")
        void debeRechazarProfessorUploadConAsignaturaInexistente() {
                MockMultipartFile validFile = new MockMultipartFile(
                                "file",
                                "guia.pdf",
                                "application/pdf",
                                "Guia".getBytes());

                Users professor = new Users();
                professor.setUser_id(10L);
                professor.setUsername("profesor_juan");
                professor.setRole(Role.PROFESSOR);

                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("profesor_juan");
                Mockito.when(userRepository.findByUsername("profesor_juan")).thenReturn(Optional.of(professor));
                Mockito.when(coursesRepository.findById(404L)).thenReturn(Optional.empty());

                ResponseEntity<?> response = documentController.professorUploadDocument(authentication, validFile, 404L,
                                21L,
                                "DOCUMENTO");

                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                Map<?, ?> bodyMap = (Map<?, ?>) response.getBody();
                assertEquals("La asignatura seleccionada no existe.", bodyMap.get("error"));
                Mockito.verify(documentMetadataRepository, never()).save(any(DocumentMetadata.class));
        }

        @Test
        @DisplayName("No debe mezclar documentos legacy sin curso en recibidos por asignatura")
        void noDebeMezclarLegacySinCursoEnReceivedByCourse() {
                Mockito.when(authentication.isAuthenticated()).thenReturn(true);
                Mockito.when(authentication.getName()).thenReturn("luis_student");
                Mockito.when(documentMetadataRepository.findReceivedDocumentsByUsernameAndCourse("luis_student", 501L))
                                .thenReturn(List.of());
                Mockito.when(userRepository.findByUsername("luis_student")).thenReturn(Optional.of(mockSender));

                ResponseEntity<?> response = documentController.getReceivedDocumentsByCourse(authentication, 501L);

                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertTrue(response.getBody() instanceof List);
                List<?> payload = (List<?>) response.getBody();
                assertTrue(payload.isEmpty());
        }
}
