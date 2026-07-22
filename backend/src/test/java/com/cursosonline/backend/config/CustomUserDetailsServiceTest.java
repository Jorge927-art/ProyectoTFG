package com.cursosonline.backend.config;

import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@DisplayName("Suite de Pruebas Unitarias para CustomUserDetailsService")
class CustomUserDetailsServiceTest {

    private UserRepository userRepository;
    private CustomUserDetailsService customUserDetailsService;
    private Users sampleUser;

    @BeforeEach
    void setUp() {
        // 1. Crear el simulador del repositorio
        userRepository = Mockito.mock(UserRepository.class);

        // 2. Instanciar el servicio bajo prueba
        customUserDetailsService = new CustomUserDetailsService(userRepository);

        // 3. Crear una instancia REAL de la entidad de usuario para evitar conflictos
        // con Mockito
        sampleUser = new Users();
        sampleUser.setUser_id(1L);
        sampleUser.setUsername("alumno_tfg");
        sampleUser.setPassword("$2a$10$abcdefghijklmnop");

        // 4. Asignamos el rol real leyendo dinámicamente el tipo de tu enumerado
        try {
            java.lang.reflect.Method getRoleMethod = Users.class.getMethod("getRole");
            Class<?> roleType = getRoleMethod.getReturnType();
            if (roleType.isEnum()) {
                Object[] enumConstants = roleType.getEnumConstants();
                if (enumConstants != null && enumConstants.length > 0) {
                    java.lang.reflect.Method setRoleMethod = Users.class.getMethod("setRole", roleType);
                    setRoleMethod.invoke(sampleUser, enumConstants[0]); // Asigna el primer rol disponible (ej: STUDENT
                                                                        // o ADMIN)
                }
            }
        } catch (Exception ignored) {
            // Si tu sistema maneja el rol como un String o si no requiere inicialización
            // reflectiva
        }
    }

    /*
     * =========================================================================
     * 1. FLUJO EXITOSO: BÚSQUEDA ENCONTRADA
     * =========================================================================
     */
    @Test
    @DisplayName("Debe cargar correctamente los detalles del usuario si existe en el repositorio")
    void loadUserByUsername_UserExists_ShouldReturnUserDetails() {
        when(userRepository.findByUsername("alumno_tfg")).thenReturn(Optional.of(sampleUser));

        UserDetails userDetails = customUserDetailsService.loadUserByUsername("alumno_tfg");

        assertNotNull(userDetails, "Los detalles del usuario no deben ser nulos");
        assertEquals("alumno_tfg", userDetails.getUsername());
        assertEquals("$2a$10$abcdefghijklmnop", userDetails.getPassword());
    }

    /*
     * =========================================================================
     * 2. FLUJO DE EXCEPCIÓN: USUARIO INEXISTENTE
     * =========================================================================
     */
    @Test
    @DisplayName("Debe lanzar UsernameNotFoundException cuando el usuario no está registrado")
    void loadUserByUsername_UserDoesNotExist_ShouldThrowException() {
        when(userRepository.findByUsername("usuario_fantasma")).thenReturn(Optional.empty());

        assertThrows(UsernameNotFoundException.class, () -> {
            customUserDetailsService.loadUserByUsername("usuario_fantasma");
        });
    }
}
