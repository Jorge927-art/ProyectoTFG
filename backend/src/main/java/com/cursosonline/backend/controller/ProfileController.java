package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.ProfileResponseDTO;
import com.cursosonline.backend.dto.ProfileUpdateDTO;
import com.cursosonline.backend.entities.UserProfile;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.UserProfileRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.services.FileStorageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/profile")
@Transactional
public class ProfileController {

        private final FileStorageService fileStorageService;
        private final UserProfileRepository profileRepository;
        private final UserRepository userRepository;

        public ProfileController(FileStorageService fileStorageService,
                        UserProfileRepository profileRepository,
                        UserRepository userRepository) {
                this.fileStorageService = fileStorageService;
                this.profileRepository = profileRepository;
                this.userRepository = userRepository;
        }

        // 1. ENDPOINT GET REFACTORIZADO
        @GetMapping
        public ResponseEntity<?> getProfile(Authentication authentication) {
                try {
                        if (authentication == null || !authentication.isAuthenticated()) {
                                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                                .body(Map.of("error", "No autenticado"));
                        }

                        String username = authentication.getName();
                        Users currentUser = userRepository.findByUsername(username)
                                        .orElseThrow(() -> new RuntimeException("Usuario no encontrado en BD"));

                        UserProfile profile = profileRepository.findById(currentUser.getUser_id()).orElse(null);

                        ProfileResponseDTO response = new ProfileResponseDTO(
                                        currentUser.getUsername(),
                                        currentUser.getEmail(),
                                        currentUser.getRole().name(),
                                        (profile != null) ? profile.getAvatarPath() : null,
                                        (profile != null) ? profile.getPhoneNumber() : null,
                                        (profile != null) ? profile.getHomeAddress() : null);

                        return ResponseEntity.ok(response);

                } catch (Exception e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                                        "error", "Internal Server Error en Java",
                                        "traza_excepcion", e.getMessage() != null ? e.getMessage() : "Desconocido"));
                }
        }

        // 2. ENDPOINT POST AVATAR
        @PostMapping("/avatar")
        public ResponseEntity<?> uploadAvatar(
                        Authentication authentication,
                        @RequestParam("file") MultipartFile file) {

                try {
                        if (authentication == null || !authentication.isAuthenticated()) {
                                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                                .body(Map.of("error", "No autenticado"));
                        }

                        if (file == null || file.isEmpty()) {
                                return ResponseEntity.badRequest()
                                                .body(Map.of("error", "El archivo no puede estar vacío"));
                        }

                        Users currentUser = userRepository.findByUsername(authentication.getName())
                                        .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

                        // El servicio se encarga de las validaciones de tipo MIME y extensión de manera
                        // estricta
                        String relativePath = fileStorageService.storeFile(file, "avatars");

                        UserProfile profile = profileRepository.findById(currentUser.getUser_id()).orElse(null);
                        if (profile == null) {
                                profile = new UserProfile();
                                profile.setUser(currentUser);
                        }

                        profile.setAvatarPath(relativePath);
                        profileRepository.save(profile);

                        return ResponseEntity.ok(Map.of(
                                        "message", "Foto de perfil actualizada con éxito",
                                        "path", relativePath));

                } catch (IllegalArgumentException e) {
                        // Captura controlada de errores de validación de formato (Bad Request)
                        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
                } catch (Exception e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                                        "error", "Error al procesar la subida del avatar",
                                        "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
                }
        }

        // 3. ENDPOINT PUT UPDATE CON LA CORRECCIÓN DE REASOCIACIÓN DE NOTEBOOKLM
        @PutMapping("/update")
        public ResponseEntity<?> updateProfileData(
                        Authentication authentication,
                        @RequestBody ProfileUpdateDTO updateDTO) {

                try {
                        if (authentication == null || !authentication.isAuthenticated()) {
                                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                                .body(Map.of("error", "No autenticado"));
                        }

                        Users currentUser = userRepository.findByUsername(authentication.getName())
                                        .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

                        // LA CLAVE DE NOTEBOOKLM: Forzamos la reasociación y el merge() en la sesión
                        // actual
                        currentUser = userRepository.saveAndFlush(currentUser);

                        // 1. Sincronización del email en la entidad principal
                        if (updateDTO.getEmail() != null && !updateDTO.getEmail().isBlank()) {
                                currentUser.setEmail(updateDTO.getEmail());
                        }

                        // 2. Sincronización del perfil extendido
                        UserProfile profile = profileRepository.findById(currentUser.getUser_id()).orElse(null);

                        if (profile == null) {
                                profile = new UserProfile();
                                profile.setUser(currentUser); // @MapsId se encarga del ID automáticamente
                        }

                        profile.setPhoneNumber(updateDTO.getPhoneNumber());
                        profile.setHomeAddress(updateDTO.getHomeAddress());

                        // 3. Persistencia de datos
                        profileRepository.save(profile);
                        userRepository.save(currentUser);

                        return ResponseEntity
                                        .ok(Map.of("message", "Datos de perfil extendido guardados correctamente"));

                } catch (Exception e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                                        "error", "Error al actualizar los datos del perfil",
                                        "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
                }
        }
}
