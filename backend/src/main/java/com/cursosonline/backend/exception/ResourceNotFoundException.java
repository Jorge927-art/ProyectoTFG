package com.cursosonline.backend.exception;

public class ResourceNotFoundException extends ServicesException {
    public ResourceNotFoundException(String resource, Long id) {
        super(resource + " con ID " + id + " no encontrado.");
    }
}
