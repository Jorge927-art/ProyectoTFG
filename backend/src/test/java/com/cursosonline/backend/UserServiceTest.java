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

@ExtendWith(MockitoExtension.class) // Inicializa los mocks automáticamente
public class UserServiceTest {
    @Mock
    private UserRepository userRepository; // El mock de la base de datos

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService; // Inyecta el mock de arriba aquí

    @Test
    void findByUsername_DebeRetornarUsuario_CuandoExiste() {
        // 1. ARRANGE (Preparar el escenario)
        String username = "Luis";
        Users expectedUser = new Users(1L, "Luis", "luis@yahoo.es",
                "jki", Role.STUDENT, "informatica", "cine");
        // Configuramos el mock: "Cuando llamen a findById(1), devuelve este usuario"
        // Simulamos el repositorio
        when(userRepository.findByUsername("Luis")).thenReturn(Optional.of(expectedUser));

        Optional<Users> result = userService.findByUsername(username);

        // 3. ASSERT verificamos que funcione
        assertTrue(result.isPresent());
        assertEquals(username, result.get().getUsername());
    }

    @Test
    void assignUser() {
        // Arranque
        Users newUser = new Users(null, "Luis", "luis@yahoo.es", "jki", Role.STUDENT, "informatica", "cine");
        Users savedUser = new Users(1L, "Luis", "luis@yahoo.es", "jki", Role.STUDENT, "informatica", "cine");
        // CONFIGURACIÓN DE MOCKS:
        // Simular que el usuario NO existe todavía
        when(userRepository.findByUsername("Luis")).thenReturn(Optional.empty());
        // Simular el cifrado de contraseña (devuelve una cadena cualquiera)
        when(passwordEncoder.encode("jki")).thenReturn("encoded_jki");
        // Simular el guardado
        when(userRepository.save(any(Users.class))).thenReturn(savedUser);

        // ACT
        Users result = userService.registerUser(newUser);

        // ASSERT
        assertNotNull(result.getUser_id());
        assertEquals(1L, result.getUser_id());
        verify(userRepository).save(any(Users.class));
        verify(passwordEncoder).encode("jki"); // Verifica que se intentó cifrar
    }

    @Test
    void findByUsername_ReturnEmpty() {
        // 1. ARRANGE (Preparar el fallo)
        String username_does_not_exist = "usuario_no_existe";

        // Configuramos el mock para que devuelva un Optional vacío
        when(userRepository.findByUsername(username_does_not_exist)).thenReturn(Optional.empty());

        // 2. ACT (Ejecutar la acción del servicio)
        Optional<Users> resultado = userService.findByUsername(username_does_not_exist);

        // 3. ASSERT (Verificar que realmente está vacío)
        assertFalse(resultado.isPresent(), "El resultado debería ser un Optional vacío");
        assertTrue(resultado.isEmpty());

        // Verificamos que se consultó al repositorio una vez
        verify(userRepository, times(1)).findByUsername(username_does_not_exist);
    }

    @Test
    void registerUser_DebeLanzarExcepcion_CuandoElNombreDeUsuarioYaExiste() {
        // 1. ARRANGE
        String username = "Luis";
        Users new_user = new Users(null, username, "email@test.com", "frgt", Role.STUDENT, "biologia", "musica");
        Users existing_user = new Users(1L, username, "otro@email.com", "frgt", Role.STUDENT, "biologia", "musica");

        // Simulamos que el repositorio SÍ encuentra a alguien con ese nombre
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(existing_user));

        // 2. ACT & ASSERT (Se hacen juntos con assertThrows)
        RuntimeException excepcion = assertThrows(RuntimeException.class, () -> {
            userService.registerUser(new_user);
        });
        // 3. VERIFICACIONES ADICIONALES
        assertTrue(excepcion.getMessage().contains(username));
        // Verificamos que NUNCA se llegó a llamar al método save
        verify(userRepository, never()).save(any(Users.class));
    }
}
