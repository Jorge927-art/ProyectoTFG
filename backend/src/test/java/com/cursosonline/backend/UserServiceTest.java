package com.cursosonline.backend;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.services.UserService;

/**
 * Clase de pruebas unitarias para UserService. Utiliza Mockito para simular el
 * comportamiento de UserRepository y PasswordEncoder, permitiendo probar la
 * lógica de negocio de UserService de forma aislada.
 */
@ExtendWith(MockitoExtension.class)
public class UserServiceTest {
    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    /**
     * Prueba para el método findByUsername, verificando que retorne un usuario
     * cuando existe en el repositorio.
     */
    @Test
    void findByUsername_DebeRetornarUsuario_CuandoExiste() {
        String username = "Luis";
        // Integrado: Se añade el valor 'true' al final para el campo 'enabled'
        Users expectedUser = new Users(1L, "Luis", "jki", Role.STUDENT, "jose.gmail.com", true,
                new java.util.ArrayList<>());
        when(userRepository.findByUsername("Luis")).thenReturn(Optional.of(expectedUser));
        Optional<Users> result = userService.findByUsername(username);
        assertTrue(result.isPresent());
        assertEquals(username, result.get().getUsername());
    }

    /**
     * Prueba para el método registerUser, verificando que se registre un nuevo
     * usuario correctamente.
     */
    @Test
    void assignUser() {
        // Integrado: Se añade 'true' al final para corregir el constructor de Lombok
        Users newUser = new Users(null, "Luis", "jki", Role.STUDENT, "jose.gmail.com", true,
                new java.util.ArrayList<>());
        Users savedUser = new Users(1L, "Luis", "jki", Role.STUDENT, "jose.gmail.com", true,
                new java.util.ArrayList<>());
        when(userRepository.findByUsername("Luis")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("jki")).thenReturn("encoded_jki");
        when(userRepository.save(any())).thenReturn(savedUser);
        Users result = userService.registerUser(newUser);
        assertNotNull(newUser);
        assertEquals(1L, result.getUser_id());
        verify(userRepository).save(any());
        verify(passwordEncoder).encode("jki");
    }

    /**
     * Prueba para el método findByUsername, verificando que retorne un Optional
     * vacío cuando el usuario no existe.
     */
    @Test
    void findByUsername_ReturnEmpty() {
        String username_does_not_exist = "usuario_no_existe";
        when(userRepository.findByUsername(username_does_not_exist)).thenReturn(Optional.empty());
        Optional<Users> resultado = userService.findByUsername(username_does_not_exist);
        assertFalse(resultado.isPresent(), "El resultado debería ser un Optional vacío");
        assertTrue(resultado.isEmpty());
        verify(userRepository, times(1)).findByUsername(username_does_not_exist);
    }

    /**
     * Prueba para el método registerUser, verificando que se lance una excepción al
     * intentar registrar un usuario con un nombre de usuario que ya existe.
     */
    @Test
    void registerUser_DebeLanzarExcepcion_CuandoElNombreDeUsuarioYaExiste() {
        String username = "Luis";
        // Integrado: Se añade 'true' al final para cumplir con el contrato de la
        // entidad
        Users new_user = new Users(null, username, "frgt", Role.STUDENT, "jose.gmail.com", true,
                new java.util.ArrayList<>());
        Users existing_user = new Users(1L, username, "frgt", Role.STUDENT, "jose.gmail.com", true,
                new java.util.ArrayList<>());
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(existing_user));
        RuntimeException excepcion = assertThrows(RuntimeException.class, () -> {
            userService.registerUser(new_user);
        });
        assertTrue(excepcion.getMessage().contains(username));
        verify(userRepository, never()).save(any(Users.class));
    }
}
