import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthModal from './AuthModal';

describe('AuthModal', () => {
    // Mocks de las funciones que vienen por props
    const mockOnClose = vi.fn();
    const mockSetIsLoginView = vi.fn();

    // Limpiamos los mocks antes de cada test para que no se acumulen los clics
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('no debe renderizar nada si isOpen es false', () => {
        const { container } = render(
            <AuthModal isOpen={false} onClose={mockOnClose} isLoginView={true} setIsLoginView={mockSetIsLoginView} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('debe cambiar entre Login y Registro al hacer clic en el botón inferior', () => {
        render(
            <AuthModal isOpen={true} onClose={mockOnClose} isLoginView={true} setIsLoginView={mockSetIsLoginView} />
        );

        const switchButton = screen.getByText(/Regístrate aquí/i);
        fireEvent.click(switchButton);

        // Verificamos que se llamó a la función para cambiar la vista
        expect(mockSetIsLoginView).toHaveBeenCalledWith(false);
    });

    it('debe mostrar error de validación si la contraseña es menor a 6 caracteres', async () => {
    render(
        <AuthModal isOpen={true} onClose={mockOnClose} isLoginView={true} setIsLoginView={mockSetIsLoginView} />
    );

    const passInput = screen.getByPlaceholderText(/Contraseña/i);
    const userInput = screen.getByPlaceholderText(/Nombre de usuario/i);

    // 1. Llenamos AMBOS campos (por si el 'required' del navegador bloquea el submit)
    fireEvent.change(userInput, { target: { value: 'usuario_test' } });
    fireEvent.change(passInput, { target: { value: '123' } });
    
    // 2. Buscamos el botón y lo pulsamos
    const submitButton = screen.getByRole('button', { name: /Entrar/i });
    fireEvent.click(submitButton);

    // 3. Usamos una función buscadora flexible por si el texto está dividido en etiquetas
    const errorMessage = await screen.findByText((content) => {
        return content.includes("mínimo") || content.includes("6 caracteres");
    });

    expect(errorMessage).toBeInTheDocument();
    });


    it('debe mostrar "Procesando..." y deshabilitar el botón al enviar formulario válido', async () => {
        render(
            <AuthModal isOpen={true} onClose={mockOnClose} isLoginView={true} setIsLoginView={mockSetIsLoginView} />
        );

        const passInput = screen.getByPlaceholderText(/Contraseña/i);
        const userInput = screen.getByPlaceholderText(/Nombre de usuario/i);
        const submitButton = screen.getByRole('button', { name: /Entrar/i });

        // Llenamos datos válidos
        fireEvent.change(userInput, { target: { value: 'testuser' } });
        fireEvent.change(passInput, { target: { value: '123456' } });
        
        fireEvent.click(submitButton);

        // Verificamos estado de carga
        expect(screen.getByText(/Procesando.../i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();

        // Esperamos a que la simulación del setTimeout termine (handleClose se llama tras 1s)
        await waitFor(() => expect(mockOnClose).toHaveBeenCalled(), { timeout: 1500 });
    });

    it('debe cerrar el modal al hacer clic en el botón X', () => {
        render(
            <AuthModal isOpen={true} onClose={mockOnClose} isLoginView={true} setIsLoginView={mockSetIsLoginView} />
        );

        const closeButton = screen.getByLabelText(/Cerrar modal/i);
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
});
