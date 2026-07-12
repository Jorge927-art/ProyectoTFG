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

/**
 * Lee el token JWT guardado en el navegador de forma aislada.
 */
export function readStoredToken(): string | null {
    if (!canUseBrowserStorage()) {
        return null;
    }
    return window.localStorage.getItem(TOKEN_KEY);
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

