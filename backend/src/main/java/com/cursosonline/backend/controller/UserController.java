package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.services.UserService;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")

/**
 * Controlador REST que maneja las solicitudes relacionadas con la autenticación
 * y gestión de usuarios.
 * Proporciona endpoints para el registro de nuevos usuarios, login y obtención
 * del perfil de usuario. Utiliza UserService para delegar la lógica de negocio
 * y ResponseEntity para construir las respuestas HTTP adecuadas.
 */
public class UserController {
    private final UserService userService;

    /**
     * Endpoint para obtener el perfil de un usuario.
     * 
     * @param username
     * @return
     */
    @GetMapping("/{username}")
    public ResponseEntity<Users> getUserProfile(@PathVariable String username) {
        return userService.findByUsername(username)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Endpoint para el registro de nuevos usuarios.
     * 
     * @param user
     * @return
     */
    @PostMapping("/register")
    public ResponseEntity<Users> register(@RequestBody Users user) {
        return ResponseEntity.ok(userService.registerUser(user));
    }

    /**
     * Endpoint para el login de usuarios.
     * 
     * @param loginRequest
     * @return
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Users loginRequest) {
        try {
            // Llamamos al nuevo método del servicio que acabas de crear
            Users user = userService.login(loginRequest.getUsername(), loginRequest.getPassword());
            return ResponseEntity.ok(user);
        } catch (ServicesException e) {
            // Si el usuario no existe o la contraseña está mal, devolvemos 401
            return ResponseEntity.status(401).body(e.getMessage());
        } catch (Exception e) {
            // Cualquier otro error inesperado
            return ResponseEntity.status(500).body("Error interno del servidor");
        }
    }

    /**
     * Endpoint para obtener la lista de todos los usuarios (solo para
     * Administrador).
     * 
     * @return
     */
    @GetMapping
    public ResponseEntity<List<Users>> listAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

}
