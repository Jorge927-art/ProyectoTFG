import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';
import { ROLES } from './authTypes';
import * as authStorage from './authStorage';
import { fireEvent } from '@testing-library/dom';

const TestComponent = () => {
    const { isAuthenticated } = useAuth();
    return (
        <div>
            <div data-testid="auth-status">{isAuthenticated ? 'AUTENTICADO' : 'NO_AUTENTICADO'}</div>
        </div>
    );
};

describe('Auditoría de Calidad Frontend: Blindaje de Sesión y Activity Tracker [ADR-34]', () => {

    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.clearAllTimers();
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

        vi.spyOn(authStorage, 'readStoredAuthUser').mockReturnValue(sessionUser);

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        expect(screen.getByTestId('auth-status').textContent).toBe('AUTENTICADO');

        act(() => {
            vi.advanceTimersByTime(20 * 60 * 1000);
        });

        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });

        expect(screen.getByTestId('auth-status').textContent).toBe('NO_AUTENTICADO');
    });

    it('debe ejecutar logout automáticamente tras 15 minutos de inactividad absoluta [NotebookLM - Sin Interacción]', async () => {
        const now = Date.now();
        const expiresAt = now + 15 * 60 * 1000;
        const sessionUser = {
            userId: 42,
            username: 'Luis',
            role: ROLES.STUDENT,
            email: 'luis@tfg.com',
            token: 'jwt_token_tfg_secret',
            expiresAt: expiresAt
        };

        vi.spyOn(authStorage, 'readStoredAuthUser').mockReturnValue(sessionUser);

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        expect(screen.getByTestId('auth-status').textContent).toBe('AUTENTICADO');

        // Avanzamos el reloj 15 minutos y 5 segundos superando la frecuencia de muestreo del intervalo
        act(() => {
            vi.advanceTimersByTime(15 * 60 * 1000 + 5000);
        });

        expect(screen.getByTestId('auth-status').textContent).toBe('NO_AUTENTICADO');
    });

    it('debe posponer el expiresAt y mantener la sesión activa si el usuario registra interacciones en el DOM [NotebookLM - Activity Tracker]', async () => {
        const now = Date.now();
        const expiresAt = now + 15 * 60 * 1000;
        const sessionUser = {
            userId: 42,
            username: 'Luis',
            role: ROLES.STUDENT,
            email: 'luis@tfg.com',
            token: 'jwt_token_tfg_secret',
            expiresAt: expiresAt
        };

        vi.spyOn(authStorage, 'readStoredAuthUser').mockReturnValue(sessionUser);
        const spyWrite = vi.spyOn(authStorage, 'writeStoredAuthUser');

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // Simulamos el paso de 10 minutos de inactividad (quedarían 5 minutos antes de expirar)
        act(() => {
            vi.advanceTimersByTime(10 * 60 * 1000);
        });

        // El usuario interactúa: se simula un movimiento de ratón en la interfaz web
        act(() => {
            fireEvent.mouseMove(window);
        });

        // Dejamos pasar 2.5 segundos para satisfacer el throttle de la Ref del AuthProvider
        act(() => {
            vi.advanceTimersByTime(2500);
        });

        // Avanzamos el reloj otros 6 minutos (en el modelo absoluto antiguo aquí el usuario ya habría sido expulsado)
        act(() => {
            vi.advanceTimersByTime(6 * 60 * 1000);
        });

        // Verificamos que gracias al Activity Tracker la sesión sigue plenamente vigente y autenticada
        expect(screen.getByTestId('auth-status').textContent).toBe('AUTENTICADO');

        // Confirmamos que el sistema escribió la actualización en caliente en el almacenamiento local
        expect(spyWrite).toHaveBeenCalled();
    });
});
