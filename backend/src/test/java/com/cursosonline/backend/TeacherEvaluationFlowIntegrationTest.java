package com.cursosonline.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders; // Inyección nativa
import org.springframework.web.context.WebApplicationContext; // Inyección nativa
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.transaction.annotation.Transactional;

// Importaciones de Entidades y Repositorios necesarios
import com.cursosonline.backend.entities.DocumentMetadata;
import com.cursosonline.backend.entities.FolderType;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.repository.DocumentMetadataRepository;
import com.cursosonline.backend.repository.UserRepository;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

/**
 * Test de Integración del Flujo Académico del Profesor [ADR-055]
 * Certifica que el envío de un documento desde la Consola de Gestión
 * persiste correctamente los metadatos asignados al alumno destinatario.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class TeacherEvaluationFlowIntegrationTest {

        private MockMvc mockMvc;

        @Autowired
        private WebApplicationContext webApplicationContext; // Captura el contexto de Spring nativo

        @Autowired
        private UserRepository userRepository;

        @Autowired
        private DocumentMetadataRepository documentMetadataRepository;

        private Users alumnoReceptor;

        @BeforeEach
        public void setUp() {
                // Inicializamos MockMvc aplicando de forma estricta los filtros perimetrales de
                // Spring Security
                this.mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                                .apply(springSecurity()) // <--- Añadimos esta línea mágica
                                .build();

                // Limpiamos la tabla de documentos para arrancar la prueba a cero
                documentMetadataRepository.deleteAll();

                // Aseguramos que existan las cuentas necesarias creadas previamente en el
                // sistema
                userRepository.findByUsername("profesor_test").orElseGet(() -> {
                        Users u = new Users();
                        u.setUsername("profesor_test");
                        u.setEmail("profesor@cursos.com");
                        u.setPassword("password_mock_123"); // 1. Evita la restricción NOT NULL en BD
                        u.setRole(Role.PROFESSOR);
                        return userRepository.save(u);
                });

                alumnoReceptor = userRepository.findByUsername("alumno_test").orElseGet(() -> {
                        Users u = new Users();
                        u.setUsername("alumno_test");
                        u.setEmail("alumno@cursos.com");
                        u.setPassword("password_mock_123"); // 2. Evita la restricción NOT NULL en BD
                        u.setRole(Role.STUDENT);
                        return userRepository.save(u);
                });
        }

        @Test
        @WithMockUser(username = "profesor_test", roles = { "PROFESSOR" }) // El test actúa bajo el rol de Profesor
                                                                           // legítimo
        public void alEnviarDocumentoAAlumnoEspecifico_DebePersistirRegistrosConReceiverIdCorrecto() throws Exception {

                // El profesor selecciona un PDF legítimo de sus archivos locales [ADR-25]
                MockMultipartFile fakePdf = new MockMultipartFile(
                                "file",
                                "guia_arquitectura.pdf",
                                "application/pdf",
                                "%PDF-1.4 ... datos ficticios binarios".getBytes());

                Long courseId = 1L; // ID del curso gestionado actualmente por el profesor en la UI
                Long receiverId = alumnoReceptor.getUser_id(); // ID del alumno seleccionado en el desplegable de la
                                                               // clase

                // Se ejecuta la acción del botón de la interfaz: Transmitir Documento
                mockMvc.perform(multipart("/api/v1/documents/professor-upload")
                                .file(fakePdf)
                                .param("courseId", courseId.toString())
                                .param("receiverId", receiverId.toString()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.message")
                                                .value("Documento enviado con éxito de forma individual al alumno"));

                // Verificamos que la base de datos guardó los metadatos correspondientes de la
                // acción
                List<DocumentMetadata> savedDocs = documentMetadataRepository.findAll();
                assertEquals(2, savedDocs.size(), "Deberían generarse los registros de metadatos (SENT y RECEIVED)");

                DocumentMetadata receivedDoc = savedDocs.stream()
                                .filter(d -> d.getFolder_type() == FolderType.RECEIVED)
                                .findFirst()
                                .orElse(null);

                assertNotNull(receivedDoc, "El alumno debe tener el documento disponible en su bandeja");
                assertEquals("profesor_test", receivedDoc.getSender().getUsername(),
                                "El emisor registrado debe ser el profesor");
                assertEquals("alumno_test", receivedDoc.getReceiver().getUsername(),
                                "El receptor debe coincidir con el alumno elegido");
                assertFalse(receivedDoc.isRead(), "Debe marcarse como no leído para activar sus notificaciones");
        }
}
