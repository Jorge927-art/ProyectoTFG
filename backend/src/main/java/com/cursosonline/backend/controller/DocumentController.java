package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.DocumentMetadata;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.DocumentMetadataRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.services.FileStorageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/documents")
@Transactional
public class DocumentController {

    private final FileStorageService fileStorageService;
    private final DocumentMetadataRepository documentMetadataRepository;
    private final UserRepository userRepository;

    public DocumentController(FileStorageService fileStorageService,
            DocumentMetadataRepository documentMetadataRepository,
            UserRepository userRepository) {
        this.fileStorageService = fileStorageService;
        this.documentMetadataRepository = documentMetadataRepository;
        this.userRepository = userRepository;
    }

    /**
     * [ENDPOINT DE CONSULTA MULTI-ROL]: Devuelve la lista ordenada de metadatos de
     * documentos
     * que pertenecen de forma exclusiva al usuario autenticado en la sesión.
     */
    @GetMapping
    public ResponseEntity<?> getUserDocuments(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            String username = authentication.getName();
            List<DocumentMetadata> documents = documentMetadataRepository
                    .findAllByUserUsernameOrderByDocumentidDesc(username);

            return ResponseEntity.ok(documents);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error interno al recuperar el listado de documentos",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * [ENDPOINT DE CARGA MULTI-ROL]: Recibe el archivo multipart, ejecuta la
     * validación dual
     * en el FileStorageService (.pdf, .docx, .txt) y persiste sus referencias en
     * PostgreSQL.
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(
            Authentication authentication,
            @RequestParam("file") MultipartFile file) {

        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "El archivo transmitido está vacío o es inválido."));
            }

            Users currentUser = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("Usuario autenticado no encontrado en el sistema."));

            // 1. Guardar archivo físico en el subdirectorio /documents bajo validación
            // perimetral dual estricta
            String relativePath = fileStorageService.storeFile(file, "documents");

            // 2. Construir y persistir el registro de metadatos acoplado a la entidad
            // genérica Users
            DocumentMetadata metadata = new DocumentMetadata();
            metadata.setFilename(relativePath);
            metadata.setOriginalname(org.springframework.util.StringUtils.cleanPath(file.getOriginalFilename()));
            metadata.setUser(currentUser);

            documentMetadataRepository.save(metadata);

            return ResponseEntity.ok(Map.of(
                    "message", "Documento procesado y almacenado con éxito",
                    "filename", relativePath,
                    "originalname", metadata.getOriginalname()));

        } catch (IllegalArgumentException e) {
            // Captura de forma controlada excepciones por extensión incorrecta o violación
            // de tipo MIME
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error crítico al procesar la subida del documento en el servidor",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }
}
