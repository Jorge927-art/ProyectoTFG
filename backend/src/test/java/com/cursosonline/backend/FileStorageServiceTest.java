package com.cursosonline.backend;

import com.cursosonline.backend.services.FileStorageService;

import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.FileSystemUtils;

@DisplayName("Auditoría de Calidad: Pruebas de Almacenamiento Seguro")
class FileStorageServiceTest {

    private FileStorageService fileStorageService;
    private Path tempUploadDir;

    @BeforeEach
    void setUp() throws IOException {
        // Creamos un directorio temporal real para las pruebas para no ensuciar el
        // disco duro del TFG
        tempUploadDir = Files.createTempDirectory("tfg_uploads_test");
        fileStorageService = new FileStorageService(tempUploadDir.toString());
        fileStorageService.init(); // Inicializa las subcarpetas avatars y documents
    }

    @AfterEach
    void tearDown() throws IOException {
        // Limpieza absoluta del directorio temporal tras ejecutar cada test
        FileSystemUtils.deleteRecursively(tempUploadDir);
    }

    @Test
    @DisplayName("Debería almacenar con éxito una imagen válida en la carpeta de avatars")
    void storeFile_Success_ValidImage() {
        // Configuración de un archivo simulado válido de tipo imagen PNG
        MockMultipartFile validImage = new MockMultipartFile(
                "file",
                "foto_perfil.png",
                "image/png",
                "contenido_binario_falso".getBytes());

        // Ejecución del método bajo prueba
        String resultPath = fileStorageService.storeFile(validImage, "avatars");

        // Verificaciones (Assertions)
        assertNotNull(resultPath, "El path de retorno no debería ser nulo");
        assertTrue(resultPath.startsWith("avatars/"), "El archivo debería guardarse en la subcarpeta avatars");
        assertTrue(Files.exists(tempUploadDir.resolve(resultPath)), "El archivo físico debería existir en el disco");
    }

    @Test
    @DisplayName("Debería lanzar IllegalArgumentException y mitigar ataque RCE al intentar subir un script .sh")
    void storeFile_Failure_MaliciousScriptRCE() {
        // Simulamos el ataque cargando un script de Linux simulando una imagen
        MockMultipartFile maliciousScript = new MockMultipartFile(
                "file",
                "ataque_rce.sh",
                "application/x-sh",
                "#!/bin/bash\necho 'Servidor Comprometido'".getBytes());

        // Verificación y captura de la excepción (Assertion de Seguridad)
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            fileStorageService.storeFile(maliciousScript, "avatars");
        }, "El sistema debería haber rechazado el script malicioso lanzando IllegalArgumentException");

        // Validamos que el mensaje de error de cara al usuario sea descriptivo y
        // semántico
        assertTrue(exception.getMessage().contains("Extensión de imagen no permitida"),
                "El mensaje de error debe alertar sobre la extensión denegada");
    }
}
