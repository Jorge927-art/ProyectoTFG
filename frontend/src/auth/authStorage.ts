import type { AuthUser } from './authTypes';

// [CORRECCIÓN CRÍTICA DE AUDITORÍA]: Unificamos bajo una única clave oficial eliminando la duplicidad física
const USER_KEY = 'auth_user'; 
let inMemoryAccessToken: string | null = null;
const LEGACY_TOKEN_KEYS = ['token', 'accessToken', 'access_token', 'refreshToken', 'refresh_token'] as const;

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

function stripLegacyTokens(user: Partial<AuthUser>) {
    const safeUser = { ...user } as Record<string, unknown>;
    const hadLegacyToken = LEGACY_TOKEN_KEYS.some((key) => Boolean(safeUser[key]));

    LEGACY_TOKEN_KEYS.forEach((key) => {
        delete safeUser[key];
    });

    return { safeUser, hadLegacyToken };
}


function canUseBrowserStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readStoredToken(): string | null {
    return inMemoryAccessToken;
}

export function writeStoredToken(token: string) {
    const normalized = typeof token === 'string' ? token.trim() : '';
    inMemoryAccessToken = normalized.length > 0 ? normalized : null;
}

export function readStoredRefreshToken(): string | null {
    // El refresh token vive en una cookie HttpOnly y nunca se expone a JavaScript.
    return null;
}

export function writeStoredRefreshToken(token: string) {
    void token;
}

/**
 * Lee la sesión del usuario guardada en el navegador validando estrictamente su tiempo de expiración.
 */
export function readStoredAuthUser(): AuthUser | null {
    if (!canUseBrowserStorage()) {
        return null;
    }

    // Intenta leer de la clave unificada 'auth_user' o de la clave legacy antigua 'user' por migración
    const rawValue = window.localStorage.getItem(USER_KEY) ?? window.localStorage.getItem('user');
    if (!rawValue) {
        return null;
    }

    try {
        const parsedValue = JSON.parse(rawValue) as Partial<AuthUser> & { expiresAt?: number };

        if (typeof parsedValue.username !== 'string' || !parsedValue.username.trim()) {
            return null;
        }

        const { safeUser: safeStoredUser, hadLegacyToken } = stripLegacyTokens(parsedValue);
        if (hadLegacyToken) {
            window.localStorage.setItem(USER_KEY, JSON.stringify(safeStoredUser));
            window.localStorage.removeItem('accessToken');
            window.localStorage.removeItem('refreshToken');
        }
        const normalizedUser = {
            ...safeStoredUser,
            username: parsedValue.username,
            interests: normalizeInterests((parsedValue as Record<string, unknown>).interests),
        } as AuthUser;

        return normalizedUser;
    } catch {
        return null;
    }
}

/**
 * Persiste el usuario autenticado bajo la clave oficial unificada.
 */
export function writeStoredAuthUser(user: AuthUser) {
    if (!canUseBrowserStorage()) {
        return;
    }
    // Escribe únicamente en la fuente de verdad oficial ('auth_user')
    const { safeUser } = stripLegacyTokens(user);
    window.localStorage.setItem(USER_KEY, JSON.stringify(safeUser));

    // Los tokens no se serializan: access vive en memoria y refresh en cookie HttpOnly.
}

/**
 * Elimina completamente los rastros de la sesión (Usuario y JWT) al cerrar sesión.
 */
export function clearStoredAuth() {
    if (!canUseBrowserStorage()) {
        return;
    }
    inMemoryAccessToken = null;
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('refreshToken');
    window.localStorage.removeItem('user'); // <── Purga preventiva de la clave legacy 'user'
}
