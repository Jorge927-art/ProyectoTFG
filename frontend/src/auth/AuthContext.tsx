import { createContext } from 'react';
import type { AuthContextType } from './authTypes';

/**
 * Contexto básico de autenticación.
 * Define los valores por defecto del sistema antes de que el AuthProvider inyecte el estado real.
 */
export const AuthContext = createContext<AuthContextType>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: () => { }, // Firma vacía por defecto adaptada al nuevo contrato de tipos
    logout: () => { },
});

export type AuthContextValue = AuthContextType;

