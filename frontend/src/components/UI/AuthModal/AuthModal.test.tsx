import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthModal from './AuthModal';

/**
 * Pruebas unitarias para el componente AuthModal que verifica su comportamiento en diferentes escenarios.
 * Se prueba que el modal no se renderice cuando isOpen es false, que cambie entre Login y Registro,
 * que muestre errores de validación, que maneje el estado de carga correctamente y que se cierre al hacer clic en el botón X.
 */
describe('AuthModal', () => {
    const mockOnClose = vi.fn();
    const mockSetIsLoginView = vi.fn();

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

        expect(mockSetIsLoginView).toHaveBeenCalledWith(false);
    });

    it('debe mostrar error de validación si la contraseña es menor a 6 caracteres', async () => {
    render(
        <AuthModal isOpen={true} onClose={mockOnClose} isLoginView={true} setIsLoginView={mockSetIsLoginView} />
    );

    const passInput = screen.getByPlaceholderText(/Contraseña/i);
    const userInput = screen.getByPlaceholderText(/Nombre de usuario/i);

    fireEvent.change(userInput, { target: { value: 'usuario_test' } });
    fireEvent.change(passInput, { target: { value: '123' } });
    
    const submitButton = screen.getByRole('button', { name: /Entrar/i });
    fireEvent.click(submitButton);

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

        fireEvent.change(userInput, { target: { value: 'testuser' } });
        fireEvent.change(passInput, { target: { value: '123456' } });
        
        fireEvent.click(submitButton);

        expect(screen.getByText(/Procesando.../i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();

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
