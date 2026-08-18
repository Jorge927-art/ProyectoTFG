package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.UserDirectoryDTO;
import com.cursosonline.backend.entities.DocumentMetadata;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.FolderType;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.DocumentMetadataRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.services.FileStorageService;
import com.cursosonline.backend.services.ProfessorCourseAlertService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Objects;
import java.util.Locale;

/**
 * Controlador REST para gestionar las operaciones relacionadas con la
 * gestión de documentos.
 * DocumentController
 */
@RestController
@RequestMapping("/api/v1/documents")
@Transactional
public class DocumentController {

    private static final long STANDARD_DOCUMENT_MAX_BYTES = 5L * 1024L * 1024L;
    private static final long ACADEMIC_MEDIA_DOCUMENT_MAX_BYTES = 100L * 1024L * 1024L;

    private final FileStorageService fileStorageService;
    private final DocumentMetadataRepository documentMetadataRepository;
    private final CoursesRepository coursesRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ProfessorCourseAlertService professorCourseAlertService;

    /**
     * Constructor de la clase DocumentController.
     * 
     * @param fileStorageService         Servicio para el almacenamiento de
     *                                   archivos.
     * @param documentMetadataRepository Repositorio para la gestión de metadatos de
     *                                   documentos.
     * @param userRepository             Repositorio para la gestión de usuarios.
     * @param enrollmentRepository       Repositorio para la gestión de matrículas.
     */
    public DocumentController(FileStorageService fileStorageService,
            DocumentMetadataRepository documentMetadataRepository,
            CoursesRepository coursesRepository,
            UserRepository userRepository,
            EnrollmentRepository enrollmentRepository,
            ProfessorCourseAlertService professorCourseAlertService) {
        this.fileStorageService = fileStorageService;
        this.documentMetadataRepository = documentMetadataRepository;
        this.coursesRepository = coursesRepository;
        this.userRepository = userRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.professorCourseAlertService = professorCourseAlertService;
    }

    /**
     * Endpoint para que el administrador recupere un directorio de usuarios y sus
     * roles.
     * 
     * @param authentication
     * @return
     */
    @GetMapping("/admin/users")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> getAdminUsersDirectory(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            List<Map<String, Object>> users = userRepository.findAll().stream()
                    .map(user -> Map.<String, Object>of(
                            "userId", user.getUser_id(),
                            "username", user.getUsername(),
                            "role", user.getRole() != null ? user.getRole().name() : "UNKNOWN",
                            "enabled", user.isEnabled()))
                    .toList();

            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error al recuperar el directorio administrativo de usuarios",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * Endpoint para que el administrador recupere un directorio de cursos y sus
     * categorías.
     * 
     * @param authentication
     * @return
     */
    @GetMapping("/admin/courses")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> getAdminCoursesDirectory(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            List<Map<String, Object>> courses = coursesRepository
                    .findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC,
                            "title"))
                    .stream()
                    .map(course -> Map.<String, Object>of(
                            "courseId", course.getCourse_id(),
                            "title", course.getTitle() != null ? course.getTitle() : "Curso sin título",
                            "category", course.getCategory() != null ? course.getCategory() : "Sin categoría"))
                    .toList();

            return ResponseEntity.ok(courses);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error al recuperar el directorio administrativo de cursos",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * Endpoint para que el profesor recupere destinatarios válidos de una
     * asignatura: alumnado activo del curso, profesorado asociado al curso y
     * administradores globales.
     */
    @GetMapping("/directory/course/{courseId}")
    @PreAuthorize("hasAuthority('STUDENT')")
    public ResponseEntity<?> getStudentCourseDirectory(
            Authentication authentication,
            @PathVariable("courseId") Long courseId) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            Users currentUser = resolveAuthenticatedUser(authentication.getName(),
                    "Usuario autenticado no encontrado.");
            if (!enrollmentRepository.existsByUsernameAndCourseId(currentUser.getUsername(), courseId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error",
                                "Solo puedes consultar usuarios de asignaturas en las que estás matriculado."));
            }

            return getProfessorRecipientsByCourse(authentication, courseId);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error al recuperar usuarios de la asignatura",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    @GetMapping("/professor/courses/{courseId}/recipients")
    @PreAuthorize("hasAnyAuthority('PROFESSOR','ADMIN')")
    public ResponseEntity<?> getProfessorRecipientsByCourse(
            Authentication authentication,
            @PathVariable("courseId") Long courseId) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            Users currentUser = resolveAuthenticatedUser(authentication.getName(),
                    "Usuario autenticado no encontrado.");

            Courses selectedCourse = coursesRepository.findById(courseId)
                    .orElseThrow(() -> new RuntimeException("La asignatura seleccionada no existe."));

            Map<Long, UserDirectoryDTO> recipientsById = new LinkedHashMap<>();

            List<Enrollment> activeEnrollments = enrollmentRepository
                    .findActiveStudentEnrollmentsByCourseId(courseId);
            for (Enrollment enrollment : activeEnrollments) {
                Users student = enrollment.getUser();
                if (student == null || !Boolean.TRUE.equals(student.getEnabled()) || student.getUser_id() == null) {
                    continue;
                }

                recipientsById.put(student.getUser_id(),
                        new UserDirectoryDTO(
                                student.getUser_id(),
                                student.getUsername(),
                                student.getEmail(),
                                student.getRole() != null ? student.getRole().name() : "UNKNOWN"));
            }

            String instructors = selectedCourse.getInstructors() != null ? selectedCourse.getInstructors() : "";
            List<Users> professors = userRepository.findByRole(Role.PROFESSOR);
            for (Users professor : professors) {
                if (professor.getUser_id() == null || !Boolean.TRUE.equals(professor.getEnabled())) {
                    continue;
                }

                boolean assignedProfessor = selectedCourse.getAssignedUser() != null
                        && Objects.equals(selectedCourse.getAssignedUser().getUser_id(), professor.getUser_id());
                boolean listedInCourse = !instructors.isBlank()
                        && professor.getUsername() != null
                        && instructors.contains(professor.getUsername());

                if (assignedProfessor || listedInCourse) {
                    recipientsById.put(professor.getUser_id(),
                            new UserDirectoryDTO(
                                    professor.getUser_id(),
                                    professor.getUsername(),
                                    professor.getEmail(),
                                    professor.getRole() != null ? professor.getRole().name() : "UNKNOWN"));
                }
            }

            List<Users> admins = userRepository.findByRole(Role.ADMIN);
            for (Users admin : admins) {
                if (admin.getUser_id() == null || !Boolean.TRUE.equals(admin.getEnabled())) {
                    continue;
                }

                recipientsById.put(admin.getUser_id(),
                        new UserDirectoryDTO(
                                admin.getUser_id(),
                                admin.getUsername(),
                                admin.getEmail(),
                                admin.getRole() != null ? admin.getRole().name() : "UNKNOWN"));
            }

            recipientsById.remove(currentUser.getUser_id());

            List<UserDirectoryDTO> recipients = recipientsById.values().stream()
                    .sorted(Comparator
                            .comparing(dto -> dto.getUsername() != null ? dto.getUsername().toLowerCase() : ""))
                    .toList();

            return ResponseEntity.ok(recipients);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error al recuperar destinatarios académicos del profesor",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * Endpoint para obtener los documentos recibidos del usuario autenticado.
     * 
     * @param authentication Objeto Authentication que contiene la información del
     *                       usuario autenticado.
     * @return ResponseEntity con la lista de documentos recibidos o un mensaje de
     *         error en caso de fallo.
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
                    .findReceivedGeneralDocumentsByUsername(username);

            return ResponseEntity.ok(documents.stream().map(this::toDocumentResponse).toList());

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error interno al recuperar el listado de documentos",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * Endpoint para obtener los documentos enviados del usuario autenticado.
     * 
     * @param authentication Objeto Authentication que contiene la información del
     *                       usuario autenticado.
     * @return ResponseEntity con la lista de documentos enviados o un mensaje de
     *         error en caso de fallo.
     */
    @GetMapping("/sent")
    public ResponseEntity<?> getSentDocuments(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            String username = authentication.getName();
            List<DocumentMetadata> documents = documentMetadataRepository
                    .findSentGeneralDocumentsByUsername(username);

            return ResponseEntity.ok(documents.stream().map(this::toDocumentResponse).toList());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error al recuperar los documentos enviados",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * Endpoint para obtener los documentos recibidos del usuario autenticado
     * filtrados por asignatura.
     * 
     * @param authentication Objeto Authentication que contiene la información del
     *                       usuario autenticado.
     * @param courseId       El ID del curso por el cual se filtran los documentos.
     * @return ResponseEntity con la lista de documentos recibidos filtrados por
     *         asignatura o un mensaje de error en caso de fallo.
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
     * Endpoint para obtener los documentos enviados del usuario autenticado
     * filtrados por asignatura.
     * 
     * @param authentication Objeto Authentication que contiene la información del
     *                       usuario autenticado.
     * @param courseId       El ID del curso por el cual se filtran los documentos.
     * @return ResponseEntity con la lista de documentos enviados filtrados por
     *         asignatura o un mensaje de error en caso de fallo.
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
     * Endpoint para obtener los documentos asociados a una matrícula específica.
     * Valida que el usuario autenticado sea el instructor asignado a la matrícula.
     * 
     * @param authentication Objeto Authentication que contiene la información del
     *                       usuario autenticado.
     * @param enrollmentId   El ID de la matrícula por la cual se filtran los
     *                       documentos.
     * @return ResponseEntity con la lista de documentos asociados a la matrícula o
     *         un mensaje de error en caso de fallo.
     */
    @GetMapping("/course/enrollment/{enrollmentId}")
    @PreAuthorize("hasAuthority('PROFESSOR')")
    public ResponseEntity<?> getDocumentsByEnrollmentId(
            Authentication authentication,
            @PathVariable("enrollmentId") Long enrollmentId) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            boolean isAuthorized = enrollmentRepository.isInstructorAuthorizedForEnrollment(
                    enrollmentId,
                    authentication.getName());

            if (!isAuthorized) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Acceso denegado: no eres el instructor asignado a esta matrícula."));
            }

            List<DocumentMetadata> documents = documentMetadataRepository
                    .findReceivedDocumentsByEnrollmentIdForInstructor(enrollmentId, authentication.getName());
            return ResponseEntity.ok(documents.stream().map(this::toDocumentResponse).toList());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error al recuperar entregas por matrícula",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * Recupera los exámenes/documentos enviados por el profesor al alumno de
     * una matrícula concreta.
     */
    @GetMapping("/course/enrollment/{enrollmentId}/sent")
    @PreAuthorize("hasAuthority('PROFESSOR')")
    public ResponseEntity<?> getSentDocumentsByEnrollmentId(
            Authentication authentication,
            @PathVariable("enrollmentId") Long enrollmentId) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            boolean isAuthorized = enrollmentRepository.isInstructorAuthorizedForEnrollment(
                    enrollmentId,
                    authentication.getName());

            if (!isAuthorized) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Acceso denegado: no eres el instructor asignado a esta matrícula."));
            }

            List<DocumentMetadata> documents = documentMetadataRepository
                    .findSentDocumentsByEnrollmentIdForInstructor(enrollmentId, authentication.getName());
            return ResponseEntity.ok(documents.stream().map(this::toDocumentResponse).toList());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error al recuperar exámenes enviados al alumno",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * Endpoint para subir un documento y enviarlo a otro usuario.
     * 
     * @param authentication Objeto Authentication que contiene la información del
     *                       usuario autenticado.
     * @param file           El archivo a enviar.
     * @param receiverId     El ID del usuario destinatario.
     * @return ResponseEntity con el resultado de la operación de envío del
     *         documento.
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(
            Authentication authentication,
            @RequestParam("file") MultipartFile file,
            @RequestParam("receiverId") Long receiverId,
            @RequestParam(name = "courseId", required = false) Long courseId) {

        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "El archivo transmitido está vacío o es inválido."));
            }

            validateFileSize(file, ACADEMIC_MEDIA_DOCUMENT_MAX_BYTES,
                    "El archivo excede el límite de 100MB configurado para documentos académicos.");

            Users currentUser = resolveAuthenticatedUser(authentication.getName(), "Usuario emisor no encontrado.");

            if (currentUser.getUser_id().equals(receiverId)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "No puedes enviarte un documento a ti mismo."));
            }

            Users receiverUser = userRepository.findById(receiverId)
                    .orElseThrow(() -> new RuntimeException("El usuario destinatario no existe."));

            Courses selectedCourse = null;
            if (courseId != null) {
                if (!enrollmentRepository.existsByUsernameAndCourseId(authentication.getName(), courseId)) {
                    throw new IllegalArgumentException(
                            "No puedes enviar documentos en una asignatura en la que no estás matriculado.");
                }
                selectedCourse = coursesRepository.findById(courseId)
                        .orElseThrow(() -> new IllegalArgumentException("La asignatura seleccionada no existe."));
            }

            String relativePath = fileStorageService.storeDocumentFile(
                    file,
                    FileStorageService.DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS);
            String cleanOriginalName = org.springframework.util.StringUtils.cleanPath(file.getOriginalFilename());

            Courses receivedCourse = currentUser.getRole() == Role.STUDENT
                    ? null
                    : selectedCourse;
            persistDirectedDocumentPair(relativePath, cleanOriginalName, currentUser, receiverUser, selectedCourse,
                    receivedCourse);

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

    public ResponseEntity<?> uploadDocument(
            Authentication authentication,
            MultipartFile file,
            Long receiverId) {
        return uploadDocument(authentication, file, receiverId, null);
    }

    /**
     * Endpoint para que el administrador suba un documento y lo envíe a todos los
     * alumnos activos de una asignatura.
     * 
     * @param authentication
     * @param file
     * @param courseId
     * @return
     */
    @PostMapping("/admin/upload/course")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> uploadDocumentToCourseByAdmin(
            Authentication authentication,
            @RequestParam("file") MultipartFile file,
            @RequestParam("courseId") Long courseId) {

        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "El archivo transmitido está vacío o es inválido."));
            }

            validateFileSize(file, ACADEMIC_MEDIA_DOCUMENT_MAX_BYTES,
                    "El archivo excede el límite de 100MB configurado para envíos administrativos.");

            Users currentUser = resolveAuthenticatedUser(authentication.getName(),
                    "Usuario administrador emisor no encontrado.");

            Courses course = coursesRepository.findById(courseId)
                    .orElseThrow(() -> new RuntimeException("La asignatura seleccionada no existe."));

            List<Enrollment> classEnrollments = enrollmentRepository.findActiveStudentEnrollmentsByCourseId(courseId);
            if (classEnrollments.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error",
                                "No se puede realizar el envío colectivo porque no hay alumnos activos matriculados en la asignatura."));
            }

            String relativePath = fileStorageService.storeDocumentFile(
                    file,
                    FileStorageService.DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS);
            String cleanOriginalName = org.springframework.util.StringUtils.cleanPath(file.getOriginalFilename());

            for (Enrollment enrollment : classEnrollments) {
                if (enrollment.getUser() != null) {
                    persistDirectedDocumentPair(relativePath, cleanOriginalName, currentUser, enrollment.getUser(),
                            course);
                }
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Documento transmitido con éxito al grupo de alumnos de la asignatura",
                    "courseId", courseId,
                    "totalStudents", classEnrollments.size(),
                    "filename", relativePath,
                    "originalname", cleanOriginalName));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error crítico al procesar el envío colectivo administrativo",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * Endpoint para subir un documento de entrega académica y enviarlo al profesor
     * asignado.
     * 
     * @param authentication Objeto Authentication que contiene la información del
     *                       usuario autenticado.
     * @param file           El archivo de entrega académica.
     * @param courseId       El ID del curso al cual pertenece la entrega.
     * @param evaluationType El tipo de evaluación asociado a la entrega.
     * @return ResponseEntity con el resultado de la operación de envío del
     *         documento.
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

            validateFileSize(file, STANDARD_DOCUMENT_MAX_BYTES,
                    "El archivo excede el límite de 5MB configurado para entregas académicas.");

            validateExamFile(file, evaluationType);

            Users currentUser = resolveAuthenticatedUser(authentication.getName(), "Usuario emisor no encontrado.");

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

            String relativePath = fileStorageService.storeDocumentFile(
                    file,
                    FileStorageService.DocumentValidationProfile.BASIC_DOCUMENTS);
            String cleanOriginalName = org.springframework.util.StringUtils.cleanPath(file.getOriginalFilename());
            String normalizedEvaluationType = evaluationType == null
                    ? ""
                    : evaluationType.trim().toUpperCase(Locale.ROOT);

            DocumentMetadata sentMetadata = new DocumentMetadata();
            sentMetadata.setFilename(relativePath);
            sentMetadata.setOriginalname(cleanOriginalName);
            sentMetadata.setSender(currentUser);
            sentMetadata.setReceiver(receiverUser);
            sentMetadata.setCourse(enrollment.getCourse());
            sentMetadata.setEvaluation_type(normalizedEvaluationType);
            sentMetadata.setFolder_type(FolderType.SENT);
            documentMetadataRepository.save(sentMetadata);

            DocumentMetadata receivedMetadata = new DocumentMetadata();
            receivedMetadata.setFilename(relativePath);
            receivedMetadata.setOriginalname(cleanOriginalName);
            receivedMetadata.setSender(currentUser);
            receivedMetadata.setReceiver(receiverUser);
            receivedMetadata.setCourse(enrollment.getCourse());
            receivedMetadata.setEvaluation_type(normalizedEvaluationType);
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
     * [NUEVO ENDPOINT ANTI-IDOR]: Descarga segura de archivos con stream binario.
     * Recupera el recurso del disco solo si el usuario autenticado es emisor o
     * receptor.
     * 
     * @param authentication Objeto Authentication que contiene la información del
     *                       usuario autenticado.
     * @param documentId     El ID del documento que se desea descargar.
     * @return ResponseEntity con el recurso del archivo o un mensaje de error en
     *         caso de fallo.
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
            // de los cursos matriculados, tolerando matriculas sin curso o sin instructores
            List<UserDirectoryDTO> myTeachers = allProfessors.stream()
                    .filter(prof -> enrollments.stream()
                            .anyMatch(e -> matchesInstructorInCourse(e, prof.getUsername())))
                    .map(p -> new UserDirectoryDTO(p.getUser_id(), p.getUsername(), p.getEmail(),
                            p.getRole() != null ? p.getRole().name() : "UNKNOWN"))
                    .toList();

            return ResponseEntity.ok(myTeachers);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    private boolean matchesInstructorInCourse(Enrollment enrollment, String username) {
        if (enrollment == null || enrollment.getCourse() == null || username == null || username.isBlank()) {
            return false;
        }

        String instructors = enrollment.getCourse().getInstructors();
        return instructors != null && instructors.contains(username);
    }

    /**
     * Endpoint para obtener los compañeros de clase del usuario autenticado.
     * 
     * @param authentication Objeto Authentication que contiene la información del
     *                       usuario autenticado.
     * @return ResponseEntity con la lista de compañeros de clase o un mensaje de
     *         error en caso de fallo.
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
     * Endpoint para obtener los administradores de la plataforma.
     * 
     * @param authentication Objeto Authentication que contiene la información del
     *                       usuario autenticado.
     * @return ResponseEntity con la lista de administradores de la plataforma o un
     *         mensaje de error en caso de fallo.
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
     * Endpoint para descargar un documento de manera segura. Solo permite la
     * descarga si el usuario autenticado es el emisor o receptor del documento.
     * 
     * @param authentication Objeto Authentication que contiene la información del
     *                       usuario autenticado.
     * @param documentId     El ID del documento que se desea descargar.
     * @return ResponseEntity con el recurso del archivo o un mensaje de error en
     *         caso de fallo.
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
     * Endpoint para marcar un documento como leído. Solo permite la operación si el
     * usuario autenticado es el receptor legítimo del documento y si el documento
     * pertenece a la carpeta de recibidos (RECEIVED).
     * 
     * @param authentication Objeto Authentication que contiene la información del
     *                       usuario autenticado.
     * @param documentId     El ID del documento que se desea marcar como leído.
     * @return ResponseEntity con el resultado de la operación o un mensaje de error
     *         en
     *         caso de fallo.
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

    /**
     * Oculta de forma lógica todos los documentos de mensajería general de la
     * bandeja de entrada del usuario autenticado. No elimina registros físicos.
     */
    @PatchMapping("/received/hide-all")
    public ResponseEntity<?> hideAllReceivedGeneralDocuments(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            String username = authentication.getName();
            int hiddenCount = documentMetadataRepository.hideAllReceivedGeneralDocumentsByUsername(username);

            return ResponseEntity.ok(Map.of(
                    "message", "Bandeja de entrada limpiada correctamente.",
                    "hiddenCount", hiddenCount));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error al limpiar la bandeja de entrada.",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * Oculta de forma lógica todos los documentos de mensajería general de la
     * bandeja de salida del usuario autenticado. No elimina registros físicos.
     */
    @PatchMapping("/sent/hide-all")
    public ResponseEntity<?> hideAllSentGeneralDocuments(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            String username = authentication.getName();
            int hiddenCount = documentMetadataRepository.hideAllSentGeneralDocumentsByUsername(username);

            return ResponseEntity.ok(Map.of(
                    "message", "Bandeja de salida limpiada correctamente.",
                    "hiddenCount", hiddenCount));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error al limpiar la bandeja de salida.",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * Convierte un objeto DocumentMetadata en un mapa de respuesta para la API.
     * 
     * @param document El objeto DocumentMetadata que se desea convertir.
     * @return Mapa de respuesta que representa el documento para la API.
     */
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
        payload.put("course", toCourseSummary(document.getCourse()));
        return payload;
    }

    /**
     * Convierte un objeto Users en un mapa de resumen para la API.
     * 
     * @param user El objeto Users que se desea convertir.
     * @return Mapa de resumen que representa al usuario para la API.
     */
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

    /**
     * Convierte un objeto Courses en un mapa de resumen para la API.
     * 
     * @param course El objeto Courses que se desea convertir.
     * @return Mapa de resumen que representa al curso para la API.
     */
    private Map<String, Object> toCourseSummary(Courses course) {
        if (course == null) {
            return null;
        }

        return Map.of(
                "courseId", course.getCourse_id(),
                "title", course.getTitle() != null ? course.getTitle() : "Curso sin título",
                "category", course.getCategory() != null ? course.getCategory() : "Sin categoría");
    }

    /**
     * Endpoint para que un profesor suba un documento y lo envíe a un alumno o a
     * toda la clase.
     * 
     * @param authentication Objeto Authentication que contiene la información del
     *                       usuario autenticado.
     * @param file           El archivo que se desea subir.
     * @param courseId       El ID del curso al cual se desea enviar el documento.
     * @param receiverId     El ID del alumno destinatario. Si es 0, se envía a toda
     *                       la clase.
     * @return ResponseEntity con el resultado de la operación o un mensaje de error
     *         en caso de fallo.
     */
    @PostMapping("/professor-upload")
    public ResponseEntity<?> professorUploadDocument(
            Authentication authentication,
            @RequestParam("file") MultipartFile file,
            @RequestParam("courseId") Long courseId,
            @RequestParam("receiverId") Long receiverId,
            @RequestParam(name = "deliveryType", required = false, defaultValue = "DOCUMENTO") String deliveryType) {

        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No autenticado o token JWT inválido."));
            }

            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "El archivo transmitido está vacío o es inválido."));
            }

            validateFileSize(file, ACADEMIC_MEDIA_DOCUMENT_MAX_BYTES,
                    "El archivo excede el límite de 100MB configurado para documentos académicos.");

            Users currentUser = resolveAuthenticatedUser(authentication.getName(),
                    "Usuario profesor emisor no encontrado.");

            Courses selectedCourse = coursesRepository.findById(courseId)
                    .orElseThrow(() -> new IllegalArgumentException("La asignatura seleccionada no existe."));

            String normalizedDeliveryType = normalizeProfessorDeliveryType(deliveryType);

            validateExamFile(file, normalizedDeliveryType);

            // Almacenamos el archivo una sola vez físicamente en el disco
            String relativePath = fileStorageService.storeDocumentFile(
                    file,
                    FileStorageService.DocumentValidationProfile.ACADEMIC_MEDIA_DOCUMENTS);
            String cleanOriginalName = org.springframework.util.StringUtils.cleanPath(file.getOriginalFilename());

            // CASO A: ENVÍO MASIVO A TODA LA CLASE (receiverId == 0)
            if (receiverId == 0) {
                // Buscamos únicamente matrículas activas de estudiantes para la asignatura.
                List<Enrollment> classEnrollments = enrollmentRepository
                        .findActiveStudentEnrollmentsByCourseId(courseId);

                if (classEnrollments.isEmpty()) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("error",
                                    "No se puede realizar un envío masivo porque no hay alumnos matriculados."));
                }

                // Generamos metadatos por alumno para respetar receiver_id NOT NULL.
                for (Enrollment enrollment : classEnrollments) {
                    if (enrollment.getUser() != null) {
                        Users classStudent = enrollment.getUser();

                        DocumentMetadata bulkSentPerStudent = new DocumentMetadata();
                        bulkSentPerStudent.setFilename(relativePath);
                        bulkSentPerStudent.setOriginalname(cleanOriginalName);
                        bulkSentPerStudent.setSender(currentUser);
                        bulkSentPerStudent.setReceiver(classStudent);
                        bulkSentPerStudent.setCourse(selectedCourse);
                        bulkSentPerStudent.setEvaluation_type(normalizedDeliveryType);
                        bulkSentPerStudent.setFolder_type(FolderType.SENT);
                        documentMetadataRepository.save(bulkSentPerStudent);

                        // Registro de carpeta RECEIVED para que le salte la notificación en la campana
                        DocumentMetadata bulkReceived = new DocumentMetadata();
                        bulkReceived.setFilename(relativePath);
                        bulkReceived.setOriginalname(cleanOriginalName);
                        bulkReceived.setSender(currentUser);
                        bulkReceived.setReceiver(classStudent);
                        bulkReceived
                                .setCourse(resolveReceivedCourseByDeliveryType(selectedCourse, normalizedDeliveryType));
                        bulkReceived.setEvaluation_type(normalizedDeliveryType);
                        bulkReceived.setFolder_type(FolderType.RECEIVED);
                        bulkReceived.setRead(false);
                        documentMetadataRepository.save(bulkReceived);
                        professorCourseAlertService.resolveOldestViewedAlertAfterSuccessfulDelivery(
                                currentUser.getUsername(), classStudent.getUser_id(), courseId,
                                "EXAMEN".equals(normalizedDeliveryType));
                    }
                }

                return ResponseEntity.ok(Map.of(
                        "message", "Documento transmitido con éxito de forma masiva a toda la clase",
                        "totalStudents", classEnrollments.size()));
            }

            // CASO B: ENVÍO SEGMENTADO INDIVIDUAL (receiverId > 0)
            Users receiverUser = userRepository.findById(receiverId)
                    .orElseThrow(() -> new RuntimeException("El alumno destinatario seleccionado no existe."));

            DocumentMetadata singleSent = new DocumentMetadata();
            singleSent.setFilename(relativePath);
            singleSent.setOriginalname(cleanOriginalName);
            singleSent.setSender(currentUser);
            singleSent.setReceiver(receiverUser);
            singleSent.setCourse(selectedCourse);
            singleSent.setEvaluation_type(normalizedDeliveryType);
            singleSent.setFolder_type(FolderType.SENT);
            documentMetadataRepository.save(singleSent);

            DocumentMetadata singleReceived = new DocumentMetadata();
            singleReceived.setFilename(relativePath);
            singleReceived.setOriginalname(cleanOriginalName);
            singleReceived.setSender(currentUser);
            singleReceived.setReceiver(receiverUser);
            singleReceived.setCourse(resolveReceivedCourseByDeliveryType(selectedCourse, normalizedDeliveryType));
            singleReceived.setEvaluation_type(normalizedDeliveryType);
            singleReceived.setFolder_type(FolderType.RECEIVED);
            singleReceived.setRead(false);
            documentMetadataRepository.save(singleReceived);
            professorCourseAlertService.resolveOldestViewedAlertAfterSuccessfulDelivery(
                    currentUser.getUsername(), receiverUser.getUser_id(), courseId,
                    "EXAMEN".equals(normalizedDeliveryType));

            return ResponseEntity.ok(Map.of(
                    "message", "Documento enviado con éxito de forma individual al alumno",
                    "deliveryType", normalizedDeliveryType,
                    "receiver", receiverUser.getUsername()));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Error crítico al procesar la transmisión académica del profesor",
                    "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
        }
    }

    /**
     * Resuelve el usuario autenticado tolerando variaciones de identidad del
     * principal (username exacto, username case-insensitive o email).
     * 
     * @param principalName   El nombre del principal (username o email) del usuario
     *                        autenticado.
     * @param notFoundMessage Mensaje de error a lanzar si el usuario no se
     *                        encuentra.
     * @return El objeto Users correspondiente al usuario autenticado.
     */
    private Users resolveAuthenticatedUser(String principalName, String notFoundMessage) {
        if (principalName == null || principalName.isBlank()) {
            throw new RuntimeException(notFoundMessage);
        }

        return userRepository.findByUsername(principalName)
                .or(() -> userRepository.findByUsernameIgnoreCase(principalName))
                .or(() -> userRepository.findByEmailIgnoreCase(principalName))
                .orElseThrow(() -> new RuntimeException(notFoundMessage));
    }

    /**
     * Valida el tamaño del archivo subido y lanza una excepción si excede el límite
     * permitido.
     * 
     * @param file
     * @param maxBytes
     * @param errorMessage
     */
    private void validateFileSize(MultipartFile file, long maxBytes, String errorMessage) {
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException(errorMessage);
        }
    }

    private String normalizeProfessorDeliveryType(String deliveryType) {
        if (deliveryType == null) {
            return "DOCUMENTO";
        }

        String normalized = deliveryType.trim().toUpperCase(Locale.ROOT);
        if (!normalized.equals("DOCUMENTO") && !normalized.equals("TRABAJO") && !normalized.equals("EXAMEN")) {
            throw new IllegalArgumentException("Tipo de envío no válido. Usa DOCUMENTO, TRABAJO o EXAMEN.");
        }

        return normalized;
    }

    private void validateExamFile(MultipartFile file, String deliveryType) {
        if (!"EXAMEN".equalsIgnoreCase(deliveryType)) {
            return;
        }

        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase(Locale.ROOT) : "";
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase(Locale.ROOT) : "";
        if (!filename.endsWith(".pdf") || !"application/pdf".equals(contentType)) {
            throw new IllegalArgumentException(
                    "Los exámenes solo admiten archivos PDF; los vídeos no están permitidos.");
        }
    }

    private Courses resolveReceivedCourseByDeliveryType(Courses selectedCourse, String deliveryType) {
        return "DOCUMENTO".equals(deliveryType) ? null : selectedCourse;
    }

    /**
     * Persiste un par de metadatos de documento dirigido (emisor y receptor) en la
     * base de datos.
     * 
     * @param relativePath
     * @param cleanOriginalName
     * @param sender
     * @param receiver
     * @param course
     */
    private void persistDirectedDocumentPair(String relativePath, String cleanOriginalName, Users sender,
            Users receiver,
            Courses course) {
        persistDirectedDocumentPair(relativePath, cleanOriginalName, sender, receiver, course, course);
    }

    private void persistDirectedDocumentPair(String relativePath, String cleanOriginalName, Users sender,
            Users receiver, Courses sentCourse, Courses receivedCourse) {
        DocumentMetadata sentMetadata = new DocumentMetadata();
        sentMetadata.setFilename(relativePath);
        sentMetadata.setOriginalname(cleanOriginalName);
        sentMetadata.setSender(sender);
        sentMetadata.setReceiver(receiver);
        sentMetadata.setCourse(sentCourse);
        sentMetadata.setFolder_type(FolderType.SENT);
        sentMetadata.setRead(true);
        documentMetadataRepository.save(sentMetadata);

        DocumentMetadata receivedMetadata = new DocumentMetadata();
        receivedMetadata.setFilename(relativePath);
        receivedMetadata.setOriginalname(cleanOriginalName);
        receivedMetadata.setSender(sender);
        receivedMetadata.setReceiver(receiver);
        receivedMetadata.setCourse(receivedCourse);
        receivedMetadata.setFolder_type(FolderType.RECEIVED);
        receivedMetadata.setRead(false);
        documentMetadataRepository.save(receivedMetadata);
    }

}
