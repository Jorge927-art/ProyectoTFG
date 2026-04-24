import type { AuthUser } from './authTypes';

const STORAGE_KEY = 'user';

function canUseBrowserStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Lee la sesión guardada en el navegador.
 *
 * Este helper existe para concentrar toda la lógica de parseo y validación
 * de localStorage en un solo sitio.
 */
export function readStoredAuthUser(): AuthUser | null {
    if (!canUseBrowserStorage()) {
        return null;
    }

    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
        return null;
    }

    try {
        const parsedValue = JSON.parse(rawValue) as Partial<AuthUser>;

        if (typeof parsedValue.username !== 'string' || !parsedValue.username.trim()) {
            return null;
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
 * Persiste el usuario autenticado.
 *
 * Aunque el estado principal vive en React, localStorage permite restaurar
 * la sesión al recargar la página.
 */
export function writeStoredAuthUser(user: AuthUser) {
    if (!canUseBrowserStorage()) {
        return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

/**
 * Elimina la sesión persistida al cerrar sesión.
 */
export function clearStoredAuthUser() {
    if (!canUseBrowserStorage()) {
        return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
}
