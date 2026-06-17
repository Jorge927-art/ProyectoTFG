import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser, AuthTokenResponse } from './authTypes';
import { AuthContext } from './AuthContext';
import { clearStoredAuth, readStoredAuthUser, writeStoredAuthUser, writeStoredToken } from './authStorage';

interface AuthProviderProps {
    children: ReactNode;
}

/**
 * Provider global de autenticación adaptado para JWT.
 * Convierte el estado de autenticación y el token en la fuente de verdad de la SPA.
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
    // Estado de usuario autenticado, inicializado desde el almacenamiento local
    const [user, setUser] = useState<AuthUser | null>(() => readStoredAuthUser());

    /**
     * Procesa el inicio de sesión con JWT.
     * Captura el payload del backend, aislando el token del perfil de usuario.
     */
    const login = (tokenData: AuthTokenResponse) => {
        // 1. Extraer los datos que el frontend necesita para pintar la interfaz
        const nextUser: AuthUser = {
            userId: tokenData.userId,
            username: tokenData.username,
            role: tokenData.role,
            email: tokenData.email
        };

        // 2. Actualizar el estado de React y la persistencia local de ambos elementos
        setUser(nextUser);
        writeStoredAuthUser(nextUser);
        writeStoredToken(tokenData.accessToken); // Guardamos el JWT de forma aislada
    };

    /**
     * Cierra la sesión del usuario limpiando el estado y el almacenamiento.
     */
    const logout = () => {
        setUser(null);
        clearStoredAuth(); // Limpieza absoluta de usuario y token
    };

    const value = useMemo(
        () => ({
            user,
            isAuthenticated: Boolean(user),
            isLoading: false, // Indicador base requerido por el contrato del contexto
            login,
            logout,
        }),
        [user]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

