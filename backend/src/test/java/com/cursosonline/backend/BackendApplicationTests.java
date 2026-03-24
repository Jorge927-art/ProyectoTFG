package com.cursosonline.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Clase de pruebas para la aplicación Backend. Esta clase se encarga de
 * verificar que el contexto de la aplicación se cargue correctamente. Es una
 * prueba básica que se ejecuta para asegurar que la configuración general de
 * Spring Boot no tenga errores y que los componentes principales de la
 * aplicación estén disponibles. Aunque esta prueba no verifica funcionalidades
 * específicas, es un punto de partida importante para garantizar que la
 * aplicación pueda iniciarse sin problemas antes de ejecutar pruebas más
 * detalladas en servicios, controladores y repositorios.
 */
@SpringBootTest
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
