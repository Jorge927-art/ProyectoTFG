package com.cursosonline.backend.services;

import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.exception.UserAlreadyExistsException;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio que maneja la lógica de negocio relacionada con los usuarios de la
 * plataforma.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.cursosonline.backend.repository.InterestRepository interestRepository;
    private final CoursesRepository coursesRepository;
    private final EnrollmentRepository enrollmentRepository;

    /**
     * Busca un usuario por su nombre de usuario.
     * 
     * @param username
     * @return
     */
    @Transactional(readOnly = true) // optimización para lecturas
    public Optional<Users> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    /**
     * Registra un nuevo usuario en la plataforma.
     * Verifica que el nombre de usuario no exista previamente, cifra la contraseña
     * y asigna el rol de student por defecto.
     * 
     * @param user
     * @return
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
     * 
     * @param username
     * @param rawPassword
     * @return
     */
    @Transactional(readOnly = true)
    public Users login(String username, String rawPassword) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ServicesException("Usuario no encontrado"));

        // Validación obligatoria TFG: Denegar el login a usuarios dados de baja
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
     * 
     * @return
     */
    @Transactional(readOnly = true)
    public List<Users> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Actualiza el rol de un usuario específico en la plataforma.
     * 
     * @param username
     * @param newRole
     * @return
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
     * Preserva la integridad referencial en PostgreSQL evitando violaciones de FK.
     * 
     * @return El usuario con el estado de activación actualizado.
     * @param username Nombre del usuario a dar de baja.
     */
    @Transactional
    public Users deleteByUsername(String username) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con el username: " + username));

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
     */
    @Transactional(readOnly = true)
    public com.cursosonline.backend.dto.InterestDTO getUserInterests(String username) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con el username: " + username));

        com.cursosonline.backend.entities.Interest interest = interestRepository.findById(user.getUser_id())
                .orElse(null);

        if (interest == null) {
            return new com.cursosonline.backend.dto.InterestDTO(
                    java.util.Collections.emptyList(),
                    java.util.Collections.emptyList(),
                    java.util.Collections.emptyList(),
                    java.util.Collections.emptyList(),
                    java.util.Collections.emptyList());
        }

        org.hibernate.Hibernate.initialize(interest.getCategory());
        org.hibernate.Hibernate.initialize(interest.getCourse_type());
        org.hibernate.Hibernate.initialize(interest.getDuration());
        org.hibernate.Hibernate.initialize(interest.getLanguage());
        org.hibernate.Hibernate.initialize(interest.getSubtitle_languages());

        return new com.cursosonline.backend.dto.InterestDTO(
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
     * 
     * @param username El nombre de usuario extraído del Token JWT
     * @param dto      El objeto de transferencia de datos con los listados de
     *                 preferencias
     */
    @Transactional
    public void saveUserInterests(String username, com.cursosonline.backend.dto.InterestDTO dto) {
        // 1. Validar la existencia del usuario en el sistema
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con el username: " + username));

        // 2. Buscar si ya tiene un registro de intereses previo. Si no existe, creamos
        // uno nuevo.
        com.cursosonline.backend.entities.Interest interest = interestRepository.findById(user.getUser_id())
                .orElseGet(() -> {
                    com.cursosonline.backend.entities.Interest newInterest = new com.cursosonline.backend.entities.Interest();
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
     * Consulta predictiva y paginada en el catálogo de cursos.
     * Si la palabra clave está vacía, devuelve de forma segura solo los primeros 10
     * cursos.
     * Limita los resultados concurrentes para optimizar la red y la memoria del
     * servidor.
     * 
     * @param keyword Término de búsqueda introducido por el estudiante.
     * @return Lista optimizada con un máximo de 10 cursos ordenados por relevancia.
     */
    @Transactional(readOnly = true)
    public List<com.cursosonline.backend.entities.Courses> searchCourses(String keyword) {
        // Configuramos un límite estricto de 10 resultados para el TFG (Página 0,
        // Tamaño 10)
        org.springframework.data.domain.Pageable topTen = org.springframework.data.domain.PageRequest.of(0, 12);

        // Si el buscador está vacío, evitamos volcar toda la tabla y devolvemos los 10
        // primeros
        if (keyword == null || keyword.trim().isEmpty()) {
            return coursesRepository.findAll(topTen).getContent();
        }

        // Ejecutamos la consulta predictiva pasando el término limpio y el paginador
        return coursesRepository.searchCoursesPredictive(keyword.trim(), topTen);
    }

    /**
     * Matricula de forma segura a un estudiante en un curso utilizando la entidad
     * intermedia Enrollment.
     * Valida preventivamente en PostgreSQL para evitar registros duplicados.
     */
    @Transactional
    public void enrollStudentInCourse(String username, Long courseId) {
        // 1. Validar precondición de existencia de usuario
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new com.cursosonline.backend.exception.ServicesException("Usuario no encontrado"));

        // 2. Validar precondición de existencia de curso
        com.cursosonline.backend.entities.Courses course = coursesRepository.findById(courseId)
                .orElseThrow(() -> new com.cursosonline.backend.exception.ServicesException(
                        "Curso no encontrado en el catálogo"));

        // 3. Control estricto de duplicidad antes de efectuar la persistencia
        java.util.Optional<com.cursosonline.backend.entities.Enrollment> existingEnrollment = enrollmentRepository
                .findByUserIdAndCourseId(user.getUser_id(), course.getCourse_id());

        if (existingEnrollment.isPresent()) {
            throw new com.cursosonline.backend.exception.ServicesException(
                    "Acción inválida: Ya te encuentras matriculado en este curso.");
        }

        // 4. Instanciar y configurar el objeto de matrícula explícito
        com.cursosonline.backend.entities.Enrollment enrollment = new com.cursosonline.backend.entities.Enrollment();
        enrollment.setUser(user);
        enrollment.setCourse(course);

        // 5. Volcar de forma transaccional directa a PostgreSQL
        enrollmentRepository.saveAndFlush(enrollment);
    }
}
