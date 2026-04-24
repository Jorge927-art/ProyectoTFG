import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import AuthModal from './AuthModal';
import axios from 'axios';
import { AxiosError } from 'axios';
import { AuthProvider } from '@/auth';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const renderWithAuthProvider = (ui: ReactElement) => {
    return render(<AuthProvider>{ui}</AuthProvider>);
};

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
        mockedAxios.post.mockResolvedValue({
            status: 200,
            data: { username: 'testuser' },
        } as never);
    });

    it('no debe renderizar nada si isOpen es false', () => {
        const { container } = render(
            <AuthProvider>
                <AuthModal isOpen={false} onClose={mockOnClose} isLoginView={true} setIsLoginView={mockSetIsLoginView} />
            </AuthProvider>
        );
        expect(container.firstChild).toBeNull();
    });

    it('debe cambiar entre Login y Registro al hacer clic en el botón inferior', () => {
        renderWithAuthProvider(
            <AuthModal isOpen={true} onClose={mockOnClose} isLoginView={true} setIsLoginView={mockSetIsLoginView} />
        );

        const switchButton = screen.getByText(/Regístrate aquí/i);
        fireEvent.click(switchButton);

        expect(mockSetIsLoginView).toHaveBeenCalledWith(false);
    });

    it('debe mostrar error de validación si la contraseña es menor a 6 caracteres', async () => {
        renderWithAuthProvider(
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
        renderWithAuthProvider(
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

    it('debe mostrar error de conexión cuando el backend no responde', async () => {
        mockedAxios.post.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));

        renderWithAuthProvider(
            <AuthModal isOpen={true} onClose={mockOnClose} isLoginView={true} setIsLoginView={mockSetIsLoginView} />
        );

        fireEvent.change(screen.getByPlaceholderText(/Nombre de usuario/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText(/Contraseña/i), { target: { value: '123456' } });

        fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

        expect(await screen.findByText(/conexión con el servidor|No se pudo conectar con el servidor/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Entrar/i })).toBeEnabled();
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('debe mostrar error de conexión cuando PostgreSQL está apagado (ECONNREFUSED)', async () => {
        const error = new AxiosError('Connection refused');
        error.code = 'ECONNREFUSED';
        error.response = undefined;
        mockedAxios.post.mockRejectedValueOnce(error);

        renderWithAuthProvider(
            <AuthModal isOpen={true} onClose={mockOnClose} isLoginView={true} setIsLoginView={mockSetIsLoginView} />
        );

        fireEvent.change(screen.getByPlaceholderText(/Nombre de usuario/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText(/Contraseña/i), { target: { value: '123456' } });

        fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

        expect(await screen.findByText(/No se pudo conectar con el servidor|conexión con el servidor/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Entrar/i })).toBeEnabled();
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('debe cerrar el modal al hacer clic en el botón X', () => {
        renderWithAuthProvider(
            <AuthModal isOpen={true} onClose={mockOnClose} isLoginView={true} setIsLoginView={mockSetIsLoginView} />
        );

        const closeButton = screen.getByLabelText(/Cerrar modal/i);
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
});
