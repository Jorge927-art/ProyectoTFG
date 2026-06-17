import { useMemo, useState, useEffect, useCallback } from 'react';
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
    // Estado de usuario autenticado, inicializado desde el almacenamiento local de forma síncrona
    const [user, setUser] = useState<AuthUser | null>(() => readStoredAuthUser());

    /**
     * Cierra la sesión del usuario limpiando el estado y el almacenamiento.
     * Envuelto en useCallback para evitar recreaciones infinitas en los efectos.
     */
    const logout = useCallback(() => {
        setUser(null);
        clearStoredAuth(); // Limpieza absoluta de usuario y token de forma centralizada
    }, []);

    /**
     * Procesa el inicio de sesión con JWT.
     * Captura el payload del backend, aislando el token del perfil de usuario.
     */
    const login = (tokenData: AuthTokenResponse) => {
        // 1. Extraer los datos unificados en camelCase e inyectar el token en el perfil
        const nextUser: AuthUser = {
            userId: tokenData.userId,
            username: tokenData.username,
            role: tokenData.role,
            email: tokenData.email,
            token: tokenData.accessToken, // Inyectamos el JWT en el perfil de usuario para uso interno
        };

        // 2. Actualizar el estado de React y la persistencia local de ambos elementos
        setUser(nextUser);
        writeStoredAuthUser(nextUser);
        writeStoredToken(tokenData.accessToken); // Guardamos el JWT de forma aislada
    };

    /**
     * CIRCUITO DE RESPUESTA REACTIVA ANTE CADUCIDAD (Solución al Hallazgo de Axios)
     * Escucha el evento global del DOM emitido por el apiClient ante errores HTTP 401.
     */
    useEffect(() => {
        const handleSessionExpired = () => {
            console.warn('Ejecutando logout preventivo por expiración de credenciales criptográficas.');
            logout();
        };

        // Suscripción al evento desacoplado emitido por el interceptor de red
        window.addEventListener('auth-session-expired', handleSessionExpired);

        // Limpieza de suscripciones para evitar fugas de memoria al desmontar el componente
        return () => {
            window.removeEventListener('auth-session-expired', handleSessionExpired);
        };
    }, [logout]);

    const value = useMemo(
        () => ({
            user,
            isAuthenticated: Boolean(user),
            isLoading: false, // Indicador base requerido por el contrato del contexto
            login,
            logout,
        }),
        [user, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
