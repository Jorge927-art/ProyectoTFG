package com.cursosonline.backend.exception;

/**
 * Excepción personalizada para errores relacionados con los servicios de la
 * aplicación. Se utiliza para encapsular errores específicos que pueden ocurrir
 * durante la ejecución de las operaciones de negocio, como problemas de
 * autenticación, validación o cualquier otro error que no encaje en las
 * categorías de excepciones más específicas.
 * Al extender RuntimeException, esta excepción es una excepción no verificada,
 * lo que significa que no es obligatorio capturarla o declararla en la firma de
 * los métodos, permitiendo una mayor flexibilidad en su manejo.
 */
public class ServicesException extends RuntimeException {
    public ServicesException(String message) {
        super(message);
    }
}
