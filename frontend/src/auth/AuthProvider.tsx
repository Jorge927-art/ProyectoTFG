import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser, AuthTokenResponse } from './authTypes';
import { AuthContext } from './AuthContext';
import {
    clearStoredAuth,
    readStoredAuthUser,
    writeStoredAuthUser,
    writeStoredToken
} from './authStorage';
import { resolveAvatarUrl } from './avatarUrl';
import { apiClient, refreshAccessToken } from '../services/apiClient';

interface AuthProviderProps {
    children: ReactNode;
}

const DEFAULT_ACCESS_TOKEN_LIFESPAN_MS = 15 * 60 * 1000;

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
    const [isLoading, setIsLoading] = useState(true);
    const refreshInFlightRef = useRef(false);

    /**
     * Cierra la sesión del usuario limpiando el estado y el almacenamiento.
     */
    const logout = useCallback(() => {
        void Promise.resolve(apiClient.post?.('/api/auth/logout')).catch(() => undefined);
        setUser(null);
        clearStoredAuth();
    }, []);

    /**
     * Procesa el inicio de sesión con JWT e hidrata los metadatos de sesión.
     */
    const login = (tokenData: AuthTokenResponse) => {
        // Corrección de Auditoría: Se consume directamente 'expiresIn' del contrato del Backend.
        const seconds = tokenData.expiresIn;

        // Punto de partida inicial: 15 min por defecto si falla o no viene el dato
        const lifespanMs = (typeof seconds === 'number' && seconds > 0) ? seconds * 1000 : DEFAULT_ACCESS_TOKEN_LIFESPAN_MS;
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
            expiresAt
        };

        setUser(nextUser);
        setIsLoading(false);
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

    useEffect(() => {
        const refreshSilently = async () => {
            if (refreshInFlightRef.current) return false;
            refreshInFlightRef.current = true;
            try {
                const result = await refreshAccessToken();
                if (!result?.accessToken) return false;
                const expiresIn = typeof result.expiresIn === 'number' && result.expiresIn > 0
                    ? result.expiresIn * 1000
                    : DEFAULT_ACCESS_TOKEN_LIFESPAN_MS;
                setUser((currentUser) => {
                    if (!currentUser) return currentUser;
                    const updatedUser = { ...currentUser, expiresAt: Date.now() + expiresIn };
                    writeStoredAuthUser(updatedUser);
                    return updatedUser;
                });
                return true;
            } finally {
                refreshInFlightRef.current = false;
            }
        };

        const checkTokenExpiration = () => {
            const expiresAt = (user as (AuthUser & { expiresAt?: number }) | null)?.expiresAt;
            if (!expiresAt || Date.now() < expiresAt) return;
            void refreshSilently().then((renewed) => {
                if (!renewed) logout();
            });
        };

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

    useEffect(() => {
        const bootstrap = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }
            const result = await refreshAccessToken();
            if (!result?.accessToken) {
                logout();
            } else {
                const expiresIn = typeof result.expiresIn === 'number' && result.expiresIn > 0
                    ? result.expiresIn * 1000
                    : DEFAULT_ACCESS_TOKEN_LIFESPAN_MS;
                setUser((currentUser) => {
                    if (!currentUser) return currentUser;
                    const updatedUser = { ...currentUser, expiresAt: Date.now() + expiresIn };
                    writeStoredAuthUser(updatedUser);
                    return updatedUser;
                });
            }
            setIsLoading(false);
        };
        void bootstrap();
        // Solo se ejecuta una vez para recuperar la sesión tras recarga.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handleSessionRefreshed = (event: Event) => {
            const expiresIn = (event as CustomEvent<{ expiresIn?: number }>).detail?.expiresIn;
            const lifespan = typeof expiresIn === 'number' && expiresIn > 0
                ? expiresIn * 1000
                : DEFAULT_ACCESS_TOKEN_LIFESPAN_MS;
            setUser((currentUser) => {
                if (!currentUser) return currentUser;
                const updatedUser = { ...currentUser, expiresAt: Date.now() + lifespan };
                writeStoredAuthUser(updatedUser);
                return updatedUser;
            });
        };
        window.addEventListener('auth-session-refreshed', handleSessionRefreshed);
        return () => window.removeEventListener('auth-session-refreshed', handleSessionRefreshed);
    }, []);

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
            isLoading,
            login,
            updateUser,
            logout,
        }),
        [user, isLoading, logout, updateUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
