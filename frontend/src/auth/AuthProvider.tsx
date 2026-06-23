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
    // Estado de usuario autenticado, inicializado desde el almacenamiento local
    const [user, setUser] = useState<AuthUser | null>(() => readStoredAuthUser());

    /**
     * Cierra la sesión del usuario limpiando el estado y el almacenamiento.
     */
    const logout = useCallback(() => {
        setUser(null);
        clearStoredAuth();
    }, []);

    /**
 * Procesa el inicio de sesión con JWT.
 */
    const login = (tokenData: AuthTokenResponse) => {
        // SOLUCIÓN DEFINITIVA TS: Pasamos por 'unknown' antes de castear a Record para saltar la restricción ts(2352)
        const rawToken = tokenData as unknown as Record<string, unknown>;
        const seconds = rawToken['expiresInSeconds'];

        // Calcular el instante exacto de expiración (15 min por defecto si falla)
        const lifespanMs = (typeof seconds === 'number' && seconds > 0) ? seconds * 1000 : 15 * 60 * 1000;
        const expiresAt = Date.now() + lifespanMs;

        // Extraer los datos e inyectar el sello de caducidad en el perfil
        const nextUser: AuthUser & { expiresAt: number } = {
            userId: tokenData.userId,
            username: tokenData.username,
            role: tokenData.role,
            email: tokenData.email,
            token: tokenData.accessToken,
            expiresAt: expiresAt
        };

        setUser(nextUser);
        writeStoredAuthUser(nextUser);
        writeStoredToken(tokenData.accessToken);
    };

    /**
     * BLINDAJE TFG (Auditoría NotebookLM): Desconexión Proactiva por Tiempo.
     * Monitorea el TTL del token y expulsa al usuario al cumplir el tiempo límite.
     */
    useEffect(() => {
        const userWithExpiry = user as (AuthUser & { expiresAt?: number }) | null;

        if (!userWithExpiry || !userWithExpiry.expiresAt) return;

        const timeLeft = userWithExpiry.expiresAt - Date.now();

        // SOLUCIÓN INTERMITENCIA ESLINT: Si ya expiró al arrancar el efecto, usamos un micro-timeout 
        // para sacarlo del ciclo de render síncrono y evitar el error "set-state-in-effect"
        if (timeLeft <= 0) {
            const systemTimeout = setTimeout(() => {
                logout();
            }, 0);
            return () => clearTimeout(systemTimeout);
        }

        // Configuramos el temporizador exacto para expulsar al usuario al cumplir el TTL
        const timer = setTimeout(() => {
            console.warn("Sesión expirada por inactividad (TTL alcanzado). Redirigiendo...");
            logout();
        }, timeLeft);

        return () => clearTimeout(timer);
    }, [user, logout]);

    /**
     * CIRCUITO DE RESPUESTA REACTIVA ANTE CADUCIDAD (Solución al Hallazgo de Axios)
     */
    useEffect(() => {
        const handleSessionExpired = () => {
            console.warn('Ejecutando logout preventivo por expiración de credenciales.');
            logout();
        };

        window.addEventListener('auth-session-expired', handleSessionExpired);
        return () => {
            window.removeEventListener('auth-session-expired', handleSessionExpired);
        };
    }, [logout]);

    const value = useMemo(
        () => ({
            user,
            isAuthenticated: Boolean(user),
            isLoading: false,
            login,
            logout,
        }),
        [user, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
