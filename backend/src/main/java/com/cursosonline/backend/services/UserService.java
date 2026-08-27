package com.cursosonline.backend.services;

import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.entities.Interest;
import com.cursosonline.backend.entities.AcademicEvaluation;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.DocumentMetadata;
import com.cursosonline.backend.entities.CourseGrade;
import com.cursosonline.backend.entities.ProfessorAlertType;
import com.cursosonline.backend.dto.InterestDTO;
import com.cursosonline.backend.dto.ProfessorBellAlertSummaryDTO;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.DocumentMetadataRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.InterestRepository;
import com.cursosonline.backend.repository.UserSystemNotificationRepository;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.exception.UserAlreadyExistsException;
import com.cursosonline.backend.exception.ResourceNotFoundException; // Auditoría: Importación semántica para errores 404

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;
import java.util.List;
import java.time.Clock;
import java.time.LocalDateTime;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Locale;
import java.text.Collator;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Servicio de gestión de usuarios y operaciones relacionadas con la plataforma
 * de cursos online.
 * UserService
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserService.class);
    private static final int MAX_FAILED_LOGIN_ATTEMPTS = 3;
    private static final String GRADE_PUBLISHED_NOTIFICATION_TYPE = "GRADE_PUBLISHED";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final InterestRepository interestRepository;
    private final CoursesRepository coursesRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final com.cursosonline.backend.repository.CourseGradeRepository courseGradeRepository;
    private final DocumentMetadataRepository documentMetadataRepository;
    private final UserSystemNotificationRepository userSystemNotificationRepository;
    private final com.cursosonline.backend.repository.AcademicEvaluationRepository academicEvaluationRepository;
    private final com.cursosonline.backend.repository.UserProfileRepository userProfileRepository;
    private final AdminCourseCatalogService adminCourseCatalogService;
    private final ProfessorCourseAlertService professorCourseAlertService;
    private final RecommendationService recommendationService;
    private final JdbcTemplate jdbcTemplate;
    private Clock clock = Clock.systemUTC();

    @org.springframework.beans.factory.annotation.Value("${app.security.protected-username:admin_cole}")
    private String protectedUsername;

    /**
     * Permite buscar un usuario por su nombre de usuario de forma transaccional,
     * devolviendo un Optional que puede estar vacío si no se encuentra.
     *
     * @param username El nombre de usuario del usuario a buscar.
     * @return Un Optional que contiene el usuario si se encuentra, o está vacío si
     *         no se encuentra.
     */
    @Transactional(readOnly = true)
    public Optional<Users> findByUsername(String username) {
        Optional<Users> exactMatch = userRepository.findByUsername(username);
        if (exactMatch.isPresent()) {
            return exactMatch;
        }

        Optional<Users> caseInsensitiveMatch = userRepository.findByUsernameIgnoreCase(username);
        if (caseInsensitiveMatch.isPresent()) {
            return caseInsensitiveMatch;
        }

        return userRepository.findByEmailIgnoreCase(username);
    }

    /**
     * Registra un nuevo usuario en la plataforma, asegurando que el nombre de
     * usuario sea único y que la contraseña se almacene de forma segura mediante
     * codificación.
     *
     * @param user El objeto Users que contiene los datos del nuevo usuario.
     * @return El usuario registrado con su ID generado y la contraseña codificada.
     * @throws UserAlreadyExistsException Si el nombre de usuario ya está en uso.
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
        user.setFailedLoginAttempts(0);
        return userRepository.save(user);
    }

    /**
     * Permite autenticar a un usuario verificando su nombre de usuario y
     * contraseña.
     *
     * @param username    El nombre de usuario del usuario que intenta autenticarse.
     * @param rawPassword La contraseña en texto plano proporcionada por el usuario.
     * @return El usuario autenticado si las credenciales son correctas.
     */
    @Transactional(noRollbackFor = ServicesException.class)
    public Users login(String username, String rawPassword) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ServicesException("Usuario no encontrado"));

        int currentFailedAttempts = user.getFailedLoginAttempts() != null ? user.getFailedLoginAttempts() : 0;

        if (!user.isEnabled()) {
            if (currentFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
                throw new ServicesException("Usuario bloqueado. Póngase en contacto con el administrador");
            }
            throw new ServicesException("Acceso denegado: La cuenta de este usuario ha sido dada de baja.");
        }

        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            int nextFailedAttempts = currentFailedAttempts + 1;
            user.setFailedLoginAttempts(nextFailedAttempts);

            if (nextFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
                user.setEnabled(false);
                userRepository.saveAndFlush(user);
                throw new ServicesException("Usuario bloqueado. Póngase en contacto con el administrador");
            }

            userRepository.saveAndFlush(user);
            int remainingAttempts = MAX_FAILED_LOGIN_ATTEMPTS - nextFailedAttempts;
            String attemptLabel = remainingAttempts == 1 ? "intento" : "intentos";
            String remainingLabel = remainingAttempts == 1 ? "Queda" : "Quedan";
            throw new ServicesException(
                    "Contraseña incorrecta. " + remainingLabel + " " + remainingAttempts + " " + attemptLabel);
        }

        if (currentFailedAttempts > 0) {
            user.setFailedLoginAttempts(0);
            userRepository.saveAndFlush(user);
        }

        return user;
    }

    /**
     * Recupera de forma transaccional todos los usuarios de la plataforma,
     * ordenados alfabéticamente por nombre de usuario y, en caso de empate, por ID
     * de usuario.
     *
     * @return Lista de todos los usuarios de la plataforma, ordenados
     *         alfabéticamente por nombre de usuario y, en caso de empate, por ID de
     *         usuario.
     */
    @Transactional(readOnly = true)
    public List<Users> getAllUsers() {
        List<Users> users = new ArrayList<>(userRepository.findAll());

        Collator spanishCollator = Collator.getInstance(Locale.forLanguageTag("es-ES"));
        spanishCollator.setStrength(Collator.PRIMARY);
        spanishCollator.setDecomposition(Collator.CANONICAL_DECOMPOSITION);

        users.sort((left, right) -> {
            String leftUsername = left != null && left.getUsername() != null ? left.getUsername().trim() : "";
            String rightUsername = right != null && right.getUsername() != null ? right.getUsername().trim() : "";

            int usernameOrder = spanishCollator.compare(leftUsername, rightUsername);
            if (usernameOrder != 0) {
                return usernameOrder;
            }

            long leftId = left != null && left.getUser_id() != null ? left.getUser_id() : Long.MAX_VALUE;
            long rightId = right != null && right.getUser_id() != null ? right.getUser_id() : Long.MAX_VALUE;
            return Long.compare(leftId, rightId);
        });

        return users;
    }

    /**
     * Permite actualizar el rol de un usuario de forma transaccional, asegurando
     * que los cambios se persistan correctamente.
     *
     * @param username El nombre de usuario del usuario cuyo rol se va a actualizar.
     * @param newRole  El nuevo rol que se asignará al usuario.
     * @return El usuario actualizado con el nuevo rol.
     */
    @Transactional
    public Users updateUserRole(String username, Role newRole) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ServicesException("Usuario no encontrado para actualizar el rol"));

        user.setRole(newRole);
        return userRepository.save(user);
    }

    /**
     * Permite habilitar o deshabilitar un usuario de forma transaccional, cambiando
     * su estado de "enabled".
     *
     * @param username El nombre de usuario del usuario a habilitar o deshabilitar.
     * @return El usuario actualizado con el estado de "enabled" modificado.
     */
    @Transactional
    public Users deleteByUsername(String username) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con el username: " + username));

        if (user.isEnabled()) {
            user.setEnabled(false);
        } else {
            user.setEnabled(true);
            user.setFailedLoginAttempts(0);
        }

        return userRepository.saveAndFlush(user);
    }

    /**
     * Permite eliminar permanentemente un usuario de la plataforma, junto con sus
     * documentos, valoraciones y matrículas según corresponda.
     *
     * @param username          El nombre de usuario del usuario a eliminar.
     * @param requesterUsername El nombre de usuario del solicitante de la
     *                          eliminación.
     */
    @Transactional
    public void deleteUserPermanently(String username, String requesterUsername) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con el username: " + username));

        if (username.equalsIgnoreCase(requesterUsername)) {
            throw new ServicesException("Acción denegada: no puedes eliminarte permanentemente a ti mismo.");
        }
        if (username.equalsIgnoreCase(protectedUsername)) {
            throw new ServicesException(
                    "Acción denegada: esta cuenta de administrador está protegida y no puede eliminarse.");
        }

        Long userId = user.getUser_id();

        try {
            // Documentos enviados o recibidos por el usuario
            documentMetadataRepository.deleteAllBySenderOrReceiver(userId);
            userSystemNotificationRepository.deleteAllByReceiverUserId(userId);

            // Si es PROFESSOR: desasignar (no borrar) sus cursos
            if (user.getRole() == Role.PROFESSOR) {
                List<Courses> assigned = getAssignedCoursesForProfessor(username);
                for (Courses course : assigned) {
                    course.setAssignedUser(null);
                    coursesRepository.save(course);
                }
            }

            // Si es STUDENT: anonimizar valoraciones (NO borrarlas) y borrar
            // matrículas propias
            if (user.getRole() == Role.STUDENT) {
                List<AcademicEvaluation> evaluations = academicEvaluationRepository.findByUserId(userId);
                for (AcademicEvaluation evaluation : evaluations) {
                    evaluation.setUser(null);
                    academicEvaluationRepository.save(evaluation);
                }

                List<Enrollment> enrollments = enrollmentRepository.findAllByUserIdWithCourses(userId);
                enrollmentRepository.deleteAll(enrollments); // cascada -> CourseGrade
            }

            // Perfil e intereses personales (clave primaria compartida, no cascadean
            // solos)
            userProfileRepository.findById(userId).ifPresent(userProfileRepository::delete);
            interestRepository.findById(userId).ifPresent(interestRepository::delete);

            // Finalmente, el propio usuario
            userRepository.delete(user);
            userRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new ServicesException(
                    "No se pudo eliminar permanentemente al usuario por dependencias activas en la base de datos.");
        }
    }

    /**
     * Recupera de forma transaccional los intereses de un usuario específico.
     *
     * @param username El nombre de usuario del usuario cuyos intereses se van a
     *                 recuperar.
     * @return Un objeto InterestDTO que contiene los intereses del usuario.
     *         Si el usuario no tiene intereses registrados, devuelve listas vacías.
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
     * Permite guardar o actualizar de forma transaccional los intereses de un
     * usuario específico, preservando la integridad de las referencias de Hibernate
     * y evitando la creación de nuevas listas.
     *
     * @param username El nombre de usuario del usuario cuyos intereses se van a
     *                 guardar o actualizar.
     * @param dto      El objeto InterestDTO que contiene los nuevos intereses del
     *                 usuario.
     */
    @Transactional
    public void saveUserInterests(String username, InterestDTO dto) {
        // Validar la existencia del usuario en el sistema con excepción semántica
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con el username: " + username));

        // Buscar si ya tiene un registro de intereses previo. Si no existe, creamos
        // uno nuevo con ID síncrono.
        Interest interest = interestRepository.findById(user.getUser_id())
                .orElseGet(() -> {
                    Interest newInterest = new Interest();
                    newInterest.setUser(user);
                    return interestRepository.save(newInterest);
                });

        // Mapear y actualizar el contenido de los listados preservando las
        // referencias de Hibernate [ADR-18]
        updateCollection(interest.getCategory(), dto.categories());
        updateCollection(interest.getCourse_type(), dto.levels());
        updateCollection(interest.getDuration(), dto.durations());
        updateCollection(interest.getLanguage(), dto.languages());
        updateCollection(interest.getSubtitle_languages(), dto.subtitles());

        // Persistir los cambios forzando el volcado directo a PostgreSQL y sus 5
        // tablas satélite
        interestRepository.saveAndFlush(interest);
    }

    /**
     * Permite actualizar de forma transaccional una colección de cadenas de texto
     * preservando la referencia de Hibernate y evitando la creación de nuevas
     * listas.
     *
     * @param current La colección actual gestionada por Hibernate.
     * @param next    La nueva colección de valores a actualizar.
     */
    private void updateCollection(List<String> current, List<String> next) {
        current.clear();
        if (next != null) {
            current.addAll(next);
        }
    }

    /**
     * Recupera de forma transaccional las asignaturas que coinciden con una palabra
     * clave de búsqueda, limitando el resultado a 12 elementos para la UI.
     * Si la palabra clave está vacía, devuelve los primeros 12 cursos del catálogo.
     *
     * @param keyword La palabra clave de búsqueda para filtrar los cursos.
     * @return Lista de cursos que coinciden con la palabra clave de búsqueda,
     *         limitada a 12 elementos.
     */
    @Transactional(readOnly = true)
    public List<Courses> searchCourses(String keyword) {
        Pageable pageSize = PageRequest.of(0, 12);
        if (keyword == null || keyword.trim().isEmpty()) {
            return coursesRepository.findAll(pageSize).getContent();
        }
        String cleanKeyword = keyword.trim();
        // Creamos los dos patrones de coincidencia de forma nativa en Java
        String formattedKeyword = "%" + cleanKeyword + "%"; // Para buscar en cualquier parte
        String startKeyword = cleanKeyword + "%"; // Para priorizar si empieza por la palabra
        return coursesRepository.searchCoursesPredictive(formattedKeyword, startKeyword, pageSize).getContent();
    }

    /**
     * Recupera de forma transaccional las asignaturas asignadas a un profesor
     * autenticado, considerando su identidad principal y posibles alias derivados
     * de su cuenta de usuario. La búsqueda es robusta y evita duplicidades.
     *
     * @param principalIdentity La identidad principal del profesor autenticado.
     * @return Lista de asignaturas asignadas al profesor autenticado.
     */
    @Transactional(readOnly = true)
    public List<Courses> getAssignedCoursesForProfessor(String principalIdentity) {
        Optional<Users> userByUsername = userRepository.findByUsername(principalIdentity);
        Optional<Users> userByEmail = userByUsername.isPresent()
                ? Optional.empty()
                : userRepository.findByEmailIgnoreCase(principalIdentity);

        Users user = userByUsername.orElseGet(() -> userByEmail.orElse(null));
        if (user == null || user.getUser_id() == null) {
            return List.of();
        }

        return coursesRepository.findAllByAssignedUser_UserIdOrderByTitleAsc(user.getUser_id());
    }

    /**
     * Permite matricular a un estudiante en un curso específico, asegurando que no
     * exista duplicidad y que tanto el usuario como el curso existan en la base de
     * datos. La operación es transaccional y garantiza la integridad de los datos.
     *
     * @param username El nombre de usuario del estudiante.
     * @param courseId El ID del curso.
     * @return La entidad Enrollment creada y persistida.
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

        if (!course.hasEvaluationResponsible()) {
            throw new ServicesException("El curso no tiene profesor ni modalidad de evaluación disponible.");
        }

        // 4. Instanciar y configurar el objeto de matrícula explícito
        Enrollment enrollment = new Enrollment();
        enrollment.setUser(user);
        enrollment.setCourse(course);

        // 5. Volcar de forma transaccional directa a PostgreSQL
        Enrollment savedEnrollment = enrollmentRepository.saveAndFlush(enrollment);
        adminCourseCatalogService.markCourseAsEverUsed(course.getCourse_id());
        return savedEnrollment;
    }

    /**
     * Marca la fecha de inicio de un curso para un estudiante específico,
     * asegurando
     * que solo pueda iniciar su propio curso y mitigando ataques de sondeo de IDs.
     *
     * @param enrollmentId          El ID de la matrícula.
     * @param authenticatedUsername El nombre de usuario autenticado del estudiante.
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
            if (professorCourseAlertService != null) {
                professorCourseAlertService.createInitialEnrollmentAlertIfApplicable(enrollment);
            }
        }
    }

    /**
     * Calcula el progreso actual de un estudiante en un curso específico basado en
     * la
     * fecha de inicio y la duración total del curso. Devuelve un porcentaje entre 0
     * y 100, acotado estrictamente. Si el curso no ha sido iniciado, devuelve 0.
     *
     * @param enrollment La matrícula del estudiante en el curso.
     * @return El progreso actual como un porcentaje entero entre 0 y 100.
     *         Devuelve 0 si el curso no ha sido iniciado o si la duración es
     *         inválida.
     *         Devuelve 100 si el tiempo transcurrido supera la duración total del
     *         curso.
     *         El cálculo es preciso y seguro, evitando errores de tipo y
     *         garantizando la consistencia.
     */
    public int calculateCurrentProgress(Enrollment enrollment) {
        if (enrollment == null || enrollment.getStarted_at() == null || enrollment.getCourse() == null
                || enrollment.getCourse().getDuration() == null)
            return 0;

        // Conservamos precisión de la duración para cursos cortos (ej. 1h, 1.5h).
        double totalHours = enrollment.getCourse().getDuration().doubleValue();
        if (totalHours <= 0)
            return 0;

        // Calculamos el progreso en base a minutos para evitar truncar a 0% durante la
        // primera hora.
        long minutesElapsed = java.time.Duration.between(
                enrollment.getStarted_at(),
                LocalDateTime.now(clock)).toMinutes();

        double totalMinutes = totalHours * 60.0;

        double progress = (minutesElapsed * 100.0) / totalMinutes;

        // Acotamiento inmutable estricto entre 0 y 100
        return (int) Math.max(0, Math.min(100, Math.floor(progress)));
    }

    /**
     * Permite inyectar un reloj personalizado para pruebas unitarias y control de
     * tiempo.
     * Esto facilita la simulación de escenarios temporales y garantiza la
     * consistencia de los cálculos de progreso.
     *
     * @param clock El reloj personalizado a inyectar.
     */
    public void setClock(Clock clock) {
        this.clock = clock;
    }

    /**
     * Recupera de forma transaccional las asignaturas activas de un estudiante y
     * calcula
     * su progreso dinámico en cada una de ellas. Evita consultas N+1 y fuerza la
     * inicialización de las notas para su posterior serialización.
     *
     * @param userId El ID del usuario (estudiante).
     * @return Lista de matrículas activas del estudiante con el progreso calculado.
     */
    @Transactional(readOnly = true)
    public List<Enrollment> getStudentActiveCoursesWithCalculatedProgress(Long userId) {
        // Recuperamos la lista directa desde la relación JOIN FETCH del repositorio
        List<Enrollment> enrollments = enrollmentRepository.findAllByUserIdWithCourses(userId);

        List<Long> enrollmentIds = enrollments.stream()
                .filter(Objects::nonNull)
                .map(e -> e.getEnrollmentid())
                .filter(id -> id != null && id > 0)
                .toList();

        Map<Long, List<CourseGrade>> gradesByEnrollmentId = new HashMap<>();
        if (!enrollmentIds.isEmpty()) {
            List<CourseGrade> persistedGrades = courseGradeRepository
                    .findAllByEnrollmentIdsOrderByGradeIdAsc(enrollmentIds);

            for (CourseGrade grade : persistedGrades) {
                if (grade == null || grade.getEnrollment() == null || grade.getEnrollment().getEnrollmentid() == null) {
                    continue;
                }

                Long enrollmentId = grade.getEnrollment().getEnrollmentid();
                gradesByEnrollmentId.computeIfAbsent(enrollmentId, key -> new ArrayList<>()).add(grade);
            }
        }

        // Recorremos cada matrícula para inyectar proactivamente el progreso
        // dinámico transcurrido e hidratar las notas correspondientes
        for (Enrollment enrollment : enrollments) {
            int currentProgress = calculateCurrentProgress(enrollment);
            enrollment.setProgress_percentage(currentProgress);

            List<CourseGrade> enrollmentGrades = gradesByEnrollmentId.getOrDefault(
                    enrollment.getEnrollmentid(),
                    new ArrayList<>());
            enrollment.setGrades(enrollmentGrades);
        }

        // Devolvemos la lista perfectamente calculada y sincronizada
        return enrollments;
    }

    /**
     * Recupera de forma transaccional las estadísticas analíticas de un curso
     * específico.
     *
     * @param courseId El ID del curso.
     * @return Objeto CourseStatsDTO con las estadísticas analíticas del curso.
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
     * Recupera de forma transaccional las notificaciones activas de un usuario
     * específico.
     *
     * @param username El nombre de usuario del receptor de las notificaciones.
     * @return Lista de notificaciones activas del usuario.
     */
    @Transactional(readOnly = true)
    public List<com.cursosonline.backend.dto.NotificationDTO> getUserNotifications(String username) {
        List<com.cursosonline.backend.dto.NotificationDTO> alerts = new ArrayList<>();
        Users user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return alerts;
        }

        // Documentos/trabajos/exámenes recibidos y NO leídos — aplica a los 3 roles
        List<com.cursosonline.backend.entities.DocumentMetadata> unreadDocs = documentMetadataRepository
                .findUnreadReceivedDocumentsByUsername(username);
        if (unreadDocs != null && !unreadDocs.isEmpty()) {
            com.cursosonline.backend.entities.DocumentMetadata firstUnread = unreadDocs.get(0);
            alerts.add(new com.cursosonline.backend.dto.NotificationDTO(
                    "DOCUMENT_INBOX",
                    "Bandeja de Entrada",
                    buildDocumentInboxMessage(user, unreadDocs),
                    buildDocumentInboxRedirect(user, firstUnread)));
        }

        List<com.cursosonline.backend.entities.UserSystemNotification> unreadSystemNotifications = userSystemNotificationRepository
                .findUnreadByUsername(username);
        if (unreadSystemNotifications != null) {
            for (com.cursosonline.backend.entities.UserSystemNotification notification : unreadSystemNotifications) {
                alerts.add(new com.cursosonline.backend.dto.NotificationDTO(
                        notification.getNotificationId(),
                        notification.getType(),
                        notification.getTitle(),
                        notification.getMessage(),
                        notification.getRedirectUrl()));
            }
        }

        if (user.getRole() == Role.PROFESSOR && professorCourseAlertService != null) {
            Optional<ProfessorBellAlertSummaryDTO> bellSummary = professorCourseAlertService
                    .getOldestBellAlertSummary(username);
            bellSummary.ifPresent(summary -> alerts.add(0, new com.cursosonline.backend.dto.NotificationDTO(
                    summary.alertId(),
                    "PROFESSOR_TASK_ALERT",
                    summary.title(),
                    summary.message(),
                    "/professor")));
        }

        if (hasProgressAlertColumns()) {
            appendProgressNotificationsSafely(user, username, alerts);
        } else {
            LOGGER.warn(
                    "Se omiten alertas de progreso para usuario {} porque faltan columnas progress_alert_* en enrollment.",
                    username);
        }
        // ADMIN: no entra en los bloques 2 ni 3, solo puede recibir el bloque 1.

        return alerts;
    }

    private String buildDocumentInboxMessage(Users receiver,
            List<com.cursosonline.backend.entities.DocumentMetadata> unreadDocuments) {
        long examCount = unreadDocuments.stream()
                .filter(document -> isExamTrayDocument(receiver, document))
                .count();
        long documentOrWorkCount = unreadDocuments.size() - examCount;

        List<String> trayMessages = new ArrayList<>();
        if (receiver != null && receiver.getRole() == Role.ADMIN) {
            return buildTrayMessage("Recepción de Documentos", unreadDocuments, receiver, false,
                    unreadDocuments.size());
        }
        if (examCount > 0) {
            trayMessages.add(buildTrayMessage("Bandeja de recepción de exámenes",
                    unreadDocuments, receiver, true, examCount));
        }
        if (documentOrWorkCount > 0) {
            trayMessages.add(buildTrayMessage("Bandeja de recepción de documentos y trabajos",
                    unreadDocuments, receiver, false, documentOrWorkCount));
        }

        return "Tienes avisos pendientes. " + String.join(". ", trayMessages) + ".";
    }

    private String buildTrayMessage(String trayName,
            List<com.cursosonline.backend.entities.DocumentMetadata> documents,
            Users receiver,
            boolean examTray,
            long count) {
        List<String> senders = documents.stream()
                .filter(document -> isExamTrayDocument(receiver, document) == examTray)
                .map(document -> document.getSender() != null && document.getSender().getUsername() != null
                        ? document.getSender().getUsername()
                        : "remitente no disponible")
                .distinct()
                .toList();
        String senderLabel = senders.size() == 1 ? "Remitente: " : "Remitentes: ";
        return trayName + ": " + count + " documento(s). " + senderLabel + String.join(", ", senders);
    }

    private boolean isExamTrayDocument(Users receiver,
            com.cursosonline.backend.entities.DocumentMetadata document) {
        if (receiver != null && receiver.getRole() == Role.ADMIN) {
            return false;
        }
        if ("EXAMEN".equalsIgnoreCase(document.getEvaluation_type())) {
            return true;
        }
        return receiver != null
                && receiver.getRole() == Role.PROFESSOR
                && document.getCourse() != null;
    }

    private String buildDocumentInboxRedirect(Users user, DocumentMetadata document) {
        String basePath = "/" + user.getRole().name().toLowerCase();
        StringBuilder redirect = new StringBuilder(basePath).append("?focus=documents");

        if (document != null && document.getDocumentid() != null && document.getDocumentid() > 0) {
            redirect.append("&documentId=").append(document.getDocumentid());
        }

        if (user.getRole() == Role.STUDENT && document != null && document.getCourse() != null
                && document.getCourse().getCourse_id() != null) {
            redirect.append("&courseId=").append(document.getCourse().getCourse_id());
        }

        if (user.getRole() == Role.PROFESSOR && document != null && document.getSender() != null
                && document.getSender().getUser_id() != null) {
            redirect.append("&senderId=").append(document.getSender().getUser_id());
        }

        if (user.getRole() == Role.ADMIN && document != null && document.getReceiver() != null
                && document.getReceiver().getUser_id() != null) {
            redirect.append("&receiverId=").append(document.getReceiver().getUser_id());
        }

        // Encapsulamos un nombre amigable para trazabilidad opcional futura de UI.
        if (document != null && document.getOriginalname() != null && !document.getOriginalname().isBlank()) {
            String encodedName = URLEncoder.encode(document.getOriginalname(), StandardCharsets.UTF_8);
            redirect.append("&doc=").append(encodedName);
        }

        return redirect.toString();
    }

    /**
     * Marca todas las notificaciones de documentos recibidos como leídas y
     * actualiza
     * los estados de progreso de cursos para estudiantes y profesores según
     * corresponda.
     *
     * @param username El nombre de usuario del receptor de las notificaciones.
     */
    @Transactional
    public void dismissUserNotifications(String username) {
        markAllReceivedAsReadSafely(username);
        userSystemNotificationRepository.markAllAsReadByUsername(username);

        Users user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return;
        }

        if (user.getRole() == Role.PROFESSOR && professorCourseAlertService != null) {
            professorCourseAlertService.dismissAllBellAlerts(username);
        }

        if (hasProgressAlertColumns()) {
            acknowledgeProgressNotificationsSafely(user, username);
        } else {
            LOGGER.warn(
                    "Se omite ACK de alertas de progreso para usuario {} porque faltan columnas progress_alert_* en enrollment.",
                    username);
        }
    }

    @Transactional
    public void dismissSingleNotification(String username, Long notificationId, String type) {
        if (type != null && "DOCUMENT_INBOX".equalsIgnoreCase(type)) {
            markAllReceivedAsReadSafely(username);
            return;
        }

        if (type != null && "PROFESSOR_TASK_ALERT".equalsIgnoreCase(type)) {
            if (notificationId != null && notificationId > 0) {
                if (professorCourseAlertService != null) {
                    professorCourseAlertService.dismissBellAlert(username, notificationId);
                }
            }
            return;
        }

        if (notificationId != null && notificationId > 0) {
            userSystemNotificationRepository.markAsReadByIdAndUsername(notificationId, username);
            return;
        }

        if (type != null) {
            try {
                ProfessorAlertType parsedType = ProfessorAlertType.valueOf(type.trim().toUpperCase(Locale.ROOT));
                if (professorCourseAlertService != null) {
                    professorCourseAlertService.dismissBellAlertByTypeFallback(username, parsedType);
                }
            } catch (IllegalArgumentException ignored) {
                // Fallback de compatibilidad: si no se reconoce el tipo no forzamos error.
            }
        }
    }

    /**
     * Marca como leídas únicamente las alertas de nueva calificación para el
     * usuario indicado.
     *
     * @param username El nombre de usuario del receptor.
     */
    @Transactional
    public void dismissGradeNotifications(String username) {
        userSystemNotificationRepository.markAllAsReadByUsernameAndType(username, GRADE_PUBLISHED_NOTIFICATION_TYPE);
    }

    /**
     * Verifica de forma segura si la tabla de matrícula (enrollment) contiene las
     * columnas necesarias para las alertas de progreso de estudiantes y profesores.
     *
     * @return true si las columnas necesarias existen, false en caso contrario.
     */
    private boolean hasProgressAlertColumns() {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.columns " +
                            "WHERE table_schema = current_schema() " +
                            "AND table_name = 'enrollment' " +
                            "AND column_name IN ('progress_alert_student_ack','progress_alert_professor_ack')",
                    Integer.class);
            return count != null && count == 2;
        } catch (RuntimeException ex) {
            LOGGER.warn("No se pudo verificar el esquema de enrollment para alertas de progreso.", ex);
            return false;
        }
    }

    /**
     * Agrega de forma segura las notificaciones de progreso para estudiantes y
     * profesores, evitando errores de esquema si faltan columnas en la tabla de
     * matrícula (enrollment).
     *
     * @param user     El usuario autenticado.
     * @param username El nombre de usuario del usuario autenticado.
     * @param alerts   La lista de notificaciones a la que se agregarán las alertas
     *                 de progreso.
     */
    private void appendProgressNotificationsSafely(Users user, String username,
            List<com.cursosonline.backend.dto.NotificationDTO> alerts) {
        try {
            // Estudiante: su propia asignatura al 95% de tiempo consumido
            if (user.getRole() == Role.STUDENT) {
                List<Enrollment> enrollments = enrollmentRepository.findAllByUserIdWithCourses(user.getUser_id());
                if (enrollments != null) {
                    for (Enrollment enrollment : enrollments) {
                        int progress = calculateCurrentProgress(enrollment);
                        if (progress >= 95 && progress < 100 && !enrollment.isProgressAlertStudentAck()) {
                            alerts.add(new com.cursosonline.backend.dto.NotificationDTO(
                                    "COURSE_PROGRESS",
                                    "Asignatura por finalizar",
                                    "El curso '" + enrollment.getCourse().getTitle() + "' está al " + progress
                                            + "%. ¡Ya casi lo tienes!",
                                    "/student"));
                        }
                    }
                }
            }

            // Profesor: los avisos operativos de progreso (material y examen) se
            // gestionan ahora mediante ProfessorCourseAlertService + panel dedicado.
        } catch (RuntimeException ex) {
            LOGGER.warn(
                    "No se pudieron calcular alertas de progreso para usuario {}. Se devuelven solo alertas de documentos.",
                    username, ex);
        }
    }

    /**
     * Marca de forma segura las notificaciones de progreso como reconocidas (ACK)
     * para estudiantes y profesores, evitando errores de esquema si faltan columnas
     * en la tabla de matrícula (enrollment).
     *
     * @param user     El usuario autenticado.
     * @param username El nombre de usuario del usuario autenticado.
     */
    private void acknowledgeProgressNotificationsSafely(Users user, String username) {
        try {
            if (user.getRole() == Role.STUDENT) {
                List<Enrollment> enrollments = enrollmentRepository.findAllByUserIdWithCourses(user.getUser_id());
                for (Enrollment enrollment : enrollments) {
                    int progress = calculateCurrentProgress(enrollment);
                    if (progress >= 95 && progress < 100 && !enrollment.isProgressAlertStudentAck()) {
                        enrollment.setProgressAlertStudentAck(true);
                        enrollmentRepository.save(enrollment);
                    }
                }
            } else if (user.getRole() == Role.PROFESSOR) {
                List<Long> courseIds = getAssignedCoursesForProfessor(username).stream()
                        .map(course -> course != null ? course.getCourse_id() : null)
                        .filter(java.util.Objects::nonNull)
                        .toList();
                if (!courseIds.isEmpty()) {
                    List<Enrollment> studentEnrollments = enrollmentRepository
                            .findActiveStudentEnrollmentsByCourseIds(courseIds);
                    for (Enrollment enrollment : studentEnrollments) {
                        int progress = calculateCurrentProgress(enrollment);
                        if (progress >= 90 && progress < 100 && !enrollment.isProgressAlertProfessorAck()) {
                            enrollment.setProgressAlertProfessorAck(true);
                            enrollmentRepository.save(enrollment);
                        }
                    }
                }
            }
        } catch (RuntimeException ex) {
            LOGGER.warn("No se pudieron actualizar ACK de alertas de progreso para usuario {}.", username, ex);
        }
    }

    /**
     * Marca de forma segura todos los documentos recibidos como leídos para un
     * usuario específico. Si la operación de actualización masiva falla, se aplica
     * un
     * fallback por entidad.
     *
     * @param username El nombre de usuario del receptor de los documentos.
     */
    private void markAllReceivedAsReadSafely(String username) {
        try {
            documentMetadataRepository.markAllReceivedAsRead(username);
        } catch (RuntimeException ex) {
            LOGGER.warn("Bulk update de notificaciones falló para usuario {}. Se aplica fallback por entidad.",
                    username, ex);
            List<DocumentMetadata> unreadDocs = documentMetadataRepository
                    .findUnreadReceivedDocumentsByUsername(username);
            if (unreadDocs.isEmpty()) {
                return;
            }
            for (DocumentMetadata document : unreadDocs) {
                document.setRead(true);
            }
            documentMetadataRepository.saveAll(unreadDocs);
        }
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
        // Validar la existencia del usuario en el sistema
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con el username: " + username));

        if (user.getRole() != Role.PROFESSOR) {
            throw new ServicesException(
                    "Acción inválida: solo las cuentas PROFESSOR pueden autoasignarse asignaturas.");
        }

        // Validar la existencia del curso en el catálogo de PostgreSQL
        Courses course = coursesRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Curso no encontrado en el catálogo con el ID: " + courseId));

        // Control de Ocupación Preventivo: Validar si el curso ya está asignado a
        // otro usuario
        if (course.getAssignedUser() != null) {
            throw new ServicesException(
                    "Este curso está gestionado por Administración. La asignación solo puede modificarse por un administrador.");
        }

        if (isLegacyInstructorLockedForSelfAssignment(course)) {
            throw new ServicesException(
                    "Este curso conserva un instructor heredado. Solo Administración puede regularizar su titularidad docente.");
        }

        // Establecer la vinculación relacional fuerte (JPA mapeará la clave
        // assigned_user_id)
        course.setAssignedUser(user);

        // Mantener sincronía de texto con las búsquedas predictivas existentes si es
        // un profesor
        if (user.getRole() == Role.PROFESSOR || user.getRole() == Role.PROFESSOR) {
            course.setInstructors(user.getUsername());
        }

        // Volcar los cambios de forma transaccional directa a PostgreSQL
        Courses savedCourse = coursesRepository.saveAndFlush(course);
        adminCourseCatalogService.markCourseAsEverUsed(savedCourse.getCourse_id());
        if (recommendationService != null) {
            recommendationService.notifyStudentsAboutNewCourse(savedCourse);
        }
        return savedCourse;
    }

    @Transactional
    public Courses assignUserToCourseWithDispatchConfig(String username, Long courseId, Integer dispatchParts) {
        if (dispatchParts == null) {
            throw new ServicesException("Debes seleccionar el número de partes antes de guardar.");
        }

        Courses savedCourse = assignUserToCourse(username, courseId);
        Users professor = savedCourse.getAssignedUser();
        if (professorCourseAlertService == null) {
            throw new ServicesException("No se pudo preparar la configuración de avisos para el curso.");
        }
        professorCourseAlertService.createConfigForCourse(savedCourse, professor, dispatchParts);
        return savedCourse;
    }

    private boolean isLegacyInstructorLockedForSelfAssignment(Courses course) {
        if (course == null || course.getInstructors() == null) {
            return false;
        }

        String normalizedInstructor = course.getInstructors().trim().toLowerCase(Locale.ROOT);
        return !normalizedInstructor.isEmpty() && !normalizedInstructor.equals("por asignar");
    }

}
