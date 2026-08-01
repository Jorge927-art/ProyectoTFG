package com.cursosonline.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Clase principal de la aplicación Spring Boot. Anotada
 * con @SpringBootApplication, que es una combinación
 * de @Configuration, @EnableAutoConfiguration y @ComponentScan. Contiene el
 * método main que inicia la aplicación.
 */
@SpringBootApplication
@EnableScheduling
public class BackendApplication {

	/**
	 * Método principal que arranca la aplicación Spring Boot.
	 * Utiliza SpringApplication.run para iniciar el contexto de la aplicación.
	 * 
	 * @param args
	 */
	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

}
