package com.cursosonline.backend.controller;

import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.services.UserService;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController // Define que esta clase es un controlador REST
@RequestMapping("/api/auth") // Ruta base para todos los endpoints de usuarios
@RequiredArgsConstructor // Inyección de dependencias mediante Lombok
@CrossOrigin(origins = "http://localhost:5173") // Permite la conexión con React+Vite

public class UserController {
    private final UserService userService;

    /**
     * Endpoint para obtener el perfil de un usuario.
     * Permite al estudiante ver sus intereses y recomendaciones.
     */
    @GetMapping("/{username}")
    public ResponseEntity<Users> getUserProfile(@PathVariable String username) {
        return userService.findByUsername(username)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Endpoint para registrar nuevos usuarios.
     * Fundamental para la inscripción de estudiantes y profesores.
     */
    @PostMapping("/register")
    public ResponseEntity<Users> register(@RequestBody Users user) {
        return ResponseEntity.ok(userService.registerUser(user));
    }

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
     * Endpoint para el Administrador.
     * Permite la gestión global de todos los usuarios de la plataforma.
     */
    @GetMapping
    public ResponseEntity<List<Users>> listAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

}
