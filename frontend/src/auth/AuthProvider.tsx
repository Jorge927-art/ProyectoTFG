import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser, AuthTokenResponse } from './authTypes';
import { AuthContext } from './AuthContext';
import { clearStoredAuth, readStoredAuthUser, writeStoredAuthUser, writeStoredToken } from './authStorage';
import { resolveAvatarUrl } from './avatarUrl';

interface AuthProviderProps {
    children: ReactNode;
}

// Constante de inactividad: 15 minutos en milisegundos (Exigencia de Auditoría)
const INACTIVITY_LIFESPAN_MS = 15 * 60 * 1000;

const EMPTY_INTERESTS = {
    categories: [] as string[],
    levels: [] as string[],
    durations: [] as string[],
    languages: [] as string[],
    subtitles: [] as string[],
};

function normalizeInterestArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeInterests(interests: unknown) {
    if (!interests || typeof interests !== 'object') {
        return EMPTY_INTERESTS;
    }

    const source = interests as Record<string, unknown>;
    return {
        categories: normalizeInterestArray(source.categories),
        levels: normalizeInterestArray(source.levels),
        durations: normalizeInterestArray(source.durations),
        languages: normalizeInterestArray(source.languages),
        subtitles: normalizeInterestArray(source.subtitles),
    };
}

/**
 * Provider global de autenticación adaptado para JWT con Activity Tracker [ADR-34].
 * Convierte el estado de autenticación y el token en la fuente de verdad de la SPA.
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
    // Estado de usuario autenticado, inicializado desde el almacenamiento local
    const [user, setUser] = useState<AuthUser | null>(() => readStoredAuthUser());

    // Ref inicializada de forma pura con 0 para satisfacer las reglas de compilación estricta
    const lastActivityRef = useRef<number>(0);

    // Inicialización segura del timestamp del marcador al montar el componente en el navegador
    useEffect(() => {
        lastActivityRef.current = Date.now();
    }, []);

    /**
     * Cierra la sesión del usuario limpiando el estado y el almacenamiento.
     */
    const logout = useCallback(() => {
        setUser(null);
        clearStoredAuth();
    }, []);

    /**
     * Resetea el temporizador de inactividad actualizando el instante de expiración en caliente [ADR-34]
     */
    const resetInactivityTimeout = useCallback(() => {
        const now = Date.now();
        // Throttle de 2 segundos: Evita actualizar el estado de React de forma masiva en mousemove concurrentes
        if (now - lastActivityRef.current < 2000) return;

        lastActivityRef.current = now;

        setUser((currentUser) => {
            if (!currentUser) return null;

            const updatedUser = {
                ...currentUser,
                expiresAt: now + INACTIVITY_LIFESPAN_MS
            };

            // Sincronizamos en el storage para que si recarga la pestaña se mantenga el tiempo ganado
            writeStoredAuthUser(updatedUser);
            return updatedUser;
        });
    }, []);

    /**
     * Procesa el inicio de sesión con JWT e hidrata los metadatos de sesión.
     */
    const login = (tokenData: AuthTokenResponse) => {
        // Corrección de Auditoría: Se consume directamente 'expiresIn' del contrato del Backend.
        const seconds = tokenData.expiresIn;

        // Punto de partida inicial: 15 min por defecto si falla o no viene el dato
        const lifespanMs = (typeof seconds === 'number' && seconds > 0) ? seconds * 1000 : INACTIVITY_LIFESPAN_MS;
        const expiresAt = Date.now() + lifespanMs;

        // Extraer los datos e inyectar el sello de caducidad y el array de cursos matriculados
        const nextUser: AuthUser & { expiresAt: number } = {
            userId: tokenData.userId,
            username: tokenData.username,
            role: tokenData.role,
            email: tokenData.email,
            enrolledCourseIds: tokenData.enrolledCourseIds || [],
            interests: normalizeInterests(tokenData.interests),
            photo: resolveAvatarUrl(tokenData.avatarPath),
            token: tokenData.accessToken,
            expiresAt: expiresAt
        };

        lastActivityRef.current = Date.now();
        setUser(nextUser);
        writeStoredAuthUser(nextUser);
        writeStoredToken(tokenData.accessToken);
    };

    /**
     * Actualiza parcialmente la sesión activa sin romper el resto de metadatos.
     */
    const updateUser = useCallback((updates: Partial<AuthUser>) => {
        setUser((currentUser) => {
            if (!currentUser) return null;

            const updatedUser = {
                ...currentUser,
                ...updates,
            };

            writeStoredAuthUser(updatedUser);
            return updatedUser;
        });
    }, []);

    /**
     * MONITOR DE ACTIVIDAD GLOBAL DEL USUARIO (DOM LISTENERS) [ADR-34]
     * Captura las interacciones humanas reales para posponer de forma transparente la expulsión.
     */
    useEffect(() => {
        if (!user) return;

        window.addEventListener('mousemove', resetInactivityTimeout);
        window.addEventListener('keydown', resetInactivityTimeout);
        window.addEventListener('click', resetInactivityTimeout);
        window.addEventListener('scroll', resetInactivityTimeout);

        return () => {
            window.removeEventListener('mousemove', resetInactivityTimeout);
            window.removeEventListener('keydown', resetInactivityTimeout);
            window.removeEventListener('click', resetInactivityTimeout);
            window.removeEventListener('scroll', resetInactivityTimeout);
        };
    }, [user, resetInactivityTimeout]);

    /**
     * BLINDAJE TFG ESTRÉPITO (Auditoría NotebookLM): Desconexión Proactiva Anti-Congelación.
     * Evalúa el timestamp "expiresAt" dinámico mutado por el monitor de actividad.
     */
    useEffect(() => {
        const userWithExpiry = user as (AuthUser & { expiresAt?: number }) | null;

        if (!userWithExpiry || !userWithExpiry.expiresAt) return;

        const checkTokenExpiration = () => {
            if (Date.now() >= userWithExpiry.expiresAt!) {
                console.warn("Sesión expirada por inactividad prolongada (Límite 15m alcanzado).");
                logout();
                return true;
            }
            return false;
        };

        if (checkTokenExpiration()) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkTokenExpiration();
            }
        };

        const intervalId = setInterval(() => {
            checkTokenExpiration();
        }, 5000);

        document.addEventListener('visibilitychange', handleVisibilityChange);

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
            updateUser,
            logout,
        }),
        [user, logout, updateUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
