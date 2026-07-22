import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MainNavbar from './MainNavbar';
import { useAuth } from '@/auth';

// =========================================================================
// 1. AISLAMIENTO PERIMETRAL DE DEPENDENCIAS GLOBALES Y HOOKS
// =========================================================================
vi.mock('@/auth', () => ({
    useAuth: vi.fn()
}));

// =========================================================================
// 2. MOCKS DE COMPONENTES ATÓMICOS DE NAVEGACIÓN SIN EL TIPO PROHIBIDO 'ANY'
// =========================================================================
vi.mock('./Navbar', () => ({
    default: () => <div data-testid="mock-public-navbar">Barra de Navegación Pública</div>
}));

vi.mock('./NavbarUser', () => ({
    default: ({ username, userPhoto, onLogout }: { username: string; userPhoto?: string; onLogout: () => void }) => (
        <div data-testid="mock-user-navbar">
            <span>Usuario: {username}</span>
            {userPhoto && <img src={userPhoto} alt="Avatar" data-testid="user-avatar" />}
            <button onClick={onLogout} data-testid="btn-logout-trigger">Cerrar Sesión</button>
        </div>
    )
}));

describe('MainNavbar - Suite de Pruebas Unitarias del Orquestador de Navegación', () => {
    const mockLogout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    /* =========================================================================
       1. CONTROL DE BIFURCACIÓN DE INTERFAZ (ESTADO ANÓNIMO O EXPIRADO)
       ========================================================================= */
    it('Debe renderizar la barra pública Navbar si el usuario no está autenticado o es nulo', () => {
        // [BLINDAJE DE TIPADO]: Doble casteo seguro parcial de useAuth para simular sesión inactiva
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            isAuthenticated: false,
            logout: mockLogout
        } as unknown as ReturnType<typeof useAuth>);

        render(<MainNavbar />);

        // Verificaciones funcionales de la UI pública
        expect(screen.getByTestId('mock-public-navbar')).toBeInTheDocument();
        expect(screen.queryByTestId('mock-user-navbar')).not.toBeInTheDocument();
    });

    /* =========================================================================
       2. CONTROL DE BIFURCACIÓN DE INTERFAZ (ESTADO AUTENTICADO PRIVADO)
       ========================================================================= */
    it('Debe renderizar la barra privada NavbarUser inyectando las propiedades del DTO si hay sesión válida', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'profesor_tfg', photo: 'https://cdn.com' },
            isAuthenticated: true,
            logout: mockLogout
        } as unknown as ReturnType<typeof useAuth>);

        render(<MainNavbar />);

        // El orquestador debe mutar y montar el layout del perfil de usuario
        expect(screen.getByTestId('mock-user-navbar')).toBeInTheDocument();
        expect(screen.queryByTestId('mock-public-navbar')).not.toBeInTheDocument();

        // Control de propagación de datos hacia el subcomponente
        expect(screen.getByText('Usuario: profesor_tfg')).toBeInTheDocument();
        expect(screen.getByTestId('user-avatar')).toHaveAttribute('src', 'https://cdn.com');
    });

    /* =========================================================================
   3. CONTROL DE ATRIBUTOS OPCIONALES Y CICLO DE VIDA DE CIERRE DE SESIÓN
   ========================================================================= */
    it('Debe renderizar NavbarUser correctamente omitiendo la imagen si el usuario carece de foto de perfil', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'alumno_sin_foto', photo: undefined },
            isAuthenticated: true,
            logout: mockLogout
        } as unknown as ReturnType<typeof useAuth>);

        render(<MainNavbar />);

        expect(screen.getByTestId('mock-user-navbar')).toBeInTheDocument();
        expect(screen.getByText('Usuario: alumno_sin_foto')).toBeInTheDocument();
        // Control analítico: El nodo img no debe montarse al ser nulo en el DTO
        expect(screen.queryByTestId('user-avatar')).not.toBeInTheDocument();
    });

    it('Debe propagar el evento de desconexión e invocar la función logout de useAuth al pulsar el botón', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { username: 'usuario_activo', photo: undefined },
            isAuthenticated: true,
            logout: mockLogout
        } as unknown as ReturnType<typeof useAuth>);

        render(<MainNavbar />);

        const botonLogout = screen.getByTestId('btn-logout-trigger');
        fireEvent.click(botonLogout);

        // Control operativo: Verificar que el callback global de desconexión se gatilla de forma unívoca
        expect(mockLogout).toHaveBeenCalledTimes(1);
    });
});


