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

@Service
@RequiredArgsConstructor // Genera el constructor para la inyección de dependencias (Lombok)
public class UserService {

    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;

    /**
     * Busca un usuario por su nombre de usuario.
     * Útil para el proceso de autenticación en el frontend.
     */
    @Transactional(readOnly = true) // optimización para lecturas
    public Optional<Users> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    /**
     * Registra un nuevo usuario en la plataforma.
     * Incluir lógica de cifrado de contraseñas.
     */
    @Transactional
    public Users registerUser(Users user) {
        System.out.println("DEBUG - Usuario recibido: " + user.getUsername());
        System.out.println("DEBUG - Password recibido: " + user.getPassword());
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new UserAlreadyExistsException(user.getUsername());
        }

        // Cifrar la contraseña
        // Obtenemos la clave en texto plano, la ciframos y la seteamos de nuevo
        String encodedPassword = passwordEncoder.encode(user.getPassword());
        user.setPassword(encodedPassword);

        // Rol de student por defecto
        user.setRole(Role.STUDENT);

        // Guardar el usuario con la contraseña ya protegida
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public Users login(String username, String rawPassword) {
        // Buscar al usuario por nombre de usuario
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ServicesException("Usuario no encontrado"));

        // Verificar si la contraseña ingresada coincide con la cifrada en BD
        // El método matches recibe: (contraseñaPlana, contraseñaCifrada)
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new ServicesException("Contraseña incorrecta");
        }

        // Si coincide, retornar el usuario (o generar un token JWT/Sesión)
        return user;
    }

    /**
     * Obtiene todos los usuarios, útil para el dashboard del Administrador.
     */
    @Transactional(readOnly = true)
    public List<Users> getAllUsers() {
        return userRepository.findAll();
    }

}
