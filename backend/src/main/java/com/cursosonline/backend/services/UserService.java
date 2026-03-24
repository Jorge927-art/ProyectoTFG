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
        System.out.println("DEBUG - Usuario recibido: " + user.getUsername());
        System.out.println("DEBUG - Password recibido: " + user.getPassword());
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
     * 
     * @param username
     * @param rawPassword
     * @return
     */
    @Transactional(readOnly = true)
    public Users login(String username, String rawPassword) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ServicesException("Usuario no encontrado"));
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

}
