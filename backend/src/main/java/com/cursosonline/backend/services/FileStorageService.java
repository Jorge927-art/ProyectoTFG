package com.cursosonline.backend.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * Servicio de almacenamiento de archivos que gestiona la carga y validación de
 * documentos e imágenes.
 * FileStorageService
 */
@Service
public class FileStorageService {

    /**
     * Perfiles de validación de documentos para diferentes tipos de contenido.
     * Se utiliza para aplicar reglas de validación específicas según el tipo de
     * documento.
     * DocumentValidationProfile
     */
    public enum DocumentValidationProfile {
        BASIC_DOCUMENTS,
        ACADEMIC_MEDIA_DOCUMENTS
    }

    private final Path rootLocation;

    // Extensiones permitidas por categorías
    private final List<String> ALLOWED_IMAGE_EXTENSIONS = Arrays.asList("jpg", "jpeg", "png", "webp");

    // [ADR-23 REFACTORIZADO]: Ampliación de lista blanca para incluir formatos de
    // texto y procesamiento de palabras
    private final List<String> ALLOWED_DOC_EXTENSIONS = Arrays.asList("pdf", "docx", "txt");
    private final List<String> ALLOWED_ACADEMIC_MEDIA_EXTENSIONS = Arrays.asList("pdf", "docx", "txt", "mp4");

    // Lista blanca estricta de tipos MIME válidos para mitigar ataques de ejecución
    // remota (RCE) y MIME-sniffing
    private final List<String> ALLOWED_DOC_MIME_TYPES = Arrays.asList(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain");
    private final List<String> ALLOWED_ACADEMIC_MEDIA_MIME_TYPES = Arrays.asList(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "video/mp4");

    /**
     * Constructor que inicializa el servicio de almacenamiento de archivos con la
     * ubicación raíz especificada.
     *
     * @param uploadDir La ruta del directorio raíz donde se almacenarán los
     *                  archivos.
     */
    public FileStorageService(@Value("${spring.servlet.multipart.location}") String uploadDir) {
        this.rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    /**
     * Inicializa las carpetas de almacenamiento necesarias al arrancar la
     * aplicación.
     * Crea las carpetas "avatars" y "documents" dentro del directorio raíz
     */
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

    /**
     * Almacena un archivo en la carpeta especificada y devuelve la ruta relativa
     * del archivo almacenado.
     * 
     * @param file      El archivo a almacenar.
     * @param subFolder La subcarpeta dentro del directorio raíz donde se almacenará
     *                  el archivo.
     * @return La ruta relativa del archivo almacenado.
     */
    public String storeFile(MultipartFile file, String subFolder) {
        return storeFile(file, subFolder, DocumentValidationProfile.BASIC_DOCUMENTS);
    }

    /**
     * Almacena un documento en la carpeta "documents" y aplica validación según el
     * perfil especificado.
     * 
     * @param file              El archivo a almacenar.
     * @param validationProfile El perfil de validación a aplicar.
     * @return La ruta relativa del archivo almacenado.
     */
    public String storeDocumentFile(MultipartFile file, DocumentValidationProfile validationProfile) {
        return storeFile(file, "documents", validationProfile);
    }

    /**
     * Almacena un archivo en la carpeta especificada y aplica validación según el
     * perfil proporcionado.
     * Este método es privado y se utiliza internamente para centralizar la lógica
     * de almacenamiento y validación.
     * 
     * @param file              El archivo a almacenar.
     * @param subFolder         La subcarpeta dentro del directorio raíz donde se
     *                          almacenará el archivo.
     * @param validationProfile El perfil de validación a aplicar.
     * @return La ruta relativa del archivo almacenado.
     */
    private String storeFile(MultipartFile file, String subFolder, DocumentValidationProfile validationProfile) {
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
            validateFileType(file, originalFileName, subFolder, validationProfile);

            String uniqueFileName = UUID.randomUUID().toString() + "_" + originalFileName;
            Path targetLocation = this.rootLocation.resolve(subFolder).resolve(uniqueFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return subFolder + "/" + uniqueFileName;
        } catch (IOException e) {
            throw new RuntimeException("Error al almacenar el archivo " + originalFileName, e);
        }
    }

    /**
     * Valida el tipo de archivo según la extensión y el tipo MIME, dependiendo de
     * la carpeta de destino y el perfil de validación.
     * Esta validación es crucial para prevenir ataques de seguridad como Path
     * Traversal y ejecución remota de código (RCE).
     * 
     * @param file              El archivo a validar.
     * @param filename          El nombre original del archivo.
     * @param subFolder         La subcarpeta dentro del directorio raíz donde se
     *                          almacenará el archivo.
     * @param validationProfile El perfil de validación a aplicar.
     */
    private void validateFileType(MultipartFile file, String filename, String subFolder,
            DocumentValidationProfile validationProfile) {
        String extension = getFileExtension(filename).toLowerCase();
        String contentType = file.getContentType();
        String normalizedContentType = contentType != null ? contentType.toLowerCase() : null;

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
            List<String> allowedExtensions = validationProfile == DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS
                    ? ALLOWED_ACADEMIC_MEDIA_EXTENSIONS
                    : ALLOWED_DOC_EXTENSIONS;
            List<String> allowedMimeTypes = validationProfile == DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS
                    ? ALLOWED_ACADEMIC_MEDIA_MIME_TYPES
                    : ALLOWED_DOC_MIME_TYPES;

            // [VALIDACIÓN PERIMETRAL DUAL]: Comprobar de forma síncrona que la extensión
            // esté en la lista blanca
            if (!allowedExtensions.contains(extension)) {
                String allowedLabel = validationProfile == DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS
                        ? "PDF, DOCX, TXT o MP4"
                        : "PDF, DOCX o TXT";
                throw new IllegalArgumentException(
                        "Extensión de documento no permitida (" + extension + "). Solo se admite " + allowedLabel
                                + ".");
            }
            // [VALIDACIÓN PERIMETRAL DUAL]: Comprobar que el tipo MIME coincida
            // estrictamente con el payload transmitido
            boolean isStandardAllowedMime = normalizedContentType != null
                    && allowedMimeTypes.contains(normalizedContentType);
            boolean isMp4FallbackMime = validationProfile == DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS
                    && "mp4".equals(extension)
                    && "application/octet-stream".equals(normalizedContentType);

            if (!isStandardAllowedMime && !isMp4FallbackMime) {
                throw new IllegalArgumentException("El tipo de contenido del documento no es válido o está corrupto.");
            }
        } else {
            throw new IllegalArgumentException("Carpeta de destino no configurada para validación de seguridad.");
        }
    }

    /**
     * Obtiene la extensión del archivo a partir de su nombre.
     * 
     * @param filename El nombre del archivo.
     * @return La extensión del archivo.
     */
    private String getFileExtension(String filename) {
        int lastIndexOf = filename.lastIndexOf(".");
        if (lastIndexOf == -1) {
            return ""; // Archivo sin extensión
        }
        return filename.substring(lastIndexOf + 1);
    }

    /**
     * Carga un archivo como recurso desde la ruta relativa especificada.
     * Este método resuelve la ruta relativa contra el directorio raíz inmutable y
     * devuelve un recurso que puede ser utilizado para la transmisión de archivos.
     * 
     * @param relativePath La ruta relativa del archivo dentro del directorio raíz.
     * @return El recurso correspondiente al archivo, o null si no existe o no es
     *         legible.
     */
    public Resource loadFileAsResource(String relativePath) {
        try {
            // Resuelve la ruta relativa (ej. "documents/uuid_archivo.pdf") contra el
            // directorio raiz inmutable
            Path filePath = this.rootLocation.resolve(relativePath).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                return null;
            }
        } catch (Exception e) {
            throw new RuntimeException("Error crítico de infraestructura al leer el recurso: " + relativePath, e);
        }
    }

}
