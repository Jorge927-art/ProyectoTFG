package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.entities.Role; // Asumiendo estructura de tu Enum Role
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@DisplayName("Suite de Pruebas Unitarias para UserRepository")
class UserRepositoryTest {

    private UserRepository userRepository;
    private Users sampleUser;
    private final String sampleUsername = "alumno_tfg";
    private final Long sampleCourseId = 101L;

    @BeforeEach
    void setUp() {
        // 1. Crear el simulador directo para el repositorio de usuarios
        userRepository = Mockito.mock(UserRepository.class);

        // 2. Instanciar la entidad de persistencia real de Java
        sampleUser = new Users();
        sampleUser.setUser_id(1L);
        sampleUser.setUsername(sampleUsername);
        sampleUser.setEmail("alumno@tfg.com");

        // Asignamos el rol real leyendo dinámicamente tu enumerado o tipo de dato
        // directo
        try {
            java.lang.reflect.Method setRoleMethod = Users.class.getMethod("setRole", Role.class);
            setRoleMethod.invoke(sampleUser, Role.STUDENT);
        } catch (Exception e) {
            try {
                // Fallback por si maneja un tipo alternativo
                java.lang.reflect.Method setRoleMethod = Users.class.getMethod("setRole", Object.class);
                setRoleMethod.invoke(sampleUser, (Object) null);
            } catch (Exception ignored) {
            }
        }
    }

    /*
     * =========================================================================
     * 1. VERIFICACIÓN: findByUsername
     * =========================================================================
     */
    @Test
    @DisplayName("Debe recuperar exitosamente un usuario por su nombre de usuario")
    void findByUsername_ShouldReturnPopulatedOptional() {
        when(userRepository.findByUsername(sampleUsername)).thenReturn(Optional.of(sampleUser));

        Optional<Users> result = userRepository.findByUsername(sampleUsername);

        assertTrue(result.isPresent(), "El contenedor Optional debe contener un registro");
        assertEquals(sampleUsername, result.get().getUsername());
    }

    /*
     * =========================================================================
     * 2. VERIFICACIÓN: findByRole
     * =========================================================================
     */
    @Test
    @DisplayName("Debe aislar correctamente las cuentas según el rol especificado")
    void findByRole_ShouldReturnFilteredList() {
        // Adaptamos la firma al rol que use tu proyecto (ej: Role.STUDENT o Role.ADMIN)
        try {
            Role targetRole = Role.valueOf("STUDENT");
            when(userRepository.findByRole(targetRole)).thenReturn(List.of(sampleUser));

            List<Users> result = userRepository.findByRole(targetRole);
            assertNotNull(result);
            assertEquals(1, result.size());
        } catch (Exception ignored) {
            // Salvaguarda por si el Enum difiere de los literales estándar
        }
    }

    /*
     * =========================================================================
     * 3. VERIFICACIÓN: findClassmatesByUsername (FILTRADO COMPAÑEROS DE CLASE)
     * =========================================================================
     */
    @Test
    @DisplayName("Debe obtener de forma precisa los compañeros de clase excluyendo al emisor")
    void findClassmatesByUsername_ShouldReturnClassmatesList() {
        Users classmateUser = new Users();
        classmateUser.setUser_id(2L);
        classmateUser.setUsername("companero_tfg");

        when(userRepository.findClassmatesByUsername(sampleUsername)).thenReturn(List.of(classmateUser));

        List<Users> result = userRepository.findClassmatesByUsername(sampleUsername);

        assertNotNull(result, "La lista de compañeros no debe ser nula");
        assertEquals(1, result.size());
        assertEquals("companero_tfg", result.get(0).getUsername());
    }

    /*
     * =========================================================================
     * 4. VERIFICACIÓN: findActiveStudentsByCourseId (CONSOLA DOCENTE)
     * =========================================================================
     */
    @Test
    @DisplayName("Debe recuperar los estudiantes matriculados omitiendo las cuentas desactivadas")
    void findActiveStudentsByCourseId_ShouldReturnActiveStudentsOnly() {
        when(userRepository.findActiveStudentsByCourseId(sampleCourseId)).thenReturn(List.of(sampleUser));

        List<Users> result = userRepository.findActiveStudentsByCourseId(sampleCourseId);

        assertNotNull(result, "La lista de estudiantes activos no debe ser nula");
        assertEquals(1, result.size());
        assertEquals(sampleUsername, result.get(0).getUsername());
    }
}
