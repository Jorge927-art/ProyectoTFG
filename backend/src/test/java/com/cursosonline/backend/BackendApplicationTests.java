package com.cursosonline.backend;

import com.cursosonline.backend.controller.UserController;
import com.cursosonline.backend.security.jwt.JwtService;
import com.cursosonline.backend.services.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class BackendApplicationTests {

	@Autowired
	private UserController userController;

	@Autowired
	private JwtService jwtService;

	@Autowired
	private UserService userService;

	@Test
	void contextLoadsAndCriticalBeansAreInjected() {
		// Validar de forma asertiva que la infraestructura base levanta y se securiza
		// sin fallos de IoC
		assertNotNull(userController, "El controlador web crítico no se instanció correctamente.");
		assertNotNull(jwtService, "El motor criptográfico JwtService no está disponible en el contexto.");
		assertNotNull(userService, "La capa de servicios centrales de negocio falló al inicializarse.");
	}
}
