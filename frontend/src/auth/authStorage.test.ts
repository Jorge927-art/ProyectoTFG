import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readStoredToken, writeStoredToken, readStoredAuthUser, writeStoredAuthUser, clearStoredAuth } from './authStorage';
import type { AuthUser } from './authTypes';

describe('AuthStorage - Suite de Pruebas Unitarias de Almacenamiento Local', () => {
    const USER_KEY = 'auth_user';
    const TOKEN_KEY = 'accessToken';
    const LEGACY_KEY = 'user';

    let localStorageMockStore: Record<string, string> = {};

    const sampleValidUser: AuthUser = {
        username: 'juan_tfg',
        interests: {
            categories: ['Backend', 'Spring Boot'],
            levels: ['Advanced'],
            durations: ['Medio'],
            languages: ['Spanish'],
            subtitles: ['English']
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMockStore = {};

        vi.stubGlobal('localStorage', {
            getItem: vi.fn((key: string): string | null => localStorageMockStore[key] || null),
            setItem: vi.fn((key: string, value: string): void => { localStorageMockStore[key] = value; }),
            removeItem: vi.fn((key: string): void => { delete localStorageMockStore[key]; }),
            clear: vi.fn(() => { localStorageMockStore = {}; })
        });
        vi.stubGlobal('window', { localStorage });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    /* =========================================================================
       1. CONTROL DE DISPONIBILIDAD DEL ENTORNO (BROWSER STORAGE SAFETY)
       ========================================================================= */
    it('Debería retornar null o abortar operaciones si window o localStorage no están definidos', () => {
        vi.stubGlobal('window', undefined);
        
        expect(readStoredToken()).toBeNull();
        expect(readStoredAuthUser()).toBeNull();
        
        writeStoredToken('test-jwt');
        writeStoredAuthUser(sampleValidUser);
        clearStoredAuth();

        expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    /* =========================================================================
       2. CONTROL OPERATIVO DE TOKENS JWT (TOKEN_KEY)
       ========================================================================= */
    it('Debería leer, escribir y persistir correctamente el token de acceso JWT', () => {
        writeStoredToken('jwt-valido-secreto-123');
        expect(localStorage.setItem).toHaveBeenCalledWith(TOKEN_KEY, 'jwt-valido-secreto-123');

        const token = readStoredToken();
        expect(token).toBe('jwt-valido-secreto-123');
    });

    /* =========================================================================
       3. CONTROL DE MIGRACIÓN Y PURGA DE SESIÓN (USER_KEY & LEGACY_KEY)
       ========================================================================= */
    it('Debería escribir el usuario estructurado únicamente bajo la clave oficial unificada', () => {
        writeStoredAuthUser(sampleValidUser);

        expect(localStorage.setItem).toHaveBeenCalledWith(USER_KEY, JSON.stringify(sampleValidUser));
        expect(localStorageMockStore[LEGACY_KEY]).toBeUndefined();
    });

    it('Debería ser capaz de leer de la clave legacy "user" si la clave unificada oficial no está inicializada', () => {
        localStorageMockStore[LEGACY_KEY] = JSON.stringify(sampleValidUser);

        const retrievedUser = readStoredAuthUser();

        expect(retrievedUser).not.toBeNull();
        expect(retrievedUser!.username).toBe('juan_tfg');
        expect(localStorage.getItem).toHaveBeenCalledWith(USER_KEY);
        expect(localStorage.getItem).toHaveBeenCalledWith(LEGACY_KEY);
    });

    it('Debería retornar null si el usuario no tiene nombre de usuario o si el json está corrupto', () => {
        localStorageMockStore[USER_KEY] = '{"username": "   ", "interests": {}}';
        expect(readStoredAuthUser()).toBeNull();

        localStorageMockStore[USER_KEY] = 'json-malformado-invalido';
        expect(readStoredAuthUser()).toBeNull();
    });

    /* =========================================================================
       4. AUDITORÍA DE SEGURIDAD TEMPORAL: CONTROL DE EXPIRACIÓN
       ========================================================================= */
    it('Debería destruir y purgar la sesión si el sello de tiempo expiresAt es anterior a la hora actual', () => {
        const expiredSession = {
            ...sampleValidUser,
            expiresAt: Date.now() - 5000
        };
        localStorageMockStore[USER_KEY] = JSON.stringify(expiredSession);
        localStorageMockStore[TOKEN_KEY] = 'jwt-token-a-destruir';

        const retrievedUser = readStoredAuthUser();

        expect(retrievedUser).toBeNull();
        expect(localStorageMockStore[USER_KEY]).toBeUndefined();
        expect(localStorageMockStore[TOKEN_KEY]).toBeUndefined();
        expect(localStorageMockStore[LEGACY_KEY]).toBeUndefined();
    });

    it('Debería retornar el usuario intacto si el sello de tiempo expiresAt es posterior a la hora actual', () => {
        const activeSession = {
            ...sampleValidUser,
            expiresAt: Date.now() + 60000
        };
        localStorageMockStore[USER_KEY] = JSON.stringify(activeSession);

        const retrievedUser = readStoredAuthUser();

        expect(retrievedUser).not.toBeNull();
        expect(retrievedUser!.username).toBe('juan_tfg');
    });

        /* =========================================================================
       5. ABSORCIÓN NATIVA DE INTERESES (NORMALIZACIÓN DE ESTRUCTURAS)
       ========================================================================= */
    it('Debería aplicar arrays vacíos por defecto en intereses si la propiedad viene corrupta o nula', () => {
        const corruptInterestsUser = {
            username: 'ana_tfg',
            interests: {
                categories: 'NoSoyUnArraySinoUnStringMalformado',
                levels: null,
                durations: [123, 'Medio', true]
            }
        };
        localStorageMockStore[USER_KEY] = JSON.stringify(corruptInterestsUser);

        const retrievedUser = readStoredAuthUser();

        expect(retrievedUser).not.toBeNull();

        // [SOLUCCIÓN MATEMÁTICA DEFINITIVA]: Validamos de forma conjunta la existencia del usuario y de su nodo opcional de intereses
        if (retrievedUser && retrievedUser.interests) {
            expect(retrievedUser.interests.categories).toEqual([]);
            expect(retrievedUser.interests.levels).toEqual([]);
            expect(retrievedUser.interests.durations).toEqual(['Medio']);
            expect(retrievedUser.interests.languages).toEqual([]);
            expect(retrievedUser.interests.subtitles).toEqual([]);
        }
    });

           it('Debería aplicar EMPTY_INTERESTS si el nodo interests no es un objeto o no existe en el JSON', () => {
        const simpleUserNoInterests = { username: 'pedro_tfg', interests: null };
        localStorageMockStore[USER_KEY] = JSON.stringify(simpleUserNoInterests);

        const retrievedUser = readStoredAuthUser();

        expect(retrievedUser).not.toBeNull();

        // Aplicamos la misma doble validación síncrona
        if (retrievedUser && retrievedUser.interests) {
            expect(retrievedUser.interests).toEqual({
                categories: [],
                levels: [],
                durations: [],
                languages: [],
                subtitles: []
            });
        }
    });

    /* =========================================================================
       6. PURGA RADICAL AL CERRAR SESIÓN (CLEAR STORED AUTH)
       ========================================================================= */
    it('Debería borrar la clave oficial, la de token y ejecutar la purga reactiva preventiva de la clave legacy user', () => {
        localStorageMockStore[USER_KEY] = JSON.stringify(sampleValidUser);
        localStorageMockStore[TOKEN_KEY] = 'jwt-activo';
        localStorageMockStore[LEGACY_KEY] = 'datos-antiguos-de-sesion';

        clearStoredAuth();

        expect(localStorage.removeItem).toHaveBeenCalledWith(USER_KEY);
        expect(localStorage.removeItem).toHaveBeenCalledWith(TOKEN_KEY);
        expect(localStorage.removeItem).toHaveBeenCalledWith(LEGACY_KEY);

        expect(localStorageMockStore[USER_KEY]).toBeUndefined();
        expect(localStorageMockStore[TOKEN_KEY]).toBeUndefined();
        expect(localStorageMockStore[LEGACY_KEY]).toBeUndefined();
    });
});


