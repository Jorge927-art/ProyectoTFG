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
import org.hibernate.Hibernate;

import java.util.Optional;
import java.util.List;
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
     * lugar de RuntimeException.
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

        Hibernate.initialize(interest.getCategory());
        Hibernate.initialize(interest.getCourse_type());
        Hibernate.initialize(interest.getDuration());
        Hibernate.initialize(interest.getLanguage());
        Hibernate.initialize(interest.getSubtitle_languages());

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
     * Auditoría NotebookLM: Lanzamiento de ResourceNotFoundException (HTTP 404) en
     * lugar de RuntimeException.
     */
    @Transactional
    public void saveUserInterests(String username, InterestDTO dto) {
        // 1. Validar la existencia del usuario en el sistema con excepción semántica
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con el username: " + username));

        // 2. Buscar si ya tiene un registro de intereses previo. Si no existe, creamos
        // uno nuevo.
        Interest interest = interestRepository.findById(user.getUser_id())
                .orElseGet(() -> {
                    Interest newInterest = new Interest();
                    newInterest.setUser(user); // Establecemos la relación OneToOne para @MapsId
                    return newInterest;
                });

        // 3. Mapear y actualizar los listados de preferencias dinámicas
        interest.setCategory(dto.categories());
        interest.setCourse_type(dto.levels()); // Mapeado semánticamente a la columna del catálogo de cursos
        interest.setDuration(dto.durations());
        interest.setLanguage(dto.languages());
        interest.setSubtitle_languages(dto.subtitles()); // Mapeado semánticamente a la columna de subtítulos

        // 4. Persistir los cambios forzando el volcado directo a PostgreSQL y sus 5
        // tablas satélite
        interestRepository.saveAndFlush(interest);
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
}
