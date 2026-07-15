package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.UserDirectoryDTO;
import com.cursosonline.backend.entities.DocumentMetadata;
import com.cursosonline.backend.entities.Enrollment;
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
import java.util.LinkedHashMap;
import java.util.Objects;

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
            // Reemplaza la línea vieja por esta nueva versión limpia:
            List<DocumentMetadata> documents = documentMetadataRepository.findReceivedDocumentsByUsername(username);

            return ResponseEntity.ok(documents.stream().map(this::toDocumentResponse).toList());

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

            return ResponseEntity.ok(documents.stream().map(this::toDocumentResponse).toList());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error al recuperar los documentos enviados",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * Recupera los documentos recibidos del usuario autenticado filtrados por
     * asignatura.
     */
    @GetMapping("/course/{courseId}/received")
    public ResponseEntity<?> getReceivedDocumentsByCourse(
            Authentication authentication,
            @PathVariable("courseId") Long courseId) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            String username = authentication.getName();
            List<DocumentMetadata> documents = documentMetadataRepository
                    .findReceivedDocumentsByUsernameAndCourse(username, courseId);

            return ResponseEntity.ok(documents.stream().map(this::toDocumentResponse).toList());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error al recuperar los documentos recibidos de la asignatura",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * Recupera los documentos enviados del usuario autenticado filtrados por
     * asignatura.
     */
    @GetMapping("/course/{courseId}/sent")
    public ResponseEntity<?> getSentDocumentsByCourse(
            Authentication authentication,
            @PathVariable("courseId") Long courseId) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            String username = authentication.getName();
            List<DocumentMetadata> documents = documentMetadataRepository
                    .findSentDocumentsByUsernameAndCourse(username, courseId);

            return ResponseEntity.ok(documents.stream().map(this::toDocumentResponse).toList());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error al recuperar los documentos enviados de la asignatura",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * [ENDPOINT DE CARGA DIRIGIDO ORIGINAL]: Recibe el archivo y el ID del
     * destinatario
     * obligatorio para mensajería general. (RESTAURADO PARA LOS TESTS)
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

            if (currentUser.getUser_id().equals(receiverId)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "No puedes enviarte un documento a ti mismo."));
            }

            Users receiverUser = userRepository.findById(receiverId)
                    .orElseThrow(() -> new RuntimeException("El usuario destinatario no existe."));

            String relativePath = fileStorageService.storeFile(file, "documents");
            String cleanOriginalName = org.springframework.util.StringUtils.cleanPath(file.getOriginalFilename());

            DocumentMetadata sentMetadata = new DocumentMetadata();
            sentMetadata.setFilename(relativePath);
            sentMetadata.setOriginalname(cleanOriginalName);
            sentMetadata.setSender(currentUser);
            sentMetadata.setReceiver(receiverUser);
            sentMetadata.setFolder_type(FolderType.SENT);
            documentMetadataRepository.save(sentMetadata);

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
     * [ENDPOINT ACADÉMICO EXCLUSIVO NUEVO]: Recibe el archivo de una asignatura,
     * valida que tenga un profesor legítimo asignado y registra la entrega.
     */
    @PostMapping("/upload/assignment")
    public ResponseEntity<?> uploadAssignmentDocument(
            Authentication authentication,
            @RequestParam("file") MultipartFile file,
            @RequestParam("courseId") Long courseId,
            @RequestParam("evaluationType") String evaluationType) {

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

            // Selección determinista y acotada al alumno autenticado para evitar
            // asociaciones
            // erróneas por barrido global.
            List<Enrollment> matchingEnrollments = enrollmentRepository
                    .findAllByUserIdWithCourses(currentUser.getUser_id())
                    .stream()
                    .filter(e -> e.getCourse() != null && Objects.equals(e.getCourse().getCourse_id(), courseId))
                    .toList();

            if (matchingEnrollments.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "No se encontró una matrícula activa para esta asignatura."));
            }

            if (matchingEnrollments.size() > 1) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error",
                                "Inconsistencia detectada: existen múltiples matrículas para el mismo alumno y asignatura."));
            }

            Enrollment enrollment = matchingEnrollments.get(0);
            String instructorNames = enrollment.getCourse().getInstructors();

            if (instructorNames == null || instructorNames.trim().isEmpty()
                    || instructorNames.equalsIgnoreCase("Sin asignar")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error",
                                "Profesor no asignado. No se pueden realizar entregas en esta asignatura."));
            }

            String targetInstructor = instructorNames.split(",")[0].trim();

            Users receiverUser = userRepository.findByUsername(targetInstructor)
                    .orElse(null);

            if (receiverUser == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error",
                                "El profesor '" + targetInstructor + "' no está registrado como usuario activo."));
            }

            String relativePath = fileStorageService.storeFile(file, "documents");
            String cleanOriginalName = org.springframework.util.StringUtils.cleanPath(file.getOriginalFilename());

            DocumentMetadata sentMetadata = new DocumentMetadata();
            sentMetadata.setFilename(relativePath);
            sentMetadata.setOriginalname(cleanOriginalName);
            sentMetadata.setSender(currentUser);
            sentMetadata.setReceiver(receiverUser);
            sentMetadata.setFolder_type(FolderType.SENT);
            documentMetadataRepository.save(sentMetadata);

            DocumentMetadata receivedMetadata = new DocumentMetadata();
            receivedMetadata.setFilename(relativePath);
            receivedMetadata.setOriginalname(cleanOriginalName);
            receivedMetadata.setSender(currentUser);
            receivedMetadata.setReceiver(receiverUser);
            receivedMetadata.setFolder_type(FolderType.RECEIVED);
            documentMetadataRepository.save(receivedMetadata);

            return ResponseEntity.ok(Map.of(
                    "message", "Entrega académica registrada con éxito para el profesor " + targetInstructor,
                    "filename", relativePath,
                    "originalname", cleanOriginalName));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error crítico al procesar la entrega académica",
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
            String senderUsername = doc.getSender() != null ? doc.getSender().getUsername() : null;
            String receiverUsername = doc.getReceiver() != null ? doc.getReceiver().getUsername() : null;
            boolean isSender = Objects.equals(senderUsername, currentUsername);
            boolean isReceiver = Objects.equals(receiverUsername, currentUsername);

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

    /**
     * [NUEVO ENDPOINT]: Marca un documento recibido como leído para actualizar
     * el estado de la campana de notificaciones en el frontend.
     */
    @PatchMapping("/{documentId}/read")
    public ResponseEntity<?> markAsRead(
            Authentication authentication,
            @PathVariable("documentId") Long documentId) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            String currentUsername = authentication.getName();

            // 1. Recuperar el documento de la base de datos
            DocumentMetadata doc = documentMetadataRepository.findById(documentId)
                    .orElseThrow(() -> new RuntimeException("El documento especificado no existe."));

            // 2. Control de seguridad y contexto: Solo el receptor legítimo puede marcarlo
            // como leído
            // y únicamente si pertenece a su pestaña de recibidos (RECEIVED).
            String receiverUsername = doc.getReceiver() != null ? doc.getReceiver().getUsername() : null;
            boolean isReceiver = Objects.equals(receiverUsername, currentUsername);
            boolean isReceivedFolder = doc.getFolder_type() == FolderType.RECEIVED;

            if (!isReceiver || !isReceivedFolder) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Acceso denegado: No puedes modificar el estado de este documento."));
            }

            // 3. Modificación del estado empleando camelCase (isRead)
            if (!doc.isRead()) {
                doc.setRead(true);
                documentMetadataRepository.save(doc);
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Documento marcado como leído correctamente.",
                    "documentId", documentId,
                    "isRead", true));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error al actualizar el estado de lectura del documento",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    private Map<String, Object> toDocumentResponse(DocumentMetadata document) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("documentid", document.getDocumentid());
        payload.put("filename", document.getFilename());
        payload.put("originalname", document.getOriginalname());
        payload.put("upload_date", document.getUpload_date());
        payload.put("evaluation_type", document.getEvaluation_type());
        payload.put("folder_type", document.getFolder_type());
        payload.put("isRead", document.isRead());
        payload.put("sender", toUserSummary(document.getSender()));
        payload.put("receiver", toUserSummary(document.getReceiver()));
        return payload;
    }

    private Map<String, Object> toUserSummary(Users user) {
        if (user == null) {
            return null;
        }

        return Map.of(
                "userId", user.getUser_id(),
                "username", user.getUsername(),
                "email", user.getEmail() != null ? user.getEmail() : "",
                "role", user.getRole() != null ? user.getRole().name() : "UNKNOWN");
    }

}
