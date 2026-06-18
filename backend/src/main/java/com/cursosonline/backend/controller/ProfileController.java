package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.ProfileResponseDTO;
import com.cursosonline.backend.dto.ProfileUpdateDTO;
import com.cursosonline.backend.entities.UserProfile;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.UserProfileRepository;
import com.cursosonline.backend.repository.UserRepository; // Necesario para buscar el usuario
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
        private final UserRepository userRepository; // Inyección del repositorio de usuarios

        public ProfileController(FileStorageService fileStorageService,
                        UserProfileRepository profileRepository,
                        UserRepository userRepository) {
                this.fileStorageService = fileStorageService;
                this.profileRepository = profileRepository;
                this.userRepository = userRepository;
        }

        // 1. ENDPOINT GET REFACTORIZADO CON EXTRACCIÓN SEGURA
        @GetMapping
        public ResponseEntity<?> getProfile(Authentication authentication) {
                StringBuilder debugLog = new StringBuilder();
                debugLog.append("[B1: Entrando en método] ");

                try {
                        if (authentication == null || !authentication.isAuthenticated()) {
                                debugLog.append("[B2: ¡Authentication es NULL!] ");
                                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                                .body(Map.of("error", "No autenticado", "mapa_banderas",
                                                                debugLog.toString()));
                        }

                        // Extrae el username guardado en el JWT durante el filtro de autenticación
                        String username = authentication.getName();
                        Users currentUser = userRepository.findByUsername(username)
                                        .orElseThrow(() -> new RuntimeException("Usuario no encontrado en BD"));

                        debugLog.append("[B2: ID Usuario = " + currentUser.getUser_id() + "] ");
                        debugLog.append("[B3: Ejecutando findById en PostgreSQL...] ");

                        UserProfile profile = profileRepository.findById(currentUser.getUser_id()).orElse(null);
                        debugLog.append("[B4: Repositorio OK. ¿Existe perfil?: " + (profile != null) + "] ");

                        debugLog.append("[B5: Construyendo Response DTO...] ");
                        ProfileResponseDTO response = new ProfileResponseDTO(
                                        currentUser.getUsername(),
                                        currentUser.getEmail(),
                                        currentUser.getRole().name(),
                                        (profile != null) ? profile.getAvatarPath() : null,
                                        (profile != null) ? profile.getPhoneNumber() : null,
                                        (profile != null) ? profile.getHomeAddress() : null);

                        debugLog.append("[B6: Todo Correcto. Enviando 200]");
                        return ResponseEntity.ok(response);

                } catch (Exception e) {
                        debugLog.append("[B_ERROR: " + e.getClass().getSimpleName() + " -> " + e.getMessage() + "]");
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                                        "error", "Internal Server Error en Java",
                                        "traza_excepcion",
                                        e.getMessage() != null ? e.getMessage() : "NullPointerException",
                                        "mapa_banderas", debugLog.toString()));
                }
        }

        // 2. ENDPOINT POST AVATAR REFACTORIZADO
        @PostMapping("/avatar")
        public ResponseEntity<?> uploadAvatar(
                        Authentication authentication,
                        @RequestParam("file") MultipartFile file) {

                if (authentication == null) {
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("No autenticado");
                }

                Users currentUser = userRepository.findByUsername(authentication.getName())
                                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

                String relativePath = fileStorageService.storeFile(file, "avatars");

                UserProfile profile = profileRepository.findById(currentUser.getUser_id()).orElse(null);
                if (profile == null) {
                        profile = new UserProfile();
                        profile.setId(currentUser.getUser_id());
                        profile.setUser(currentUser);
                }

                profile.setAvatarPath(relativePath);
                profileRepository.save(profile);

                return ResponseEntity.ok(Map.of(
                                "message", "Foto de perfil actualizada con éxito",
                                "path", relativePath));
        }

        // 3. ENDPOINT PUT UPDATE REFACTORIZADO (Resuelve el Error 500)
        @PutMapping("/update")
        public ResponseEntity<?> updateProfileData(
                        Authentication authentication,
                        @RequestBody ProfileUpdateDTO updateDTO) {

                if (authentication == null) {
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("No autenticado");
                }

                // Recuperamos al usuario directamente por el identificador único de su sesión
                // JWT
                Users currentUser = userRepository.findByUsername(authentication.getName())
                                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

                UserProfile profile = profileRepository.findById(currentUser.getUser_id()).orElse(null);
                if (profile == null) {
                        profile = new UserProfile();
                        profile.setId(currentUser.getUser_id());
                        profile.setUser(currentUser);
                }

                profile.setPhoneNumber(updateDTO.getPhoneNumber());
                profile.setHomeAddress(updateDTO.getHomeAddress());
                profileRepository.save(profile);

                return ResponseEntity.ok(Map.of(
                                "message", "Datos de perfil extendido guardados correctamente"));
        }
}
