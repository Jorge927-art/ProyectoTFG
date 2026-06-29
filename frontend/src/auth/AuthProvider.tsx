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
        // Corrección de Auditoría: Se consume directamente 'expiresIn' del contrato del Backend.
        const seconds = tokenData.expiresIn;

        // Calcular el instante exacto de expiración (15 min por defecto si falla o no viene el dato)
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
     * BLINDAJE TFG ESTRÉPITO (Auditoría NotebookLM): Desconexión Proactiva Anti-Congelación.
     * Combina verificación por visibilidad de pestaña e intervalos cortos para evitar la evasión de temporizadores.
     */
    useEffect(() => {
        const userWithExpiry = user as (AuthUser & { expiresAt?: number }) | null;

        if (!userWithExpiry || !userWithExpiry.expiresAt) return;

        const expiresAt = userWithExpiry.expiresAt;

        // Función centralizada para verificar si el token ya ha expirado
        const checkTokenExpiration = () => {
            if (Date.now() >= expiresAt) {
                console.warn("Sesión expirada proactivamente (Límite TTL alcanzado).");
                logout();
                return true;
            }
            return false;
        };

        // 1. Control instantáneo al montar el efecto o cambiar el usuario
        if (checkTokenExpiration()) return;

        // 2. Control reactivo cuando el usuario cambia de pestaña y regresa (Evita congelación del navegador)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkTokenExpiration();
            }
        };

        // 3. Verificación cíclica a intervalos cortos (Frecuencia de muestreo segura cada 5 segundos)
        const intervalId = setInterval(() => {
            checkTokenExpiration();
        }, 5000);

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Limpieza de listeners e intervalos al desmontar el efecto
        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
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
