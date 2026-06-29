package com.cursosonline.backend.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path rootLocation;

    // Extensiones permitidas por categorías
    private final List<String> ALLOWED_IMAGE_EXTENSIONS = Arrays.asList("jpg", "jpeg", "png", "webp");
    private final List<String> ALLOWED_DOC_EXTENSIONS = Arrays.asList("pdf");

    public FileStorageService(@Value("${spring.servlet.multipart.location}") String uploadDir) {
        this.rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(this.rootLocation);
            Files.createDirectories(this.rootLocation.resolve("avatars"));
            Files.createDirectories(this.rootLocation.resolve("documents"));
        } catch (IOException e) {
            throw new RuntimeException("No se pudieron inicializar las carpetas de almacenamiento", e);
        }
    }

    public String storeFile(MultipartFile file, String subFolder) {
        String originalFileName = org.springframework.util.StringUtils.cleanPath(file.getOriginalFilename());
        try {
            if (file.isEmpty()) {
                throw new IllegalArgumentException("No se puede guardar un archivo vacío: " + originalFileName);
            }
            if (originalFileName.contains("..")) {
                throw new IllegalArgumentException("Ruta no permitida fuera del directorio: " + originalFileName);
            }

            // AUDITORÍA NOTEBOOKLM: Validación estricta de extensiones y tipos de archivo
            // por carpeta
            validateFileType(file, originalFileName, subFolder);

            String uniqueFileName = UUID.randomUUID().toString() + "_" + originalFileName;
            Path targetLocation = this.rootLocation.resolve(subFolder).resolve(uniqueFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return subFolder + "/" + uniqueFileName;
        } catch (IOException e) {
            throw new RuntimeException("Error al almacenar el archivo " + originalFileName, e);
        }
    }

    /**
     * Valida de manera estricta que el archivo corresponda al formato permitido
     * para su carpeta.
     */
    private void validateFileType(MultipartFile file, String filename, String subFolder) {
        String extension = getFileExtension(filename).toLowerCase();
        String contentType = file.getContentType();

        if ("avatars".equalsIgnoreCase(subFolder)) {
            // Validar extensión de imagen
            if (!ALLOWED_IMAGE_EXTENSIONS.contains(extension)) {
                throw new IllegalArgumentException(
                        "Extensión de imagen no permitida (" + extension + "). Use JPG, JPEG, PNG o WEBP.");
            }
            // Validar Content-Type de imagen
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new IllegalArgumentException("El tipo de contenido no corresponde a una imagen válida.");
            }
        } else if ("documents".equalsIgnoreCase(subFolder)) {
            // Validar extensión de documento
            if (!ALLOWED_DOC_EXTENSIONS.contains(extension)) {
                throw new IllegalArgumentException(
                        "Extensión de documento no permitida (" + extension + "). Solo se admite PDF.");
            }
            // Validar Content-Type de documento
            if (contentType == null || !contentType.equalsIgnoreCase("application/pdf")) {
                throw new IllegalArgumentException("El tipo de contenido debe ser estrictamente un PDF.");
            }
        } else {
            throw new IllegalArgumentException("Carpeta de destino no configurada para validación de seguridad.");
        }
    }

    private String getFileExtension(String filename) {
        int lastIndexOf = filename.lastIndexOf(".");
        if (lastIndexOf == -1) {
            return ""; // Archivo sin extensión
        }
        return filename.substring(lastIndexOf + 1);
    }
}
