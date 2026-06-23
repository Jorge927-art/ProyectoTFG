import type { AuthUser } from './authTypes';

const USER_KEY = 'user';
const TOKEN_KEY = 'accessToken'; // Nueva clave para persistir el JWT de forma aislada


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

    const rawValue = window.localStorage.getItem(USER_KEY);
    if (!rawValue) {
        return null;
    }

    try {
        // Añadimos de forma segura la propiedad opcional expiresAt al parsear
        const parsedValue = JSON.parse(rawValue) as Partial<AuthUser> & { expiresAt?: number };

        if (typeof parsedValue.username !== 'string' || !parsedValue.username.trim()) {
            return null;
        }

        // 🛡️ BLINDAJE TFG: Si existe el sello de tiempo y la hora actual superó la expiración, destruimos la sesión
        if (parsedValue.expiresAt && Date.now() > parsedValue.expiresAt) {
            console.warn("Sesión local caducada por límite temporal. Limpiando almacenamiento.");
            clearStoredAuth();
            return null; // Forzamos a React a inicializarse como no autenticado
        }

        return {
            ...parsedValue,
            username: parsedValue.username,
        } as AuthUser;
    } catch {
        return null;
    }
}

/**
 * Persiste el usuario autenticado junto con su estructura básica de datos.
 */
export function writeStoredAuthUser(user: AuthUser) {
    if (!canUseBrowserStorage()) {
        return;
    }

    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Elimina completamente los rastros de la sesión (Usuario y JWT) al cerrar sesión.
 */
export function clearStoredAuth() {
    if (!canUseBrowserStorage()) {
        return;
    }
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(TOKEN_KEY); // Limpieza absoluta del token
}
