package com.cursosonline.backend.exception;

/**
 * Excepción personalizada para indicar que un recurso no fue encontrado en la
 * base de datos.
 * Se utiliza para manejar casos donde se intenta acceder a un recurso que no
 * existe, como un usuario, curso, etc.
 * Hereda de ServicesException para mantener una jerarquía de excepciones
 * coherente en la capa de servicios.
 */
public class ResourceNotFoundException extends ServicesException {

    /**
     * Constructor que crea una nueva instancia de ResourceNotFoundException con un
     * mensaje específico.
     * 
     * @param resource El nombre del recurso que no fue encontrado.
     * @param id       El identificador del recurso que no fue encontrado.
     */
    public ResourceNotFoundException(String resource, Long id) {
        super(resource + " con ID " + id + " no encontrado.");
    }

    /**
     * Constructor que crea una nueva instancia de ResourceNotFoundException con un
     * mensaje específico.
     * 
     * @param message El mensaje de error que describe la excepción.
     */
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
