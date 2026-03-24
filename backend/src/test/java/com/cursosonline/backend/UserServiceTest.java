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
 * lógica de negocio de UserService de forma aislada. Incluye pruebas para los
 * métodos findByUsername y registerUser, verificando tanto casos exitosos como
 * escenarios de error (como intentar registrar un usuario con un nombre de
 * usuario ya existente).
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
     * cuando existe en el repositorio. Se simula el comportamiento del repositorio
     * para devolver un usuario específico cuando se busca por su nombre de usuario.
     * Luego se verifica que el resultado sea correcto y que el nombre de usuario
     * coincida con el esperado.
     */
    @Test
    void findByUsername_DebeRetornarUsuario_CuandoExiste() {
        String username = "Luis";
        Users expectedUser = new Users(1L, "Luis", "jki", Role.STUDENT, "jose.gmail.com");
        when(userRepository.findByUsername("Luis")).thenReturn(Optional.of(expectedUser));
        Optional<Users> result = userService.findByUsername(username);
        assertTrue(result.isPresent());
        assertEquals(username, result.get().getUsername());
    }

    /**
     * Prueba para el método registerUser, verificando que se registre un nuevo
     * usuario correctamente. Se simula el comportamiento del repositorio para
     * indicar que no existe un usuario con el mismo nombre de usuario, y se simula
     * el cifrado de la contraseña. Luego se verifica que el usuario se registre
     * correctamente, que se le asigne un ID y que se haya intentado cifrar la
     * contraseña. Además, se confirma que el método save del repositorio haya sido
     * llamado para guardar el nuevo usuario.
     */
    @Test
    void assignUser() {
        Users newUser = new Users(null, "Luis", "jki", Role.STUDENT, "jose.gmail.com");
        Users savedUser = new Users(1L, "Luis", "jki", Role.STUDENT, "jose.gmail.com");
        when(userRepository.findByUsername("Luis")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("jki")).thenReturn("encoded_jki");
        when(userRepository.save(any(Users.class))).thenReturn(savedUser);
        Users result = userService.registerUser(newUser);
        assertNotNull(result.getUser_id());
        assertEquals(1L, result.getUser_id());
        verify(userRepository).save(any(Users.class));
        verify(passwordEncoder).encode("jki"); // Verifica que se intentó cifrar
    }

    /**
     * Prueba para el método findByUsername, verificando que retorne un Optional
     * vacío
     * cuando el usuario no existe en el repositorio. Se simula el comportamiento
     * del repositorio para devolver un Optional vacío cuando se busca por un nombre
     * de usuario que no existe. Luego se verifica que el resultado sea
     * efectivamente un Optional vacío y se confirma que se consultó al repositorio
     * una vez con el nombre de usuario proporcionado.
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
     * intentar registrar un usuario con un nombre de usuario que ya existe. Se
     * simula el comportamiento del repositorio para indicar que ya existe un
     * usuario con el mismo nombre de usuario. Luego se verifica que se lance una
     * excepción al intentar registrar el nuevo usuario, y se confirma que el
     * mensaje de la excepción contenga el nombre de usuario conflictivo. Además, se
     * verifica que el método save del repositorio nunca se haya llamado, ya que el
     * registro debería fallar antes de intentar guardar el nuevo usuario.
     */
    @Test
    void registerUser_DebeLanzarExcepcion_CuandoElNombreDeUsuarioYaExiste() {
        String username = "Luis";
        Users new_user = new Users(null, username, "frgt", Role.STUDENT, "jose.gmail.com");
        Users existing_user = new Users(1L, username, "frgt", Role.STUDENT, "jose.gmail.com");
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(existing_user));
        RuntimeException excepcion = assertThrows(RuntimeException.class, () -> {
            userService.registerUser(new_user);
        });
        assertTrue(excepcion.getMessage().contains(username));
        verify(userRepository, never()).save(any(Users.class));
    }
}
