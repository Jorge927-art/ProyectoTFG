import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';
import { ROLES } from './authTypes';
import * as authStorage from './authStorage';
import { fireEvent } from '@testing-library/dom';
import type { AuthTokenResponse } from './authTypes';

const TestComponent = () => {
    const { isAuthenticated } = useAuth();
    return (
        <div>
            <div data-testid="auth-status">{isAuthenticated ? 'AUTENTICADO' : 'NO_AUTENTICADO'}</div>
        </div>
    );
};

const AuthActionsHarness = ({ tokenData }: { tokenData: AuthTokenResponse }) => {
    const { isAuthenticated, user, login, updateUser, logout } = useAuth();

    return (
        <div>
            <div data-testid="auth-status">{isAuthenticated ? 'AUTENTICADO' : 'NO_AUTENTICADO'}</div>
            <div data-testid="username">{user?.username ?? 'sin_usuario'}</div>
            <div data-testid="email">{user?.email ?? 'sin_email'}</div>
            <div data-testid="categories">{user?.interests?.categories.join(',') ?? 'sin_intereses'}</div>
            <div data-testid="durations">{user?.interests?.durations.join(',') ?? 'sin_duraciones'}</div>
            <div data-testid="course-count">{String(user?.enrolledCourseIds?.length ?? 0)}</div>
            <button type="button" onClick={() => login(tokenData)}>login</button>
            <button type="button" onClick={() => updateUser({ email: 'actualizado@tfg.com' })}>update</button>
            <button type="button" onClick={logout}>logout</button>
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

    it('debe invalidar sesión al montar si el token almacenado ya está expirado', async () => {
        const now = Date.now();
        const expiredSessionUser = {
            userId: 77,
            username: 'token_expirado',
            role: ROLES.STUDENT,
            email: 'expirado@tfg.com',
            token: 'jwt_expired',
            expiresAt: now - 1000
        };

        vi.spyOn(authStorage, 'readStoredAuthUser').mockReturnValue(expiredSessionUser);

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        act(() => {
            vi.advanceTimersByTime(1);
        });

        expect(screen.getByTestId('auth-status').textContent).toBe('NO_AUTENTICADO');
    });

    it('debe cerrar sesión cuando falla la validación/refresh y se emite auth-session-expired', async () => {
        const now = Date.now();
        const validSessionUser = {
            userId: 42,
            username: 'luis_refresh',
            role: ROLES.STUDENT,
            email: 'luis@tfg.com',
            token: 'jwt_token_valido',
            expiresAt: now + 15 * 60 * 1000
        };

        vi.spyOn(authStorage, 'readStoredAuthUser').mockReturnValue(validSessionUser);

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        expect(screen.getByTestId('auth-status').textContent).toBe('AUTENTICADO');

        act(() => {
            window.dispatchEvent(new Event('auth-session-expired'));
        });

        expect(screen.getByTestId('auth-status').textContent).toBe('NO_AUTENTICADO');
    });

    it('debe procesar login con expiresIn inválido, normalizar intereses y omitir refresh token vacío', () => {
        vi.spyOn(authStorage, 'readStoredAuthUser').mockReturnValue(null);
        const writeUserSpy = vi.spyOn(authStorage, 'writeStoredAuthUser');
        const writeTokenSpy = vi.spyOn(authStorage, 'writeStoredToken');
        const writeRefreshSpy = vi.spyOn(authStorage, 'writeStoredRefreshToken');

        const tokenData = {
            accessToken: 'jwt-login-1',
            refreshToken: '   ',
            tokenType: 'Bearer',
            expiresIn: 0,
            userId: 91,
            username: 'nuevo_usuario',
            role: ROLES.STUDENT,
            email: 'nuevo@tfg.com',
            enrolledCourseIds: undefined,
            avatarPath: null,
            interests: {
                categories: 'no-array',
                durations: ['Corto', 99],
            },
        } as unknown as AuthTokenResponse;

        render(
            <AuthProvider>
                <AuthActionsHarness tokenData={tokenData} />
            </AuthProvider>
        );

        act(() => {
            fireEvent.click(screen.getByText('login'));
        });

        expect(screen.getByTestId('auth-status').textContent).toBe('AUTENTICADO');
        expect(screen.getByTestId('username').textContent).toBe('nuevo_usuario');
        expect(screen.getByTestId('email').textContent).toBe('nuevo@tfg.com');
        expect(screen.getByTestId('categories').textContent).toBe('');
        expect(screen.getByTestId('durations').textContent).toBe('Corto');
        expect(screen.getByTestId('course-count').textContent).toBe('0');
        expect(writeUserSpy).toHaveBeenCalled();
        expect(writeTokenSpy).toHaveBeenCalledWith('jwt-login-1');
        expect(writeRefreshSpy).not.toHaveBeenCalled();
    });

    it('debe fusionar updateUser cuando hay sesión activa y persistir el resultado', () => {
        const now = Date.now();
        const sessionUser = {
            userId: 7,
            username: 'merge_user',
            role: ROLES.STUDENT,
            email: 'antes@tfg.com',
            token: 'jwt_merge',
            expiresAt: now + 900000,
            interests: { categories: [], levels: [], durations: [], languages: [], subtitles: [] },
        };

        vi.spyOn(authStorage, 'readStoredAuthUser').mockReturnValue(sessionUser);
        const writeUserSpy = vi.spyOn(authStorage, 'writeStoredAuthUser');

        render(
            <AuthProvider>
                <AuthActionsHarness tokenData={{} as AuthTokenResponse} />
            </AuthProvider>
        );

        act(() => {
            fireEvent.click(screen.getByText('update'));
        });

        expect(screen.getByTestId('email').textContent).toBe('actualizado@tfg.com');
        expect(writeUserSpy).toHaveBeenCalledWith(expect.objectContaining({
            username: 'merge_user',
            email: 'actualizado@tfg.com',
        }));
    });

    it('no debe persistir updateUser ni reset de inactividad cuando no hay sesión o cuando aplica throttle', () => {
        vi.spyOn(authStorage, 'readStoredAuthUser').mockReturnValue(null);
        const writeUserSpy = vi.spyOn(authStorage, 'writeStoredAuthUser');

        render(
            <AuthProvider>
                <AuthActionsHarness tokenData={{} as AuthTokenResponse} />
            </AuthProvider>
        );

        act(() => {
            fireEvent.click(screen.getByText('update'));
            fireEvent.mouseMove(window);
        });

        expect(screen.getByTestId('auth-status').textContent).toBe('NO_AUTENTICADO');
        expect(writeUserSpy).not.toHaveBeenCalled();
    });

    it('no debe cerrar sesión por visibilitychange cuando la pestaña no vuelve a visible', () => {
        const now = Date.now();
        const sessionUser = {
            userId: 42,
            username: 'visibilidad_user',
            role: ROLES.STUDENT,
            email: 'visible@tfg.com',
            token: 'jwt_visible',
            expiresAt: now + 60_000,
        };

        vi.spyOn(authStorage, 'readStoredAuthUser').mockReturnValue(sessionUser);

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        expect(screen.getByTestId('auth-status').textContent).toBe('AUTENTICADO');

        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });

        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });

        expect(screen.getByTestId('auth-status').textContent).toBe('AUTENTICADO');
    });
});
