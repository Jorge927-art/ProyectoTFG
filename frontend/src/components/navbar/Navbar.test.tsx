import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect} from 'vitest';
import Navbar from './Navbar';

describe('Navbar Component', () => {
    
    it('debe renderizar el logo o nombre de la aplicación', () => {
        render(<Navbar />);
        // Busca el texto principal de tu marca (ajusta el texto según tu código)
        expect(screen.getByText(/Cursos Online Educativos/i) || screen.getByRole('link')).toBeInTheDocument();
    });

    it('debe mostrar los botones de navegación principales', () => {
        render(<Navbar />);
        // Verificamos que los botones esenciales estén ahí
        expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
    });

    it('debe abrir el modal de login al hacer clic en "Entrar"', () => {
        render(<Navbar />);
        
        const loginButton = screen.getByRole('button', { name: /Entrar/i });
        fireEvent.click(loginButton);

        // Verificamos que el modal aparezca en el DOM
        // (Buscamos el título que sabemos que tiene el AuthModal)
        expect(screen.getByText(/Iniciar Sesión/i)).toBeInTheDocument();
    });

    it('debe cerrar el modal al pulsar la X dentro del mismo', async () => {
        render(<Navbar />);
        
        // Abrimos
        fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));
        
        // Cerramos usando la X (buscamos por el aria-label que pusimos antes)
        const closeButton = screen.getByLabelText(/Cerrar modal/i);
        fireEvent.click(closeButton);

        // Verificamos que el título del modal ya NO esté en el documento
        expect(screen.queryByText(/Iniciar Sesión/i)).not.toBeInTheDocument();
    });
});
