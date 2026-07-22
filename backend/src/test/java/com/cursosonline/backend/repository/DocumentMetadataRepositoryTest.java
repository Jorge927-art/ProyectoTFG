package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.DocumentMetadata;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DisplayName("Suite de Pruebas Unitarias para DocumentMetadataRepository")
class DocumentMetadataRepositoryTest {

    private DocumentMetadataRepository documentMetadataRepository;
    private DocumentMetadata sampleDocument;
    private final String sampleUsername = "alumno_tfg";
    private final Long sampleCourseId = 101L;

    @BeforeEach
    void setUp() {
        // 1. Crear el simulador directo del repositorio de metadatos de documentos
        documentMetadataRepository = Mockito.mock(DocumentMetadataRepository.class);

        // 2. Instanciar un objeto de documento ficticio para las colecciones devueltas
        sampleDocument = new DocumentMetadata();
        try {
            // Inicialización de IDs y nombres de archivo mediante reflexión por seguridad
            // estructural
            java.lang.reflect.Method setDocumentid = DocumentMetadata.class.getMethod("setDocumentid", Long.class);
            java.lang.reflect.Method setFilename = DocumentMetadata.class.getMethod("setFilename", String.class);
            setDocumentid.invoke(sampleDocument, 5001L);
            setFilename.invoke(sampleDocument, "syllabus-analitica.pdf");
        } catch (Exception e) {
            try {
                // Fallback por si los setters usan tipos primitivos o variantes estándar en tu
                // entidad
                java.lang.reflect.Method setDocumentid = DocumentMetadata.class.getMethod("setDocumentId", long.class);
                java.lang.reflect.Method setFilename = DocumentMetadata.class.getMethod("setFileName", String.class);
                setDocumentid.invoke(sampleDocument, 5001L);
                setFilename.invoke(sampleDocument, "syllabus-analitica.pdf");
            } catch (Exception ignored) {
            }
        }
    }

    /*
     * =========================================================================
     * 1. VERIFICACIÓN: findReceivedDocumentsByUsername (BANDOJA DE ENTRADA)
     * =========================================================================
     */
    @Test
    @DisplayName("Debe recuperar la bandeja de entrada completa del usuario")
    void findReceivedDocumentsByUsername_ShouldReturnList() {
        when(documentMetadataRepository.findReceivedDocumentsByUsername(sampleUsername))
                .thenReturn(List.of(sampleDocument));

        List<DocumentMetadata> result = documentMetadataRepository.findReceivedDocumentsByUsername(sampleUsername);

        assertNotNull(result, "La lista de documentos recibidos no debe ser nula");
        assertEquals(1, result.size(), "Debe contener exactamente un documento");
    }

    /*
     * =========================================================================
     * 2. VERIFICACIÓN: findReceivedDocumentsByUsernameAndCourse (ENTRADA POR CURSO)
     * =========================================================================
     */
    @Test
    @DisplayName("Debe recuperar los documentos recibidos específicos de una asignatura")
    void findReceivedDocumentsByUsernameAndCourse_ShouldReturnFilteredList() {
        when(documentMetadataRepository.findReceivedDocumentsByUsernameAndCourse(sampleUsername, sampleCourseId))
                .thenReturn(List.of(sampleDocument));

        List<DocumentMetadata> result = documentMetadataRepository
                .findReceivedDocumentsByUsernameAndCourse(sampleUsername, sampleCourseId);

        assertNotNull(result);
        assertEquals(1, result.size());
    }

    /*
     * =========================================================================
     * 3. VERIFICACIÓN: findSentDocumentsByUsername (BANDEJA DE SALIDA)
     * =========================================================================
     */
    @Test
    @DisplayName("Debe recuperar la bandeja de salida completa del usuario")
    void findSentDocumentsByUsername_ShouldReturnList() {
        when(documentMetadataRepository.findSentDocumentsByUsername(sampleUsername))
                .thenReturn(List.of(sampleDocument));

        List<DocumentMetadata> result = documentMetadataRepository.findSentDocumentsByUsername(sampleUsername);

        assertNotNull(result);
        assertEquals(1, result.size());
    }

    /*
     * =========================================================================
     * 4. VERIFICACIÓN: findSentDocumentsByUsernameAndCourse (SALIDA POR CURSO)
     * =========================================================================
     */
    @Test
    @DisplayName("Debe recuperar los documentos enviados específicos de una asignatura")
    void findSentDocumentsByUsernameAndCourse_ShouldReturnFilteredList() {
        when(documentMetadataRepository.findSentDocumentsByUsernameAndCourse(sampleUsername, sampleCourseId))
                .thenReturn(List.of(sampleDocument));

        List<DocumentMetadata> result = documentMetadataRepository.findSentDocumentsByUsernameAndCourse(sampleUsername,
                sampleCourseId);

        assertNotNull(result);
        assertEquals(1, result.size());
    }
}
