package com.cursosonline.backend.services;

import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.entities.Interest;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.dto.InterestDTO;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.repository.CoursesRepository;
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
     * Auditoría NotebookLM: Lanzamiento de ResourceNotFoundException (HTTP 404) en
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
     * Recupera de forma transaccional las preferencias de un estudiante desde
     * PostgreSQL.
     * Auditoría NotebookLM: Lanzamiento de ResourceNotFoundException (HTTP 404) en
     * lugar de RuntimeException. Refactorizado con método privado para cumplir DRY.
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

        // CORRECCIÓN SEGURO: Eliminamos initializeUserInterests(interest) para liberar
        // la sesión de Hibernate y permitir que el método POST/PUT posterior escriba en
        // PostgreSQL.

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

        // Enviamos los parámetros limpios al repositorio
        return coursesRepository.searchCoursesPredictive(formattedKeyword, startKeyword, pageSize);
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
        // dinámico transcurrido
        for (Enrollment enrollment : enrollments) {
            int currentProgress = calculateCurrentProgress(enrollment);
            enrollment.setProgress_percentage(currentProgress);
        }

        // 3. Devolvemos la lista perfectamente calculada y sincronizada
        return enrollments;
    }

}
