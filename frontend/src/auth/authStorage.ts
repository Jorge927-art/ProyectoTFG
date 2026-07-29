import type { AuthUser } from './authTypes';

// [CORRECCIÓN CRÍTICA DE AUDITORÍA]: Unificamos bajo una única clave oficial eliminando la duplicidad física
const USER_KEY = 'auth_user'; 
const TOKEN_KEY = 'accessToken'; 

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


function canUseBrowserStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split('.');
        if (parts.length < 2) {
            return null;
        }

        const payloadPart = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padLength = (4 - (payloadPart.length % 4)) % 4;
        const padded = payloadPart + '='.repeat(padLength);

        if (typeof atob !== 'function') {
            return null;
        }

        const jsonPayload = atob(padded);
        const parsed = JSON.parse(jsonPayload);
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

function isTokenAlignedWithStoredUser(token: string, user: AuthUser): boolean {
    const payload = decodeJwtPayload(token);
    if (!payload) {
        return true;
    }

    const tokenUserId = typeof payload.userId === 'number' ? payload.userId : null;
    const tokenUsername = typeof payload.sub === 'string' ? payload.sub.trim().toLowerCase() : null;
    const tokenEmail = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null;

    if (typeof user.userId === 'number' && tokenUserId !== null) {
        return user.userId === tokenUserId;
    }

    const normalizedStoredUsername = typeof user.username === 'string' ? user.username.trim().toLowerCase() : '';
    const normalizedStoredEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';

    if (tokenUsername && normalizedStoredUsername) {
        return tokenUsername === normalizedStoredUsername;
    }

    if (tokenEmail && normalizedStoredEmail) {
        return tokenEmail === normalizedStoredEmail;
    }

    return true;
}

function extractTokenFromStoredUser(): string | null {
    if (!canUseBrowserStorage()) {
        return null;
    }

    const rawValue = window.localStorage.getItem(USER_KEY) ?? window.localStorage.getItem('user');
    if (!rawValue) {
        return null;
    }

    try {
        const parsedValue = JSON.parse(rawValue) as Record<string, unknown>;
        const tokenCandidate =
            typeof parsedValue.token === 'string'
                ? parsedValue.token
                : typeof parsedValue.accessToken === 'string'
                    ? parsedValue.accessToken
                    : typeof parsedValue.access_token === 'string'
                        ? parsedValue.access_token
                        : '';
        const token = tokenCandidate.trim();
        return token.length > 0 ? token : null;
    } catch {
        return null;
    }
}

/**
 * Lee el token JWT guardado en el navegador de forma aislada.
 */
export function readStoredToken(): string | null {
    if (!canUseBrowserStorage()) {
        return null;
    }

    const persistedToken = window.localStorage.getItem(TOKEN_KEY);
    const userEmbeddedToken = extractTokenFromStoredUser();

    // Si existe token embebido en auth_user y no coincide con accessToken, sincronizamos.
    if (userEmbeddedToken && userEmbeddedToken !== persistedToken) {
        window.localStorage.setItem(TOKEN_KEY, userEmbeddedToken);
        return userEmbeddedToken;
    }

    if (persistedToken && persistedToken.trim().length > 0) {
        return persistedToken;
    }

    // Fallback de compatibilidad: si no existe accessToken, usamos auth_user.token.
    if (userEmbeddedToken) {
        window.localStorage.setItem(TOKEN_KEY, userEmbeddedToken);
        return userEmbeddedToken;
    }

    return null;
}

/**
 * Persiste el token de acceso JWT en el navegador de forma segura.
 */
export function writeStoredToken(token: string) {
    if (!canUseBrowserStorage()) {
        return;
    }
    window.localStorage.setItem(TOKEN_KEY, token);
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

        // 🛡️ BLINDAJE TFG: Si existe el sello de tiempo y la hora actual superó la expiración, destruimos la sesión
        if (parsedValue.expiresAt && Date.now() > parsedValue.expiresAt) {
            console.warn("Sesión local caducada por límite temporal. Limpiando almacenamiento.");
            clearStoredAuth();
            return null; 
        }

        const normalizedUser = {
            ...parsedValue,
            username: parsedValue.username,
            interests: normalizeInterests((parsedValue as Record<string, unknown>).interests),
        } as AuthUser;

        const tokenToValidate = readStoredToken();
        if (tokenToValidate && !isTokenAlignedWithStoredUser(tokenToValidate, normalizedUser)) {
            console.warn('Sesión inconsistente detectada (usuario/token desalineados). Limpiando almacenamiento.');
            clearStoredAuth();
            return null;
        }

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
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));

    // Mantiene sincronizado el bearer token para los interceptores HTTP.
    if (typeof user.token === 'string' && user.token.trim().length > 0) {
        window.localStorage.setItem(TOKEN_KEY, user.token);
    }
}

/**
 * Elimina completamente los rastros de la sesión (Usuario y JWT) al cerrar sesión.
 */
export function clearStoredAuth() {
    if (!canUseBrowserStorage()) {
        return;
    }
    // Borra la clave oficial, la del token y ejecuta la purga reactiva de la clave antigua legacy
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(TOKEN_KEY); 
    window.localStorage.removeItem('user'); // <── Purga preventiva de la clave legacy 'user'
}
