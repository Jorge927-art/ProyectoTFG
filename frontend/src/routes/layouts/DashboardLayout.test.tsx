import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardLayout from './DashboardLayout';
import { ROLES } from '../../auth/authTypes';

// 1. AUDITORÍA DE CALIDAD: Mockeo del hook useAuth para controlar el estado del rol de sesión
const mockUseAuth = vi.fn();
vi.mock('../../auth/useAuth', () => ({
    useAuth: () => mockUseAuth()
}));

// Mockeamos la Navbar superior para aislar puramente la maquetación geométrica del Layout
vi.mock('../../components/navbar/NavbarUser', () => ({
    default: () => <nav data-testid="mock-navbar">Navbar</nav>
}));

// Mock de React Router Dom ya que DashboardLayout se renderiza dentro del contexto de navegación
vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn()
}));

describe('Auditoría de Calidad: Composición Paramétrica de DashboardLayout', () => {

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('Debería inyectar de forma automática la clase "px-4" en el contenedor si el usuario tiene el rol de ADMIN', () => {
        // Configuramos el mock para un perfil de administración estricto
        mockUseAuth.mockReturnValue({
            user: { username: 'admin_tfg', role: ROLES.ADMIN },
            logout: vi.fn()
        });

        // Renderizamos inyectando un nodo hijo de prueba
        render(
            <DashboardLayout>
                <div data-testid="test-child">Contenido Privado</div>
            </DashboardLayout>
        );

        // Localizamos el contenedor padre directo de los hijos (el div que inyecta las clases de Tailwind)
        const childElement = screen.getByTestId('test-child');
        const layoutContainer = childElement.parentElement;

        // Verificaciones de Maquetación Paramétrica (Assertions)
        expect(layoutContainer).toBeInTheDocument();
        expect(layoutContainer?.className).toContain('px-4');
        expect(layoutContainer?.className).not.toContain('px-6');
    });

    it('Debería inyectar la clase de espaciado estándar "px-6" si el usuario conectado es un STUDENT o PROFESSOR', () => {
        // Configuramos el mock para un perfil de estudiante estándar
        mockUseAuth.mockReturnValue({
            user: { username: 'alumno_tfg', role: ROLES.STUDENT },
            logout: vi.fn()
        });

        render(
            <DashboardLayout>
                <div data-testid="test-child">Contenido Alumno</div>
            </DashboardLayout>
        );

        const childElement = screen.getByTestId('test-child');
        const layoutContainer = childElement.parentElement;

        // Verificaciones de Maquetación Paramétrica (Assertions)
        expect(layoutContainer).toBeInTheDocument();
        expect(layoutContainer?.className).toContain('px-6');
        expect(layoutContainer?.className).not.toContain('px-4');
    });
});
