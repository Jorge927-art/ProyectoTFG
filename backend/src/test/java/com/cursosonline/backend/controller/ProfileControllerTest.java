package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.UserProfile;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.UserProfileRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.services.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Auditoría de Calidad: Pruebas unitarias de ProfileController")
class ProfileControllerTest {

    private MockMvc mockMvc;

    @Mock
    private FileStorageService fileStorageService;
    @Mock
    private UserProfileRepository profileRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private ProfileController profileController;

    private Users mockUser;
    private UserProfile mockProfile;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(profileController).build();

        // Creamos una instancia real de la entidad Users usando tus tipos nativos
        mockUser = new Users();
        mockUser.setUser_id(1L);
        mockUser.setUsername("luis");
        mockUser.setEmail("luis@test.com");

        // Buscamos un valor genérico dentro de tu propio Enum Role (por ejemplo, el
        // primer valor disponible)
        // Esto blinda el test sin importar si tus valores son STUDENT, ADMIN, USER,
        // etc.
        Role defaultRole = Role.values()[0];
        mockUser.setRole(defaultRole);

        mockProfile = new UserProfile();
        mockProfile.setUser(mockUser);
        mockProfile.setAvatarPath("uploads/avatars/foto.png");
        mockProfile.setPhoneNumber("600123456");
        mockProfile.setHomeAddress("Calle Mayor 123");
    }

    // ==========================================
    // 1. PRUEBAS DEL ENDPOINT GET (OBTENER PERFIL)
    // ==========================================

    @Test
    @DisplayName("GET /api/v1/profile - Debe retornar el perfil completo si el usuario está autenticado")
    void getProfile_Success() throws Exception {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("luis");
        when(userRepository.findByUsername("luis")).thenReturn(Optional.of(mockUser));
        when(profileRepository.findById(1L)).thenReturn(Optional.of(mockProfile));

        mockMvc.perform(get("/api/v1/profile")
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("luis"))
                .andExpect(jsonPath("$.email").value("luis@test.com"))
                .andExpect(jsonPath("$.role").value(mockUser.getRole().name()))
                .andExpect(jsonPath("$.avatarPath").value("uploads/avatars/foto.png"))
                .andExpect(jsonPath("$.phoneNumber").value("600123456"))
                .andExpect(jsonPath("$.homeAddress").value("Calle Mayor 123"));
    }

    @Test
    @DisplayName("GET /api/v1/profile - Debe retornar 401 Unauthorized si el objeto de autenticación es nulo o inválido")
    void getProfile_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("No autenticado"));
    }

    // ==========================================
    // 2. PRUEBAS DEL ENDPOINT POST (SUBIR AVATAR)
    // ==========================================

    @Test
    @DisplayName("POST /api/v1/profile/avatar - Debe subir el archivo y actualizar el avatar con éxito")
    void uploadAvatar_Success() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "avatar.jpg", MediaType.IMAGE_JPEG_VALUE, "imagenes_bytes".getBytes());

        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("luis");
        when(userRepository.findByUsername("luis")).thenReturn(Optional.of(mockUser));
        when(fileStorageService.storeFile(any(), eq("avatars"))).thenReturn("uploads/avatars/new_avatar.jpg");
        when(profileRepository.findById(1L)).thenReturn(Optional.of(mockProfile));

        mockMvc.perform(multipart("/api/v1/profile/avatar")
                .file(file)
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Foto de perfil actualizada con éxito"))
                .andExpect(jsonPath("$.path").value("uploads/avatars/new_avatar.jpg"));

        verify(profileRepository, times(1)).save(any(UserProfile.class));
    }

    @Test
    @DisplayName("POST /api/v1/profile/avatar - Debe retornar 400 Bad Request si el archivo está vacío")
    void uploadAvatar_EmptyFile() throws Exception {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file", "avatar.jpg", MediaType.IMAGE_JPEG_VALUE, new byte[0]);

        when(authentication.isAuthenticated()).thenReturn(true);

        mockMvc.perform(multipart("/api/v1/profile/avatar")
                .file(emptyFile)
                .principal(authentication))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("El archivo no puede estar vacío"));
    }

    // ==========================================
    // 3. PRUEBAS DEL ENDPOINT PUT (ACTUALIZAR DATOS)
    // ==========================================

    @Test
    @DisplayName("PUT /api/v1/profile/update - Debe procesar la reasociación de NotebookLM y guardar datos correctamente")
    void updateProfileData_Success() throws Exception {
        String dtoJson = "{"
                + "\"email\":\"nuevo_email@test.com\","
                + "\"phoneNumber\":\"699999999\","
                + "\"homeAddress\":\"Nueva Avenida 456\""
                + "}";

        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("luis");
        when(userRepository.findByUsername("luis")).thenReturn(Optional.of(mockUser));
        when(userRepository.saveAndFlush(any(Users.class))).thenReturn(mockUser);
        when(profileRepository.findById(1L)).thenReturn(Optional.of(mockProfile));

        mockMvc.perform(put("/api/v1/profile/update")
                .contentType(MediaType.APPLICATION_JSON)
                .content(dtoJson)
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Datos de perfil extendido guardados correctamente"));

        verify(userRepository, times(1)).saveAndFlush(any(Users.class));
        verify(profileRepository, times(1)).save(any(UserProfile.class));
    }
}
