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
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path rootLocation;

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

            String uniqueFileName = UUID.randomUUID().toString() + "_" + originalFileName;
            Path targetLocation = this.rootLocation.resolve(subFolder).resolve(uniqueFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return subFolder + "/" + uniqueFileName;
        } catch (IOException e) {
            throw new RuntimeException("Error al almacenar el archivo " + originalFileName, e);
        }
    }
}
