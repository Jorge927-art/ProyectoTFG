import { createContext } from 'react';
import type { AuthContextType } from './authTypes';

/**
 * Contexto global de autenticación para la SPA, proporcionando el estado de usuario y métodos de gestión de sesión.
 * Inicialmente, el usuario es null y no autenticado. Los métodos de login, logout y actualización de usuario son funciones vacías por defecto.
 * Este contexto debe ser consumido por componentes hijos a través del hook useContext(AuthContext).
 */
export const AuthContext = createContext<AuthContextType>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: () => { },
    updateUser: () => { },
    logout: () => { },
});

export type AuthContextValue = AuthContextType;

