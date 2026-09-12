package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test-ci")
@DisplayName("Integración Login - Bloqueo automático por intentos fallidos")
class LoginAttemptLockoutIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;
    private String username;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        username = "lockout_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);

        Users user = new Users();
        user.setUsername(username);
        user.setEmail(username + "@test.local");
        user.setPassword(passwordEncoder.encode("CorrectPwd#2026"));
        user.setRole(Role.STUDENT);
        user.setEnabled(true);
        user.setFailedLoginAttempts(0);

        userRepository.saveAndFlush(user);
    }

    @AfterEach
    void tearDown() {
        userRepository.findByUsername(username).ifPresent(user -> {
            jdbcTemplate.update("DELETE FROM auth_refresh_tokens WHERE user_id = ?", user.getUser_id());
            userRepository.delete(user);
        });
        userRepository.flush();
    }

    @Test
    @DisplayName("Debe bloquear al tercer fallo de contraseña y persistir estado inactivo")
    void shouldLockUserAfterThirdWrongPasswordAttempt() throws Exception {
        String payload = "{\"username\":\"" + username + "\",\"password\":\"WrongPwd#2026\"}";

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Contraseña incorrecta. Quedan 2 intentos"));

        assertUserState(1, true);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Contraseña incorrecta. Queda 1 intento"));

        assertUserState(2, true);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Usuario bloqueado. Póngase en contacto con el administrador"));

        assertUserState(3, false);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"" + username + "\",\"password\":\"CorrectPwd#2026\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Usuario bloqueado. Póngase en contacto con el administrador"));

        assertUserState(3, false);
    }

    @Test
    @DisplayName("Debe resetear intentos tras reactivación admin y permitir login correcto")
    void shouldResetAttemptsAfterAdminReactivationAndAllowLogin() throws Exception {
        String wrongPayload = "{\"username\":\"" + username + "\",\"password\":\"WrongPwd#2026\"}";

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(wrongPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Contraseña incorrecta. Quedan 2 intentos"));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(wrongPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Contraseña incorrecta. Queda 1 intento"));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(wrongPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Usuario bloqueado. Póngase en contacto con el administrador"));

        assertUserState(3, false);

        mockMvc.perform(delete("/api/auth/users/{username}", username)
                .with(user("admin_test").authorities(new SimpleGrantedAuthority("ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true));

        assertUserState(0, true);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"" + username + "\",\"password\":\"CorrectPwd#2026\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(username));
    }

    private void assertUserState(int expectedAttempts, boolean expectedEnabled) {
        Optional<Users> current = userRepository.findByUsername(username);
        assertTrue(current.isPresent(), "El usuario de prueba debe existir durante el flujo.");

        assertEquals(expectedAttempts, current.get().getFailedLoginAttempts());
        assertEquals(expectedEnabled, current.get().isEnabled());

        if (!expectedEnabled) {
            assertFalse(current.get().isEnabled(), "El tercer fallo debe activar el bloqueo lógico del usuario.");
        }
    }
}
