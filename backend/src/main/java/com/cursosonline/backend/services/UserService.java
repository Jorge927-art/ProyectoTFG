package com.cursosonline.backend.services;

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
     * Aquí se podría incluir lógica de cifrado de contraseñas.
     */
    @Transactional
    public Users registerUser(Users user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new UserAlreadyExistsException(user.getUsername());
        }

        // 2. Cifrar la contraseña
        // Obtenemos la clave en texto plano, la ciframos y la seteamos de nuevo
        String encodedPassword = passwordEncoder.encode(user.getPassword());
        user.setPassword(encodedPassword);

        // 3. Guardar el usuario con la contraseña ya protegida
        // Lógica adicional: verificar si el email ya existe, etc.
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public Users login(String username, String rawPassword) {
        // 1. Buscar al usuario por nombre de usuario
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ServicesException("Usuario no encontrado"));

        // 2. Verificar si la contraseña ingresada coincide con la cifrada en BD
        // El método matches recibe: (contraseñaPlana, contraseñaCifrada)
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new ServicesException("Contraseña incorrecta");
        }

        // 3. Si coincide, retornar el usuario (o generar un token JWT/Sesión)
        return user;
    }

    /**
     * Obtiene todos los usuarios, útil para el dashboard del Administrador.
     */
    @Transactional(readOnly = true)
    public List<Users> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Lógica preliminar para el sistema de recomendación.
     * Obtiene el perfil y los intereses del estudiante para ser procesados.
     */
    @Transactional(readOnly = true)
    public String getUserInterests(Long userId) {
        return userRepository.findById(userId)
                .map(Users::getInterests)
                .orElse("");
    }

}
