import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '@/auth';
import { useLocation, Navigate } from 'react-router-dom';

// Aislamiento perimetral de los componentes del enrutador y del hook
vi.mock('@/auth', () => ({
    useAuth: vi.fn()
}));

vi.mock('react-router-dom', () => ({
    Navigate: vi.fn(() => <div data-testid="mock-navigate" />),
    Outlet: vi.fn(() => <div data-testid="mock-outlet" />),
    useLocation: vi.fn()
}));

describe('ProtectedRoute - Suite de Pruebas Unitarias de Seguridad Perimetral', () => {
    const mockLocation = { pathname: '/dashboard/analitica' };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useLocation).mockReturnValue(mockLocation as ReturnType<typeof useLocation>);
    });

    /* =========================================================================
       1. CONTROL DE ESTADO ASÍNCRONO (FRENO DE SEGURIDAD)
       ========================================================================= */
    it('Debe renderizar el spinner visual de carga si isLoading es true para mitigar falsos negativos', () => {
        // [CORRECCIÓN CRÍTICA ts(2352)]: Doble casteo usando unknown para eludir restricciones de métodos no usados
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            isAuthenticated: false,
            isLoading: true
        } as unknown as ReturnType<typeof useAuth>);

        render(<ProtectedRoute />);

        expect(screen.getByText('Verificando credenciales de seguridad...')).toBeInTheDocument();
        expect(screen.queryByTestId('mock-navigate')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-outlet')).not.toBeInTheDocument();
    });

    /* =========================================================================
    2. CONTROL DE SESIÓN: RECHAZO DE ACCESOS NO AUTENTICADOS
    ========================================================================= */
    it('Debe redirigir a la raíz "/" y guardar la ubicación previa si el usuario no está autenticado o es nulo', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            isAuthenticated: false,
            isLoading: false
        } as unknown as ReturnType<typeof useAuth>);

        render(<ProtectedRoute />);

        // [CORRECCIÓN CRÍTICA VITEST]: Sincronizar el segundo parámetro implícito del componente React con undefined
        expect(Navigate).toHaveBeenCalledWith(
            expect.objectContaining({
                to: '/',
                replace: true,
                state: { from: mockLocation }
            }),
            undefined
        );
        expect(screen.getByTestId('mock-navigate')).toBeInTheDocument();
    });
    /* =========================================================================
       3. CONTROL DE SESIÓN VÁLIDA SIN POLÍTICA DE ROLES (ACCESO LIBRE)
       ========================================================================= */
    it('Debe permitir el renderizado de la ruta hija mediante Outlet si está autenticado y allowedRoles se omite', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'user_test', role: 'STUDENT' },
            isAuthenticated: true,
            isLoading: false
        } as unknown as ReturnType<typeof useAuth>);

        render(<ProtectedRoute />);

        expect(screen.getByTestId('mock-outlet')).toBeInTheDocument();
        expect(screen.queryByTestId('mock-navigate')).not.toBeInTheDocument();
    });

    /* =========================================================================
       4. CONTROL DE AUTORIZACIÓN: VALIDACIÓN DE ROLES (CASO ÉXITO)
       ========================================================================= */
    it('Debe autorizar el acceso y renderizar Outlet si el rol coincide con la lista blanca normalizando a mayúsculas', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'prof_test', role: 'professor' },
            isAuthenticated: true,
            isLoading: false
        } as unknown as ReturnType<typeof useAuth>);

        render(<ProtectedRoute allowedRoles={['STUDENT', 'PROFESSOR']} />);

        expect(screen.getByTestId('mock-outlet')).toBeInTheDocument();
        expect(screen.queryByTestId('mock-navigate')).not.toBeInTheDocument();
    });

    /* =========================================================================
   5. CONTROL DE AUTORIZACIÓN: RECHAZO DE ROLES (CASO ACCESO DENEGADO)
   ========================================================================= */
    it('Debe denegar el acceso redirigiendo a la ruta por defecto si el rol del alumno no se encuentra en la lista blanca', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'student_test', role: 'STUDENT' },
            isAuthenticated: true,
            isLoading: false
        } as unknown as ReturnType<typeof useAuth>);

        render(<ProtectedRoute allowedRoles={['ADMIN', 'PROFESSOR']} />);

        expect(Navigate).toHaveBeenCalledWith(
            expect.objectContaining({
                to: '/acceso-denegado',
                replace: true,
                state: { from: mockLocation }
            }),
            undefined
        );
        expect(screen.getByTestId('mock-navigate')).toBeInTheDocument();
        expect(screen.queryByTestId('mock-outlet')).not.toBeInTheDocument();
    });

    /* =========================================================================
       6. CONTROL DE AUTORIZACIÓN: REDIRECCIÓN PERSONALIZADA POR PARÁMETRO
       ========================================================================= */
    it('Debe redirigir a la ruta especificada por propiedad si el rol falla y se inyecta redirectIfUnauthorized', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'guest_test', role: 'GUEST' },
            isAuthenticated: true,
            isLoading: false
        } as unknown as ReturnType<typeof useAuth>);

        render(
            <ProtectedRoute
                allowedRoles={['ADMIN']}
                redirectIfUnauthorized="/home-profesores"
            />
        );

        expect(Navigate).toHaveBeenCalledWith(
            expect.objectContaining({
                to: '/home-profesores',
                replace: true,
                state: { from: mockLocation }
            }),
            undefined
        );
        expect(screen.getByTestId('mock-navigate')).toBeInTheDocument();
    });
});
