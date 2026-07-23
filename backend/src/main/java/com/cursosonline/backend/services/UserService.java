package com.cursosonline.backend.services;

import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.entities.Interest;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.dto.InterestDTO;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.DocumentMetadataRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.InterestRepository;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.exception.UserAlreadyExistsException;
import com.cursosonline.backend.exception.ResourceNotFoundException; // Auditoría: Importación semántica para errores 404

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;

import java.util.Optional;
import java.util.List;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Locale;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.ArrayList;
import lombok.RequiredArgsConstructor;

/**
 * Servicio que maneja la lógica de negocio relacionada con los usuarios de la
 * plataforma. Optimized for TFG.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final InterestRepository interestRepository;
    private final CoursesRepository coursesRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final DocumentMetadataRepository documentMetadataRepository;
    private Clock clock = Clock.systemUTC();

    /**
     * Busca un usuario por su nombre de usuario.
     */
    @Transactional(readOnly = true)
    public Optional<Users> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    /**
     * Registra un nuevo usuario en la plataforma.
     * Verifica que el nombre de usuario no exista previamente, cifra la contraseña
     * y asigna el rol de student por defecto.
     */
    @Transactional
    public Users registerUser(Users user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new UserAlreadyExistsException(user.getUsername());
        }
        String encodedPassword = passwordEncoder.encode(user.getPassword());
        user.setPassword(encodedPassword);
        user.setRole(Role.STUDENT);
        user.setEnabled(true);
        return userRepository.save(user);
    }

    /**
     * Realiza el proceso de login verificando el nombre de usuario y la contraseña.
     * Valida que la cuenta no se encuentre dada de baja lógicamente.
     */
    @Transactional(readOnly = true)
    public Users login(String username, String rawPassword) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ServicesException("Usuario no encontrado"));

        if (!user.isEnabled()) {
            throw new ServicesException("Acceso denegada: La cuenta de este usuario ha sido dada de baja.");
        }

        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new ServicesException("Contraseña incorrecta");
        }
        return user;
    }

    /**
     * Obtiene una lista de todos los usuarios registrados en la plataforma.
     */
    @Transactional(readOnly = true)
    public List<Users> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Actualiza el rol de un usuario específico en la plataforma.
     */
    @Transactional
    public Users updateUserRole(String username, Role newRole) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ServicesException("Usuario no encontrado para actualizar el rol"));

        user.setRole(newRole);
        return userRepository.save(user);
    }

    /**
     * Realiza el borrado lógico de un usuario desactivando su acceso.
     * Lanzamiento de ResourceNotFoundException (HTTP 404) en
     * lugar de RuntimeException.
     */
    @Transactional
    public Users deleteByUsername(String username) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con el username: " + username));

        if (user.isEnabled()) {
            user.setEnabled(false);
        } else {
            user.setEnabled(true);
        }

        return userRepository.saveAndFlush(user);
    }

    /**
     * Recupera de forma transaccional los intereses de un usuario específico.
     * 
     * @param username
     * @return
     */
    @Transactional(readOnly = true)
    public InterestDTO getUserInterests(String username) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con el username: " + username));

        Interest interest = interestRepository.findById(user.getUser_id())
                .orElse(null);

        if (interest == null) {
            return new InterestDTO(
                    Collections.emptyList(),
                    Collections.emptyList(),
                    Collections.emptyList(),
                    Collections.emptyList(),
                    Collections.emptyList());
        }

        // [HIDRATACIÓN EXPLÍCITA FORZADA - ADR-31]
        // Obliga a Hibernate a resolver los proxies de colecciones y serializar los
        // datos antes de cerrar la sesión
        if (interest.getCategory() != null)
            interest.getCategory().size();
        if (interest.getCourse_type() != null)
            interest.getCourse_type().size();
        if (interest.getDuration() != null)
            interest.getDuration().size();
        if (interest.getLanguage() != null)
            interest.getLanguage().size();
        if (interest.getSubtitle_languages() != null)
            interest.getSubtitle_languages().size();

        return new InterestDTO(
                interest.getCategory(),
                interest.getCourse_type(),
                interest.getDuration(),
                interest.getLanguage(),
                interest.getSubtitle_languages());
    }

    /**
     * Guarda o actualiza de forma transaccional las preferencias de un estudiante.
     * Si es la primera vez que configura sus intereses, se instancia una nueva
     * entidad vinculada a su cuenta de PostgreSQL usando @MapsId.
     * Corregido bajo [ADR-18] para preservar los envoltorios PersistentBag de
     * Hibernate.
     */
    @Transactional
    public void saveUserInterests(String username, InterestDTO dto) {
        // 1. Validar la existencia del usuario en el sistema con excepción semántica
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con el username: " + username));

        // 2. Buscar si ya tiene un registro de intereses previo. Si no existe, creamos
        // uno nuevo con ID síncrono.
        Interest interest = interestRepository.findById(user.getUser_id())
                .orElseGet(() -> {
                    Interest newInterest = new Interest();
                    newInterest.setId(user.getUser_id()); // Sincronización manual requerida por @MapsId
                    newInterest.setUser(user);
                    return interestRepository.save(newInterest);
                });

        // 3. Mapear y actualizar el contenido de los listados preservando las
        // referencias de Hibernate [ADR-18]
        updateCollection(interest.getCategory(), dto.categories());
        updateCollection(interest.getCourse_type(), dto.levels());
        updateCollection(interest.getDuration(), dto.durations());
        updateCollection(interest.getLanguage(), dto.languages());
        updateCollection(interest.getSubtitle_languages(), dto.subtitles());

        // 4. Persistir los cambios forzando el volcado directo a PostgreSQL y sus 5
        // tablas satélite
        interestRepository.saveAndFlush(interest);
    }

    /**
     * Método auxiliar privado que implementa el mecanismo destructivo-limpio
     * [ADR-18].
     * Modifica el contenido de la lista gestionada por el ORM sin romper su
     * envoltorio PersistentBag.
     */
    private void updateCollection(List<String> current, List<String> next) {
        current.clear();
        if (next != null) {
            current.addAll(next);
        }
    }

    /**
     * Consulta predictiva corregida. Formatea los comodines en Java para evitar
     * colisiones de binding en el ORM de PostgreSQL y limita el resultado a 12
     * elementos.
     */
    @Transactional(readOnly = true)
    public List<Courses> searchCourses(String keyword) {
        // Configuramos el límite exacto a 12 elementos solicitados para la UI (Página
        // 0, Tamaño 12)
        Pageable pageSize = PageRequest.of(0, 12);

        // Si el buscador está vacío, devolvemos los 12 primeros de forma segura
        if (keyword == null || keyword.trim().isEmpty()) {
            return coursesRepository.findAll(pageSize).getContent();
        }

        String cleanKeyword = keyword.trim();
        // Creamos los dos patrones de coincidencia de forma nativa en Java
        String formattedKeyword = "%" + cleanKeyword + "%"; // Para buscar en cualquier parte
        String startKeyword = cleanKeyword + "%"; // Para priorizar si empieza por la palabra

        // [CORREGIDO] Invocamos al repositorio paginado y desenvolvemos la lista con
        // .getContent()
        return coursesRepository.searchCoursesPredictive(formattedKeyword, startKeyword, pageSize).getContent();
    }

    /**
     * Recupera las asignaturas vinculadas al profesor autenticado para hidratar
     * su panel tras iniciar sesión.
     */
    @Transactional(readOnly = true)
    public List<Courses> getAssignedCoursesForProfessor(String principalIdentity) {
        Optional<Users> userByUsername = userRepository.findByUsername(principalIdentity);
        Optional<Users> userByEmail = userByUsername.isPresent()
                ? Optional.empty()
                : userRepository.findByEmailIgnoreCase(principalIdentity);

        Users user = userByUsername.orElseGet(() -> userByEmail.orElse(null));
        Set<String> aliases = buildProfessorAliases(principalIdentity, user);

        Set<Long> seenCourseIds = new LinkedHashSet<>();
        List<Courses> mergedCourses = new ArrayList<>();

        for (String alias : aliases) {
            List<Courses> relationalAndDirectMatches = coursesRepository.findAllAssignedToProfessor(alias);
            for (Courses course : relationalAndDirectMatches) {
                if (course.getCourse_id() == null || seenCourseIds.add(course.getCourse_id())) {
                    mergedCourses.add(course);
                }
            }
        }

        if (!aliases.isEmpty()) {
            List<Courses> legacyCandidates = coursesRepository.findAllByInstructorsIsNotNullOrderByTitleAsc();

            for (Courses course : legacyCandidates) {
                Long courseId = course.getCourse_id();
                if (courseId != null && seenCourseIds.contains(courseId)) {
                    continue;
                }

                if (isLegacyInstructorOwnedByProfessor(course.getInstructors(), aliases)) {
                    mergedCourses.add(course);
                    if (courseId != null) {
                        seenCourseIds.add(courseId);
                    }
                }
            }
        }

        return mergedCourses;
    }

    private Set<String> buildProfessorAliases(String principalIdentity, Users user) {
        Set<String> aliases = new LinkedHashSet<>();
        addAlias(aliases, principalIdentity);
        splitAndAddTokens(aliases, principalIdentity);

        if (user != null) {
            addAlias(aliases, user.getUsername());
            addAlias(aliases, user.getEmail());

            String email = user.getEmail();
            if (email != null) {
                int atIndex = email.indexOf('@');
                if (atIndex > 0) {
                    addAlias(aliases, email.substring(0, atIndex));
                }
            }

            splitAndAddTokens(aliases, user.getUsername());
            splitAndAddTokens(aliases, user.getEmail());
        }

        return aliases;
    }

    private void splitAndAddTokens(Set<String> aliases, String rawValue) {
        if (rawValue == null) {
            return;
        }

        String[] parts = rawValue.split("[\\s._@-]+");
        for (String part : parts) {
            if (part != null && part.length() >= 3) {
                addAlias(aliases, part);
            }
        }
    }

    private void addAlias(Set<String> aliases, String rawAlias) {
        if (rawAlias == null) {
            return;
        }

        String normalized = rawAlias.trim().toLowerCase(Locale.ROOT);
        if (!normalized.isEmpty()) {
            aliases.add(normalized);
        }
    }

    private boolean isLegacyInstructorOwnedByProfessor(String instructors, Set<String> aliases) {
        if (instructors == null || instructors.trim().isEmpty()) {
            return false;
        }

        String[] tokens = instructors.split(",");
        for (String token : tokens) {
            String normalizedToken = token.trim().toLowerCase(Locale.ROOT);
            if (normalizedToken.isEmpty()) {
                continue;
            }

            if (aliases.contains(normalizedToken)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Matricula de forma segura a un estudiante en un curso utilizando la entidad
     * intermedia Enrollment. Valida preventivamente en PostgreSQL para evitar
     * registros duplicados.
     */
    @Transactional
    public Enrollment enrollStudentInCourse(String username, Long courseId) {
        // 1. Validar precondición de existencia de usuario
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ServicesException("Usuario no encontrado"));

        // 2. Validar precondición de existencia de curso
        Courses course = coursesRepository.findById(courseId)
                .orElseThrow(() -> new ServicesException("Curso no encontrado en el catálogo"));

        // 3. Control estricto de duplicidad antes de efectuar la persistencia
        Optional<Enrollment> existingEnrollment = enrollmentRepository
                .findByUserIdAndCourseId(user.getUser_id(), course.getCourse_id());

        if (existingEnrollment.isPresent()) {
            throw new ServicesException("Acción inválida: Ya te encuentras matriculado en este curso.");
        }

        // 4. Instanciar y configurar el objeto de matrícula explícito
        Enrollment enrollment = new Enrollment();
        enrollment.setUser(user);
        enrollment.setCourse(course);

        // 5. Volcar de forma transaccional directa a PostgreSQL
        return enrollmentRepository.saveAndFlush(enrollment);
    }

    /**
     * 
     * Método seguro para iniciar el cronómetro de un curso [ADR-34].
     * Valida la identidad del alumno frente a la matrícula antes de guardar el
     * sello de tiempo.
     */
    @Transactional
    public void startCourseSecure(Long enrollmentId, String authenticatedUsername) {
        // 1. Buscamos la matrícula cruzando el ID y el nombre de usuario autenticado.
        // Si no coinciden, lanza error 404 de inmediato mitigando ataques de sondeo de
        // IDs de otros alumnos.
        Enrollment enrollment = enrollmentRepository
                .findByEnrollmentidAndUserUsername(enrollmentId, authenticatedUsername)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Matrícula no encontrada o acceso denegado", enrollmentId));

        // 2. Si la matrícula es válida y no ha sido iniciada previamente, guardamos el
        // sello de tiempo
        if (enrollment.getStarted_at() == null) {
            enrollment.setStarted_at(LocalDateTime.now(clock));
            enrollment.setStatus("EN_CURSO");
            enrollmentRepository.save(enrollment);
        }
    }

    /**
     * Calcula el progreso real basado en el tiempo transcurrido (24h/día) de forma
     * determinista y libre de operaciones concurrentes en base de datos.
     */
    public int calculateCurrentProgress(Enrollment enrollment) {
        if (enrollment.getStarted_at() == null)
            return 0;

        // Mapeo seguro .longValue() para evitar problemas de tipos primitivos con Float
        long totalHours = enrollment.getCourse().getDuration().longValue();
        if (totalHours <= 0)
            return 0;

        // Cálculo de horas transcurridas preciso usando el reloj inyectado
        long hoursElapsed = java.time.Duration.between(
                enrollment.getStarted_at(),
                LocalDateTime.now(clock)).toHours();

        double progress = (hoursElapsed * 100.0) / totalHours;

        // Acotamiento inmutable estricto entre 0 y 100
        return (int) Math.max(0, Math.min(100, Math.floor(progress)));
    }

    /**
     * Permite inyectar un reloj alternativo desde la suite de pruebas unitarias.
     */
    public void setClock(Clock clock) {
        this.clock = clock;
    }

    /**
     * Recupera de forma transaccional las asignaturas activas del estudiante
     * y calcula de forma dinámica su progreso al vuelo antes de enviarlas al
     * frontend.
     */
    @Transactional(readOnly = true)
    public List<Enrollment> getStudentActiveCoursesWithCalculatedProgress(Long userId) {
        // 1. Recuperamos la lista directa desde la relación JOIN FETCH del repositorio
        List<Enrollment> enrollments = enrollmentRepository.findAllByUserIdWithCourses(userId);

        // 2. Recorremos cada matrícula para inyectar proactivamente el progreso
        // dinámico transcurrido e hidratar las notas correspondientes
        for (Enrollment enrollment : enrollments) {
            int currentProgress = calculateCurrentProgress(enrollment);
            enrollment.setProgress_percentage(currentProgress);

            // Forzamos a Hibernate a inicializar la colección de notas desde PostgreSQL
            if (enrollment.getGrades() != null) {
                enrollment.getGrades().size();
            }
        }

        // 3. Devolvemos la lista perfectamente calculada y sincronizada
        return enrollments;
    }

    /**
     * Recupera y consolida de forma segura las métricas analíticas desde SQL Nativo
     * [ADR-41].
     */
    @Transactional(readOnly = true)
    public com.cursosonline.backend.dto.CourseStatsDTO getCourseStats(Long courseId) {
        java.util.Map<String, Object> row = coursesRepository.getCourseAnalyticalStatsNative(courseId);

        if (row == null || row.isEmpty() || row.get("courseId") == null) {
            return null; // Criterio honesto de nulos puros si el curso no existe o no tiene datos
        }

        return new com.cursosonline.backend.dto.CourseStatsDTO(
                ((Number) row.get("courseId")).longValue(),
                row.get("averageGrade") != null ? ((Number) row.get("averageGrade")).doubleValue() : null,
                row.get("localEnrollments") != null ? ((Number) row.get("localEnrollments")).longValue() : 0L,
                row.get("communityRating") != null ? ((Number) row.get("communityRating")).doubleValue() : null,
                row.get("instructorRating") != null ? ((Number) row.get("instructorRating")).doubleValue() : null,
                (String) row.get("platform"),
                (String) row.get("category"));
    }

    /**
     * Calcula y centraliza de forma transaccional las alertas activas del
     * estudiante.
     * Evalúa la bandeja de entrada de documentos y el progreso de los cursos.
     */
    @Transactional(readOnly = true)
    public List<com.cursosonline.backend.dto.NotificationDTO> getUserNotifications(String username) {
        java.util.List<com.cursosonline.backend.dto.NotificationDTO> alerts = new java.util.ArrayList<>();

        // 1. Regla de negocio: Documentos en bandeja de entrada
        java.util.List<com.cursosonline.backend.entities.DocumentMetadata> receivedDocs = documentMetadataRepository
                .findReceivedDocumentsByUsername(username);

        if (receivedDocs != null && !receivedDocs.isEmpty()) {
            alerts.add(new com.cursosonline.backend.dto.NotificationDTO(
                    "DOCUMENT_INBOX",
                    "Bandeja de Entrada",
                    "Tienes " + receivedDocs.size() + " documento(s) pendiente(s) en tu bandeja.",
                    "/student/documents"));
        }

        // 2. Regla de negocio: Cursos con progreso >= 90% y < 100%
        Users user = userRepository.findByUsername(username).orElse(null);
        if (user != null) {
            java.util.List<Enrollment> enrollments = enrollmentRepository.findAllByUserIdWithCourses(user.getUser_id());
            if (enrollments != null) {
                for (Enrollment enrollment : enrollments) {
                    int progress = calculateCurrentProgress(enrollment);
                    if (progress >= 90 && progress < 100) {
                        alerts.add(new com.cursosonline.backend.dto.NotificationDTO(
                                "COURSE_PROGRESS",
                                "Asignatura por finalizar",
                                "El curso '" + enrollment.getCourse().getTitle() + "' está al " + progress
                                        + "%. ¡Ya casi lo tienes!",
                                "/student/courses"));
                    }
                }
            }
        }

        return alerts;
    }

    /**
     * Lógica transaccional genérica para vincular formalmente un curso a cualquier
     * cuenta de usuario (PROFESSOR, STUDENT o ADMIN) mediante clave foránea fuerte.
     *
     * @param username Nombre de usuario único que solicita o recibe la asignación.
     * @param courseId Identificador único del curso en PostgreSQL.
     * @return La entidad Courses actualizada y persistida.
     */
    @Transactional
    public Courses assignUserToCourse(String username, Long courseId) {
        // 1. Validar la existencia del usuario en el sistema
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con el username: " + username));

        // 2. Validar la existencia del curso en el catálogo de PostgreSQL
        Courses course = coursesRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Curso no encontrado en el catálogo con el ID: " + courseId));

        // 3. Control de Ocupación Preventivo: Validar si el curso ya está asignado a
        // otro usuario
        if (course.getAssignedUser() != null) {
            throw new ServicesException(
                    "Acción inválida: Este curso ya cuenta con un usuario titular asignado de forma relacional.");
        }

        // 4. Establecer la vinculación relacional fuerte (JPA mapeará la clave
        // assigned_user_id)
        course.setAssignedUser(user);

        // 5. Mantener sincronía de texto con las búsquedas predictivas existentes si es
        // un profesor
        if (user.getRole() == Role.PROFESSOR || user.getRole() == Role.PROFESSOR) {
            course.setInstructors(user.getUsername());
        }

        // 6. Volcar los cambios de forma transaccional directa a PostgreSQL
        return coursesRepository.saveAndFlush(course);
    }

}
