package com.cursosonline.backend.exception;

public class UserAlreadyExistsException extends ServicesException {
    public UserAlreadyExistsException(String username) {
        super("El usuario " + username + " ya existe en el sistema.");
    }
}
