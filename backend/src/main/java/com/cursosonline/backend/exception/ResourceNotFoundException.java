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
    public ResourceNotFoundException(String resource, Long id) {
        super(resource + " con ID " + id + " no encontrado.");
    }
}
