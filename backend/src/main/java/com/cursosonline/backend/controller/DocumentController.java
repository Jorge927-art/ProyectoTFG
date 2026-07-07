package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.UserDirectoryDTO;
import com.cursosonline.backend.entities.DocumentMetadata;
import com.cursosonline.backend.entities.FolderType;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.repository.DocumentMetadataRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
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
    private final EnrollmentRepository enrollmentRepository;

    // CONSTRUCTOR ACTUALIZADO: Inyectamos el repositorio de matrículas necesario
    // para el directorio académico
    public DocumentController(FileStorageService fileStorageService,
            DocumentMetadataRepository documentMetadataRepository,
            UserRepository userRepository,
            EnrollmentRepository enrollmentRepository) {
        this.fileStorageService = fileStorageService;
        this.documentMetadataRepository = documentMetadataRepository;
        this.userRepository = userRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    /**
     * [ENDPOINT DE CONSULTA MODIFICADO]: Devuelve por defecto los documentos
     * RECIBIDOS
     * del usuario autenticado para alimentar la pestaña principal.
     */
    @GetMapping
    public ResponseEntity<?> getUserDocuments(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            String username = authentication.getName();
            List<DocumentMetadata> documents = documentMetadataRepository.findReceivedDocumentsByUsername(username);

            return ResponseEntity.ok(documents);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error interno al recuperar el listado de documentos",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * [NUEVO ENDPOINT]: Devuelve de forma aislada los documentos ENVIADOS por el
     * usuario.
     */
    @GetMapping("/sent")
    public ResponseEntity<?> getSentDocuments(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            String username = authentication.getName();
            List<DocumentMetadata> documents = documentMetadataRepository.findSentDocumentsByUsername(username);

            return ResponseEntity.ok(documents);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error al recuperar los documentos enviados",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * [ENDPOINT DE CARGA DIRIGIDO]: Recibe el archivo y el ID del destinatario
     * obligatorio,
     * persistiendo las copias para las bandejas correspondientes.
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(
            Authentication authentication,
            @RequestParam("file") MultipartFile file,
            @RequestParam("receiverId") Long receiverId) {

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
                    .orElseThrow(() -> new RuntimeException("Usuario emisor no encontrado."));

            // 1. REGLA DE NEGOCIO PRIMARIA: Validación perimetral inmediata (Evita llamadas
            // a BD innecesarias)
            if (currentUser.getUser_id().equals(receiverId)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "No puedes enviarte un documento a ti mismo."));
            }

            // 2. CONTROL DE INFRAESTRUCTURA: Verificamos si el tercero existe
            Users receiverUser = userRepository.findById(receiverId)
                    .orElseThrow(() -> new RuntimeException("El usuario destinatario no existe."));

            // 3. Guardar archivo físico en disco
            String relativePath = fileStorageService.storeFile(file, "documents");
            String cleanOriginalName = org.springframework.util.StringUtils.cleanPath(file.getOriginalFilename());

            // 4. Registro para la bandeja de ENVIADOS (Emisor)
            DocumentMetadata sentMetadata = new DocumentMetadata();
            sentMetadata.setFilename(relativePath);
            sentMetadata.setOriginalname(cleanOriginalName);
            sentMetadata.setSender(currentUser);
            sentMetadata.setReceiver(receiverUser);
            sentMetadata.setFolder_type(FolderType.SENT);
            documentMetadataRepository.save(sentMetadata);

            // 5. Registro para la bandeja de RECIBIDOS (Receptor)
            DocumentMetadata receivedMetadata = new DocumentMetadata();
            receivedMetadata.setFilename(relativePath);
            receivedMetadata.setOriginalname(cleanOriginalName);
            receivedMetadata.setSender(currentUser);
            receivedMetadata.setReceiver(receiverUser);
            receivedMetadata.setFolder_type(FolderType.RECEIVED);
            documentMetadataRepository.save(receivedMetadata);

            return ResponseEntity.ok(Map.of(
                    "message", "Documento enviado con éxito al destinatario",
                    "filename", relativePath,
                    "originalname", cleanOriginalName));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error crítico al procesar el intercambio del documento",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * [DIRECTORIO DINÁMICO]: Recupera los profesores de los cursos en los que el
     * alumno está matriculado.
     */
    @GetMapping("/directory/teachers")
    public ResponseEntity<?> getMyTeachers(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autenticado."));
            }

            Users currentUser = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("Usuario emisor no encontrado."));

            // 1. Obtener todas las matrículas del alumno con sus respectivos cursos
            List<com.cursosonline.backend.entities.Enrollment> enrollments = enrollmentRepository
                    .findAllByUserIdWithCourses(currentUser.getUser_id());

            // 2. Traer todos los usuarios con rol PROFESOR del sistema para cruzarlos en
            // memoria
            List<Users> allProfessors = userRepository.findByRole(Role.PROFESSOR);

            // 3. Filtrar los profesores cuyos nombres aparezcan en la cadena "instructors"
            // de los cursos matriculados
            List<UserDirectoryDTO> myTeachers = allProfessors.stream()
                    .filter(prof -> enrollments.stream().anyMatch(e -> e.getCourse().getInstructors() != null &&
                            e.getCourse().getInstructors().contains(prof.getUsername())))
                    .map(p -> new UserDirectoryDTO(p.getUser_id(), p.getUsername(), p.getEmail(), p.getRole().name()))
                    .toList();

            return ResponseEntity.ok(myTeachers);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * [DIRECTORIO DINÁMICO]: Recupera los compañeros de clase que comparten
     * asignaturas con el alumno.
     */
    @GetMapping("/directory/classmates")
    public ResponseEntity<?> getMyClassmates(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autenticado."));
            }

            List<UserDirectoryDTO> classmates = userRepository.findClassmatesByUsername(authentication.getName())
                    .stream()
                    .map(c -> new UserDirectoryDTO(c.getUser_id(), c.getUsername(), c.getEmail(), c.getRole().name()))
                    .toList();

            return ResponseEntity.ok(classmates);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * [DIRECTORIO DINÁMICO]: Recupera las cuentas de administración de la
     * plataforma.
     */
    @GetMapping("/directory/admins")
    public ResponseEntity<?> getPlatformAdmins(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autenticado."));
            }

            List<UserDirectoryDTO> admins = userRepository.findByRole(Role.ADMIN).stream()
                    .map(a -> new UserDirectoryDTO(a.getUser_id(), a.getUsername(), a.getEmail(), a.getRole().name()))
                    .toList();

            return ResponseEntity.ok(admins);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * [NUEVO ENDPOINT ANTI-IDOR]: Descarga segura de archivos con stream binario.
     * Recupera el recurso del disco solo si el usuario autenticado es emisor o
     * receptor.
     */
    @GetMapping("/download/{documentId}")
    public ResponseEntity<?> downloadDocumentSecure(
            Authentication authentication,
            @PathVariable("documentId") Long documentId) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            String currentUsername = authentication.getName();

            // 1. AUDITORÍA CRÍTICA EN BD: Recuperar metadatos para cruzar la propiedad
            DocumentMetadata doc = documentMetadataRepository.findById(documentId)
                    .orElseThrow(() -> new RuntimeException("El documento solicitado no existe en el sistema."));

            // 2. CORTOCUITO DEFENSIVO ANTI-IDOR: Comprobar que pertenece al contrato
            // dirigido
            boolean isSender = doc.getSender().getUsername().equals(currentUsername);
            boolean isReceiver = doc.getReceiver().getUsername().equals(currentUsername);

            if (!isSender && !isReceiver) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error",
                                "Acceso denegado: No tienes permisos legítimos para descargar este archivo."));
            }

            // 3. Conversión asíncrona a Stream Binario cargando el recurso de disco
            org.springframework.core.io.Resource resource = fileStorageService.loadFileAsResource(doc.getFilename());

            if (resource == null || !resource.exists()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "El archivo físico no se encuentra en el servidor."));
            }

            // 4. Inyección perimetral de cabeceras seguras Content-Disposition
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + doc.getOriginalname() + "\"")
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error crítico al procesar la descarga segura por stream",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

}
