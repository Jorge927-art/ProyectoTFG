package com.cursosonline.backend.services;

import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.UserRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
//import java.util.Optional;

@Service
@RequiredArgsConstructor // Genera el constructor para la inyección de dependencias (Lombok)
public class UserService {
    private final UserRepository userRepository;

    /**
     * Busca un usuario por su nombre de usuario.
     * Útil para el proceso de autenticación en el frontend.
     */
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
            throw new RuntimeException("El usuario " + user.getUsername() + " ya existe");
        }
        // Lógica adicional: verificar si el email ya existe, etc.
        return userRepository.save(user);
    }

    /**
     * Obtiene todos los usuarios, útil para el dashboard del Administrador.
     */
    public List<Users> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Lógica preliminar para el sistema de recomendación.
     * Obtiene el perfil y los intereses del estudiante para ser procesados.
     */
    public String getUserInterests(Long userId) {
        return userRepository.findById(userId)
                .map(Users::getInterests)
                .orElse("");
    }

}
