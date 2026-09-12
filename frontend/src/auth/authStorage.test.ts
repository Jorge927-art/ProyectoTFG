import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearStoredAuth,
    readStoredAuthUser,
    readStoredRefreshToken,
    readStoredToken,
    writeStoredAuthUser,
    writeStoredRefreshToken,
    writeStoredToken,
} from './authStorage';
import type { AuthUser } from './authTypes';

describe('AuthStorage - metadata persistida y credenciales no persistentes', () => {
    let store: Record<string, string> = {};
    const user: AuthUser = { username: 'alumno', role: 'STUDENT' };

    beforeEach(() => {
        vi.clearAllMocks();
        store = {};
        vi.stubGlobal('localStorage', {
            getItem: vi.fn((key: string) => store[key] ?? null),
            setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
            removeItem: vi.fn((key: string) => { delete store[key]; }),
        });
        vi.stubGlobal('window', { localStorage });
        clearStoredAuth();
    });

    afterEach(() => vi.unstubAllGlobals());

    it('mantiene el access token únicamente en memoria', () => {
        writeStoredToken('access-memory');
        expect(readStoredToken()).toBe('access-memory');
        expect(store).not.toHaveProperty('accessToken');
    });

    it('nunca expone ni persiste el refresh token desde JavaScript', () => {
        writeStoredRefreshToken('refresh-secret');
        expect(readStoredRefreshToken()).toBeNull();
        expect(store).not.toHaveProperty('refreshToken');
    });

    it('persiste metadata de usuario pero elimina tokens embebidos', () => {
        writeStoredAuthUser({ ...user, token: 'access-secret', refreshToken: 'refresh-secret' });
        expect(JSON.parse(store.auth_user)).toEqual(user);
        expect(store).not.toHaveProperty('accessToken');
        expect(store).not.toHaveProperty('refreshToken');
    });

    it('hidrata metadata aunque el expiresAt antiguo haya pasado', () => {
        store.auth_user = JSON.stringify({ ...user, expiresAt: Date.now() - 1000 });
        expect(readStoredAuthUser()?.username).toBe('alumno');
    });

    it('purga metadata y memoria al cerrar sesión', () => {
        writeStoredToken('access-memory');
        writeStoredAuthUser(user);
        store.user = JSON.stringify(user);
        clearStoredAuth();
        expect(readStoredToken()).toBeNull();
        expect(store).not.toHaveProperty('auth_user');
        expect(store).not.toHaveProperty('user');
    });

    it('es seguro cuando no existe window', () => {
        vi.stubGlobal('window', undefined);
        expect(readStoredAuthUser()).toBeNull();
        writeStoredToken('access-memory');
        expect(readStoredToken()).toBe('access-memory');
    });
});
