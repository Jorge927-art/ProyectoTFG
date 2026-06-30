import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';
import { ROLES } from './authTypes';
import * as authStorage from './authStorage';

const TestComponent = () => {
    const { isAuthenticated } = useAuth();
    return (
        <div>
            <div data-testid="auth-status">{isAuthenticated ? 'AUTENTICADO' : 'NO_AUTENTICADO'}</div>
        </div>
    );
};

describe('Auditoría de Calidad Frontend: Blindaje de Sesión en AuthProvider', () => {

    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('Debería expulsar al usuario automáticamente (logout) mediante la Visibility API si la pestaña recupera el foco con el token ya expirado', () => {
        const now = Date.now();
        const expiresAt = now + (900 * 1000);

        const sessionUser = {
            userId: 42,
            username: 'alumno_tfg',
            role: ROLES.STUDENT,
            email: 'alumno@tfg.com',
            token: 'jwt_token_tfg_secret',
            expiresAt: expiresAt
        };

        // Auditoría NotebookLM: Mockeamos la lectura del almacenamiento para que inicie autenticado limpiamente
        vi.spyOn(authStorage, 'readStoredAuthUser').mockReturnValue(sessionUser);

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // El estado arranca autenticado de forma limpia y síncrona
        expect(screen.getByTestId('auth-status').textContent).toBe('AUTENTICADO');

        // Simulamos el paso de 20 minutos en un milisegundo (gracias a vi.advanceTimersByTime)
        act(() => {
            vi.advanceTimersByTime(20 * 60 * 1000);
        });

        // Forzar reactivación por Visibility API
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });

        // Verificación final: La sesión fantasma ha sido purgada con éxito
        expect(screen.getByTestId('auth-status').textContent).toBe('NO_AUTENTICADO');
    });
});
