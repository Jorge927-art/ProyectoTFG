import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect} from 'vitest';
import Navbar from './Navbar';

/**
 * Pruebas unitarias para el componente Navbar.
 * Estas pruebas verifican que el Navbar renderice correctamente, 
 * muestre los botones de navegación y maneje la apertura y cierre del modal de autenticación.
 */
describe('Navbar Component', () => {
    
    it('debe renderizar el logo o nombre de la aplicación', () => {
        render(<Navbar />);
        expect(screen.getByText(/Cursos Online Educativos/i) || screen.getByRole('link')).toBeInTheDocument();
    });

    it('debe mostrar los botones de navegación principales', () => {
        render(<Navbar />);
        expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
    });

    it('debe abrir el modal de login al hacer clic en "Entrar"', () => {
        render(<Navbar />);
        
        const loginButton = screen.getByRole('button', { name: /Entrar/i });
        fireEvent.click(loginButton);

        expect(screen.getByText(/Iniciar Sesión/i)).toBeInTheDocument();
    });

    it('debe cerrar el modal al pulsar la X dentro del mismo', async () => {
        render(<Navbar />);
        
        fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));
        
        const closeButton = screen.getByLabelText(/Cerrar modal/i);
        fireEvent.click(closeButton);

        expect(screen.queryByText(/Iniciar Sesión/i)).not.toBeInTheDocument();
    });
});
