import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import AuthModal from './AuthModal';
import { AuthProvider } from '@/auth';
import { apiClient } from '@/services/apiClient';

// INTERCEPCIÓN EXACTA DEL CLIENTE CENTRALIZADO
vi.mock('@/services/apiClient', () => ({
    apiClient: {
        post: vi.fn(),
        interceptors: {
            request: { use: vi.fn(), eject: vi.fn() },
            response: { use: vi.fn(), eject: vi.fn() }
        }
    }
}));

const renderWithAuthProvider = (ui: ReactElement) => {
    return render(
        <MemoryRouter>
            <AuthProvider>{ui}</AuthProvider>
        </MemoryRouter>
    );
};

/**
 * Pruebas unitarias para el componente AuthModal adaptadas a su DOM real de producción.
 */
describe('AuthModal', () => {
    const mockOnClose = vi.fn();
    const mockSetIsLoginView = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Simulación por defecto de éxito inmediato 200 OK
        vi.mocked(apiClient.post).mockResolvedValue({
            status: 200,
            data: {
                accessToken: 'jwt_test_token',
                tokenType: 'Bearer',
                expiresIn: 900,
                userId: 1,
                username: 'testuser',
                role: 'STUDENT',
                email: 'testuser@tfg.com',
                enrolledCourseIds: [],
                avatarPath: '',
                interests: {
                    categories: [],
                    levels: [],
                    durations: [],
                    languages: [],
                    subtitles: [],
                },
            },
        });
    });

    it('no debe renderizar nada si isOpen es false', () => {
        const { container } = renderWithAuthProvider(
            <AuthModal isOpen={false} onClose={mockOnClose} isLoginView={true} setIsLoginView={mockSetIsLoginView} />
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

    it('debe mostrar estado de procesamiento y deshabilitar el botón al enviar formulario válido', async () => {
        // CORRECCIÓN DE TIPADO ESTRICTO: Definimos la firma exacta de la función de resolución
        let resolvePromise: (value: unknown) => void = () => { };
        const promise = new Promise((resolve) => {
            resolvePromise = resolve;
        });

        // Eliminamos los "as any" usando tipos genéricos limpios
        vi.mocked(apiClient.post).mockReturnValueOnce(promise as Promise<unknown>);

        renderWithAuthProvider(
            <AuthModal isOpen={true} onClose={mockOnClose} isLoginView={true} setIsLoginView={mockSetIsLoginView} />
        );

        const passInput = screen.getByPlaceholderText(/Contraseña/i);
        const userInput = screen.getByPlaceholderText(/Nombre de usuario/i);
        const submitButton = screen.getByRole('button', { name: /Entrar/i });

        fireEvent.change(userInput, { target: { value: 'testuser' } });
        fireEvent.change(passInput, { target: { value: '123456' } });

        fireEvent.click(submitButton);

        // Evaluamos el estado intermedio mientras la promesa está pendiente
        expect(screen.getByText(/Procesando.../i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();

        // Resolvemos la promesa de forma manual simulando la respuesta estructurada del backend
        resolvePromise({
            status: 200,
            data: {
                accessToken: 'jwt_test_token',
                tokenType: 'Bearer',
                expiresIn: 900,
                userId: 1,
                username: 'testuser',
                role: 'STUDENT',
                email: 'testuser@tfg.com',
                enrolledCourseIds: [],
                avatarPath: '',
                interests: {
                    categories: [],
                    levels: [],
                    durations: [],
                    languages: [],
                    subtitles: [],
                },
            }
        });

        // Esperamos a que concluyan los efectos colaterales de cierre
        await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
    });

    it('debe mostrar error de conexión cuando el backend no responde', async () => {
        vi.mocked(apiClient.post).mockRejectedValueOnce({ message: 'Network Error', isAxiosError: true });

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
        vi.mocked(apiClient.post).mockRejectedValueOnce({ code: 'ECONNREFUSED', isAxiosError: true });

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

    it('debe cerrar el modal al hacer clic en el fondo de la pantalla', () => {
        const { container } = renderWithAuthProvider(
            <AuthModal isOpen={true} onClose={mockOnClose} isLoginView={true} setIsLoginView={mockSetIsLoginView} />
        );

        // CORRECCIÓN DOM REAL: Tu componente se cierra haciendo clic en el contenedor principal ('fixed inset-0')
        const modalOverlay = container.querySelector('.fixed.inset-0');
        expect(modalOverlay).not.toBeNull();

        fireEvent.click(modalOverlay!);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
});
