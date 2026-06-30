import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ReactElement } from 'react';
import Navbar from './Navbar';
import { AuthProvider } from '@/auth';

// 1. AUDITORÍA DE CALIDAD: Mockeo semántico del AuthModal para aislar las pruebas de la Navbar
// Creamos una versión de juguete controlada con un botón de cierre explícito e inmune a cambios de iconos
vi.mock('../ui/authModal/AuthModal', () => {
    return {
        default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
            if (!isOpen) return null;
            return (
                <div data-testid="mock-auth-modal">
                    <h2>Iniciar Sesión</h2>
                    <button onClick={onClose} aria-label="Cerrar modal">X</button>
                </div>
            );
        }
    };
});

// Mockeamos también el catálogo por si acaso para aligerar el árbol de renderizado de React
vi.mock('../ui/courseInfoModal/CourseInfoModal', () => {
    return {
        default: () => null
    };
});

const renderWithAuthProvider = (ui: ReactElement) => {
    return render(<AuthProvider>{ui}</AuthProvider>);
};

/**
 * Pruebas unitarias para el componente Navbar.
 * Estas pruebas verifican que el Navbar renderice correctamente, 
 * muestre los botones de navegación y maneje la apertura y cierre del modal de autenticación.
 */
describe('Navbar Component', () => {

    it('debe renderizar el logo o nombre de la aplicación', () => {
        renderWithAuthProvider(<Navbar />);
        expect(screen.getByText(/GESTIÓN DE CURSOS ONLINE/i)).toBeInTheDocument();
    });

    it('debe mostrar los botones de navegación principales', () => {
        renderWithAuthProvider(<Navbar />);
        expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
    });

    it('debe abrir el modal de login al hacer clic en "Entrar"', () => {
        renderWithAuthProvider(<Navbar />);

        const loginButton = screen.getByRole('button', { name: /Entrar \/ Registro/i });
        fireEvent.click(loginButton);

        expect(screen.getByText(/Iniciar Sesión/i)).toBeInTheDocument();
    });

    it('debe cerrar el modal al pulsar la X dentro del mismo', async () => {
        renderWithAuthProvider(<Navbar />);

        // Abrimos el modal de autenticación desde el botón real de la navbar
        fireEvent.click(screen.getByRole('button', { name: /Entrar \/ Registro/i }));
        expect(screen.getByText(/Iniciar Sesión/i)).toBeInTheDocument();

        // Al usar el mock controlado, queryByLabelText localiza el botón de cierre al 100% de certeza
        const closeButton = screen.getByLabelText(/Cerrar modal/i);
        fireEvent.click(closeButton);

        // Verificamos que el componente del formulario se haya desmontado con éxito
        expect(screen.queryByText(/Iniciar Sesión/i)).not.toBeInTheDocument();
    });
});
