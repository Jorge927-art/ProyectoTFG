package com.cursosonline.backend.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

class FileStorageServiceTest {

    private FileStorageService fileStorageService;
    private MultipartFile multipartFile;

    @TempDir
    Path sharedTempDir;

    @BeforeEach
    void setUp() {
        // Instanciación manual pasando el directorio temporal inyectado por JUnit 5
        this.fileStorageService = new FileStorageService(sharedTempDir.toString());

        // Inicialización manual obligatoria de la estructura perimetral de directorios
        this.fileStorageService.init();

        // Creación del mock nativo aislado de MultipartFile
        this.multipartFile = Mockito.mock(MultipartFile.class);
    }

    @Test
    @DisplayName("Debería almacenar un archivo de imagen válido correctamente en la carpeta de avatars")
    void storeFileImageSuccess() throws IOException {
        String originalName = "foto.png";
        byte[] content = "contenido-falso-imagen-png".getBytes();

        when(multipartFile.getOriginalFilename()).thenReturn(originalName);
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getContentType()).thenReturn("image/png");

        // Suministrar un proveedor de stream fresco para evitar buffers de lectura
        // agotados
        when(multipartFile.getInputStream()).thenAnswer(invocation -> new ByteArrayInputStream(content));

        String resultPath = fileStorageService.storeFile(multipartFile, "avatars");

        assertNotNull(resultPath);
        assertTrue(resultPath.startsWith("avatars/"));
        assertTrue(resultPath.contains(originalName));
        assertTrue(Files.exists(sharedTempDir.resolve(resultPath)));
    }

    @Test
    @DisplayName("Debería almacenar un documento válido correctamente en la carpeta de documents")
    void storeFileDocumentSuccess() throws IOException {
        String originalName = "informe.pdf";
        byte[] content = "contenido-falso-pdf-document".getBytes();

        when(multipartFile.getOriginalFilename()).thenReturn(originalName);
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getContentType()).thenReturn("application/pdf");

        // El uso de lambdas en .thenAnswer garantiza que el stream no se cierre
        // prematuramente durante la copia
        when(multipartFile.getInputStream()).thenAnswer(invocation -> new ByteArrayInputStream(content));

        String resultPath = fileStorageService.storeFile(multipartFile, "documents");

        assertNotNull(resultPath);
        assertTrue(resultPath.startsWith("documents/"));
        assertTrue(resultPath.contains(originalName));
        assertTrue(Files.exists(sharedTempDir.resolve(resultPath)));
    }

    @Test
    @DisplayName("Debería lanzar IllegalArgumentException si el archivo está vacío")
    void storeFileEmptyException() {
        when(multipartFile.getOriginalFilename()).thenReturn("vacio.txt");
        when(multipartFile.isEmpty()).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> fileStorageService.storeFile(multipartFile, "documents"));
    }

    @Test
    @DisplayName("Debería lanzar IllegalArgumentException si detecta un Path Traversal")
    void storeFilePathTraversalException() {
        when(multipartFile.getOriginalFilename()).thenReturn("../malicioso.txt");
        when(multipartFile.isEmpty()).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> fileStorageService.storeFile(multipartFile, "documents"));
    }

    @Test
    @DisplayName("Debería lanzar IllegalArgumentException si la extensión de imagen no está permitida")
    void storeFileInvalidImageExtensionException() {
        when(multipartFile.getOriginalFilename()).thenReturn("foto.gif");
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getContentType()).thenReturn("image/gif");

        assertThrows(IllegalArgumentException.class, () -> fileStorageService.storeFile(multipartFile, "avatars"));
    }

    @Test
    @DisplayName("Debería lanzar IllegalArgumentException si el Content-Type no corresponde a una imagen")
    void storeFileInvalidImageContentTypeException() {
        when(multipartFile.getOriginalFilename()).thenReturn("foto.jpg");
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getContentType()).thenReturn("application/octet-stream");

        assertThrows(IllegalArgumentException.class, () -> fileStorageService.storeFile(multipartFile, "avatars"));
    }

    @Test
    @DisplayName("Debería lanzar IllegalArgumentException si la extensión del documento no está permitida")
    void storeFileInvalidDocumentExtensionException() {
        when(multipartFile.getOriginalFilename()).thenReturn("informe.exe");
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getContentType()).thenReturn("application/pdf");

        assertThrows(IllegalArgumentException.class, () -> fileStorageService.storeFile(multipartFile, "documents"));
    }

    @Test
    @DisplayName("Debería lanzar IllegalArgumentException si el tipo MIME del documento es inválido")
    void storeFileInvalidDocumentMimeTypeException() {
        when(multipartFile.getOriginalFilename()).thenReturn("informe.pdf");
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getContentType()).thenReturn("text/html");

        assertThrows(IllegalArgumentException.class, () -> fileStorageService.storeFile(multipartFile, "documents"));
    }

    @Test
    @DisplayName("Debería lanzar IllegalArgumentException si la subcarpeta destino no está configurada")
    void storeFileInvalidSubFolderException() {
        when(multipartFile.getOriginalFilename()).thenReturn("archivo.pdf");
        when(multipartFile.isEmpty()).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> fileStorageService.storeFile(multipartFile, "temporal"));
    }

    @Test
    @DisplayName("Debería cargar un recurso existente de forma segura y retornar el Resource")
    void loadFileAsResourceSuccess() throws IOException {
        Path docFolder = sharedTempDir.resolve("documents");
        Path dummyFile = docFolder.resolve("test_documento.pdf");
        Files.writeString(dummyFile, "datos-del-recurso-autenticado");

        Resource resource = fileStorageService.loadFileAsResource("documents/test_documento.pdf");

        assertNotNull(resource);
        assertTrue(resource.exists());
        assertTrue(resource.isReadable());
    }

    @Test
    @DisplayName("Debería retornar null si el recurso que se intenta cargar en disco no existe")
    void loadFileAsResourceNotFoundReturnsNull() {
        Resource resource = fileStorageService.loadFileAsResource("documents/inexistente.pdf");
        assertNull(resource);
    }
}
