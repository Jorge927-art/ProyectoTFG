package com.cursosonline.backend.exception;

/**
 * Excepción personalizada que se lanza cuando se intenta registrar un usuario
 * con un nombre de usuario que ya existe en el sistema. Extiende de
 * ServicesException para
 * mantener una jerarquía de excepciones coherente en la capa de servicios. El
 * mensaje de error incluye el nombre de usuario que causó el conflicto para
 * facilitar la depuración y la comunicación con el frontend.
 */
public class UserAlreadyExistsException extends ServicesException {
    public UserAlreadyExistsException(String username) {
        super("El usuario " + username + " ya existe en el sistema.");
    }
}
