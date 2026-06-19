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

        // 2. ENDPOINT POST AVATAR OPTIMIZADO (Protección contra fallos y validación)
        @PostMapping("/avatar")
        public ResponseEntity<?> uploadAvatar(
                        Authentication authentication,
                        @RequestParam("file") MultipartFile file) {

                try {
                        if (authentication == null || !authentication.isAuthenticated()) {
                                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                                .body(Map.of("error", "No autenticado"));
                        }

                        // Validación del archivo adjunto
                        if (file == null || file.isEmpty()) {
                                return ResponseEntity.badRequest()
                                                .body(Map.of("error", "El archivo no puede estar vacío"));
                        }

                        // Validación del formato de imagen básico para el TFG
                        String contentType = file.getContentType();
                        if (contentType == null || !contentType.startsWith("image/")) {
                                return ResponseEntity.badRequest()
                                                .body(Map.of("error", "El archivo debe ser una imagen válida"));
                        }

                        Users currentUser = userRepository.findByUsername(authentication.getName())
                                        .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

                        // Almacenamiento físico del archivo binario
                        String relativePath = fileStorageService.storeFile(file, "avatars");

                        // Mutación atómica del perfil
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

                } catch (Exception e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                                        "error", "Error al procesar la subida del avatar",
                                        "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
                }
        }

        // 3. ENDPOINT PUT UPDATE CON EXTENSIÓN ATÓMICA A LA TABLA USERS
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

                        // Sincronización del email en la tabla 'users' (si viene en el DTO)
                        if (updateDTO.getEmail() != null && !updateDTO.getEmail().isBlank()) {
                                currentUser.setEmail(updateDTO.getEmail());
                                userRepository.save(currentUser);
                        }

                        // Sincronización del perfil extendido en la tabla 'user_profiles'
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

                } catch (Exception e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                                        "error", "Error al actualizar los datos del perfil",
                                        "detalles", e.getMessage() != null ? e.getMessage() : "Desconocido"));
                }
        }
}
