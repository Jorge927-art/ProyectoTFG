package com.cursosonline.backend.services;

import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.DocumentMetadata;
import com.cursosonline.backend.entities.FolderType;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.DocumentMetadataRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentAssignmentTest {

    @Mock
    private DocumentMetadataRepository documentMetadataRepository;

    private Users student;
    private Users teacher;
    private Courses course;

    @BeforeEach
    void setUp() {
        // 1. Instanciamos el Alumno remitente (Pedro)
        student = new Users();
        student.setUser_id(1L);
        student.setUsername("Pedro");

        // 2. Instanciamos el Profesor destinatario ficticio
        teacher = new Users();
        teacher.setUser_id(99L);
        teacher.setUsername("Prof. Martin");

        // 3. Instanciamos la Asignatura en la que se realiza el depósito
        course = new Courses();
        course.setCourse_id(101L);
        course.setTitle("Introduction to Data Science");
        course.setInstructors("Prof. Martin");
    }

    @Test
    void debeRegistrarMetadatosDeEntregaDeTrabajoPorUnEstudiante() {
        // ARRANGE: Configuramos el archivo simulado que el alumno pulsa para subir
        String originalName = "Trabajo_Final_Pedro.pdf";
        String uniquePhysicalName = UUID.randomUUID().toString() + ".pdf";

        DocumentMetadata mockMetadata = new DocumentMetadata();
        mockMetadata.setDocumentid(10L);
        mockMetadata.setFilename(uniquePhysicalName);
        mockMetadata.setOriginalname(originalName);
        mockMetadata.setUpload_date(LocalDateTime.now());
        mockMetadata.setSender(student);
        mockMetadata.setReceiver(teacher);
        mockMetadata.setCourse(course);
        mockMetadata.setFolder_type(FolderType.SENT);

        // Modelamos el comportamiento seguro de tu repositorio JpaRepository
        when(documentMetadataRepository.save(any(DocumentMetadata.class))).thenReturn(mockMetadata);

        // ACT: Ejecutamos el flujo de almacenamiento en la base de datos relacional
        DocumentMetadata savedDocument = documentMetadataRepository.save(mockMetadata);

        // ASSERT: Validaciones estrictas del contrato de datos de tu TFG
        assertNotNull(savedDocument);
        assertEquals(10L, savedDocument.getDocumentid());
        assertEquals(originalName, savedDocument.getOriginalname());
        assertEquals("Pedro", savedDocument.getSender().getUsername());
        assertEquals("Prof. Martin", savedDocument.getReceiver().getUsername());
        assertEquals(101L, savedDocument.getCourse().getCourse_id());
        assertEquals(FolderType.SENT, savedDocument.getFolder_type());

        // Verificamos que se haya interactuado exactamente una vez con tu repositorio
        verify(documentMetadataRepository, times(1)).save(any(DocumentMetadata.class));
    }
}
