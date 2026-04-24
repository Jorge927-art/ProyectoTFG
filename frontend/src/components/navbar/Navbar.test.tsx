import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { ReactElement } from 'react';
import Navbar from './Navbar';
import { AuthProvider } from '@/auth';

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

        const loginButton = screen.getByRole('button', { name: /Entrar/i });
        fireEvent.click(loginButton);

        expect(screen.getByText(/Iniciar Sesión/i)).toBeInTheDocument();
    });

    it('debe cerrar el modal al pulsar la X dentro del mismo', async () => {
        renderWithAuthProvider(<Navbar />);

        fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

        const closeButton = screen.getByLabelText(/Cerrar modal/i);
        fireEvent.click(closeButton);

        expect(screen.queryByText(/Iniciar Sesión/i)).not.toBeInTheDocument();
    });
});
