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
     * @param username El nombre de usuario al que se le cambiará el rol.
     * @param newRole  El nuevo rol a asignar (ADMIN, PROFESSOR, STUDENT).
     * @return El usuario con el rol actualizado.
     */

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

}
