import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NavbarUser from './NavbarUser';
import { AuthContext } from '../../auth/AuthContext'; // Ajusta la ruta relativa exacta a tu AuthContext

// Mockear el componente de la campana global para aislar el test de la barra de navegación
vi.mock('../ui/globalNotificationBell/GlobalNotificationBell', () => ({
    default: () => <div data-testid="mock-notification-bell">Campana Activa</div>
}));

describe('NavbarUser - Integración de Seguridad Multirrol en UI [ADR-016]', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Función auxiliar para envolver el componente con el proveedor de contexto y el enrutador
    const renderNavbarWithRole = (role: 'STUDENT' | 'PROFESSOR' | 'ADMIN', username: string) => {
        const mockAuthValue = {
            user: { user_id: 1, username, email: `${username}@cole.com`, role },
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            updateUser: vi.fn(),
            logout: vi.fn(),
        };

        return render(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <AuthContext.Provider value={mockAuthValue as any}>
                <BrowserRouter>
                    <NavbarUser username={username} />
                </BrowserRouter>
            </AuthContext.Provider>
        );
    };


    test('Debe renderizar la insignia de Administrador y la campana global para el perfil ADMIN', () => {
        // Act: Forzamos la hidratación del rol administrativo
        renderNavbarWithRole('ADMIN', 'Don Admin');

        // Assert: 1. Comprobamos la insignia semántica en el DOM
        expect(screen.getByText('Administrador')).toBeInTheDocument();

        // Assert: 2. Validamos el nombre dinámico del usuario
        expect(screen.getByText('Don Admin')).toBeInTheDocument();

        // Assert: 3. Certificamos que la campana global se inyecta correctamente sin bloqueos
        expect(screen.getByTestId('mock-notification-bell')).toBeInTheDocument();
    });

    test('Debe renderizar la insignia esmeralda de Profesor y la campana global para el perfil PROFESSOR', () => {
        // Act: Forzamos la hidratación del rol docente
        renderNavbarWithRole('PROFESSOR', 'Laura Profesora');

        // Assert: 1. Comprobamos la insignia semántica docente
        expect(screen.getByText('Profesor')).toBeInTheDocument();

        // Assert: 2. Validamos el nombre dinámico del usuario
        expect(screen.getByText('Laura Profesora')).toBeInTheDocument();

        // Assert: 3. Certificamos la presencia de la campana global unificada
        expect(screen.getByTestId('mock-notification-bell')).toBeInTheDocument();
    });

    test('Debe renderizar la insignia azul de Alumno y la campana global para el perfil STUDENT', () => {
        // Act: Forzamos la hidratación del rol discente
        renderNavbarWithRole('STUDENT', 'Luis Alumno');

        // Assert: 1. Comprobamos la insignia semántica de alumno
        expect(screen.getByText('Alumno')).toBeInTheDocument();

        // Assert: 2. Validamos el nombre dinámico del usuario
        expect(screen.getByText('Luis Alumno')).toBeInTheDocument();

        // Assert: 3. Certificamos que el estudiante mantiene el acceso transparente a la campana
        expect(screen.getByTestId('mock-notification-bell')).toBeInTheDocument();
    });
});
