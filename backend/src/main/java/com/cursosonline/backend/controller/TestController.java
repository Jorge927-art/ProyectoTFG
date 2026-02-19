package com.cursosonline.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TestController {
    private static final Logger logger = LoggerFactory.getLogger(TestController.class);

    @GetMapping("/prueba")
    public Map<String, String> saludar() {
        logger.info(">>> Test de conexión: recibido desde el Frontend (React/Vite)");
        return Map.of("mensaje", "Conexión establecida con Java 21 y PostgreSQL");
    }
}
