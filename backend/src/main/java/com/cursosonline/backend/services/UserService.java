package com.cursosonline.backend.services;

import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.exception.UserAlreadyExistsException;
import com.cursosonline.backend.repository.UserRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio que maneja la lógica de negocio relacionada con los usuarios de la
 * plataforma. Incluye métodos para registrar nuevos usuarios, realizar login y
 * obtener la lista de usuarios registrados. Utiliza UserRepository para
 * interactuar con la base de datos y PasswordEncoder para cifrar las
 * contraseñas.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.cursosonline.backend.repository.InterestRepository interestRepository;

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

        // Conmutador inteligente: si está activo pasa a false, si está inactivo pasa a
        // true
        if (user.isEnabled()) {
            user.setEnabled(false);
        } else {
            user.setEnabled(true);
        }

        // Guardamos y forzamos el volcado inmediato a PostgreSQL
        return userRepository.saveAndFlush(user);
    }

    /**
     * Recupera de forma transaccional las preferencias de un estudiante desde
     * PostgreSQL.
     * Mapea las colecciones persistidas en las tablas satélite directamente hacia
     * el
     * InterestDTO para que el frontend de React las preseleccione al abrir el
     * modal.
     * 
     * @param username El nombre de usuario extraído del Token JWT
     * @return El objeto de transferencia de datos con las preferencias del alumno
     */
    @Transactional(readOnly = true)
    public com.cursosonline.backend.dto.InterestDTO getUserInterests(String username) {
        // 1. Validar la existencia del usuario en el sistema
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con el username: " + username));

        // 2. Buscar el registro de intereses usando su ID asignado por @MapsId
        com.cursosonline.backend.entities.Interest interest = interestRepository.findById(user.getUser_id())
                .orElse(null);

        // 3. Si no existe configuración previa, devolvemos listas vacías seguras
        if (interest == null) {
            return new com.cursosonline.backend.dto.InterestDTO(
                    java.util.Collections.emptyList(),
                    java.util.Collections.emptyList(),
                    java.util.Collections.emptyList(),
                    java.util.Collections.emptyList(),
                    java.util.Collections.emptyList());
        }

        // 🚨 CRÍTICO: Forzar la inicialización de los proxies de Hibernate para las 5
        // tablas satélite.
        // Esto previene que los campos @ElementCollection se envíen vacíos debido al
        // Lazy Loading transaccional.
        org.hibernate.Hibernate.initialize(interest.getCategory());
        org.hibernate.Hibernate.initialize(interest.getCourse_type());
        org.hibernate.Hibernate.initialize(interest.getDuration());
        org.hibernate.Hibernate.initialize(interest.getLanguage());
        org.hibernate.Hibernate.initialize(interest.getSubtitle_languages());

        // 4. Mapear la entidad con las colecciones ya cargadas al Record InterestDTO
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
}
