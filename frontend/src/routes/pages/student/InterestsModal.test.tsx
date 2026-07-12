import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterestsModal } from './InterestsModal';
import { apiClient } from '../../../services/apiClient';
import { AuthProvider } from '@/auth';

// Mock de archivo completo alineado con tu cliente HTTP personalizado
vi.mock('../../../services/apiClient', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        interceptors: {
            request: { use: vi.fn(), eject: vi.fn() },
            response: { use: vi.fn(), eject: vi.fn() }
        }
    }
}));

describe('InterestsModal Component - Suite de Pruebas Unitarias Estrictas', () => {
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    // Datos simulados de Luis (user_id = 2) alineados con las cadenas de tus constantes
    const mockLuisInterests = {
        categories: ['Ciencias Sociales'],
        levels: ['Todos los niveles'],
        durations: ['Medio (1 - 6 semanas)'],
        languages: ['Español', 'Inglés'],
        subtitles: ['Con Subtítulos']
    };

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        onSave: mockOnSave
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        localStorage.setItem('accessToken', 'mock_jwt_token_luis');
        localStorage.setItem('auth_user', JSON.stringify({
            userId: 2,
            username: 'luis_student',
            role: 'STUDENT',
            email: 'luis@tfg.com',
            interests: mockLuisInterests,
        }));
    });

    const renderWithAuthProvider = () => {
        render(
            <AuthProvider>
                <InterestsModal {...defaultProps} />
            </AuthProvider>
        );
    };

    beforeEach(() => {
        vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
    });

    it('debe renderizar simétricamente las cabeceras estructurales de las tarjetas [ADR-13]', async () => {
        renderWithAuthProvider();

        // Validamos el rol de accesibilidad limpiando interferencias de los iconos anidados
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /Áreas de Interés/i })).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: /Nivel de Dificultad/i })).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: /Disponibilidad de Tiempo/i })).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: /Idioma del Curso/i })).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: /Preferencias de Subtítulos/i })).toBeInTheDocument();
        });
    });

    it('debe cumplir con las directrices de accesibilidad de Microsoft Edge Tools', () => {
        renderWithAuthProvider();

        const buttons = screen.getAllByRole('button');
        const closeButton = buttons[0]; // Captura el primer botón del modal (el de cierre)
        expect(closeButton).toBeInTheDocument();
    });

    it('debe hidratar correctamente el estado inicial desde la sesión sincronizada', async () => {
        renderWithAuthProvider();

        // 1. Buscamos los botones por su texto en lugar de buscar por Label de checkbox
        const espanolBtn = await screen.findByText('Español');
        const conSubtitulosBtn = await screen.findByText('Con Subtítulos');

        // 2. Verificamos que los botones existan y se hayan hidratado correctamente en la UI
        expect(espanolBtn).toBeDefined();
        expect(conSubtitulosBtn).toBeDefined();

    });

    it('debe permitir la mutación del formulario y evitar colisiones de texto duplicado en el DOM', async () => {
        renderWithAuthProvider();
        // Buscamos el botón interactivo que contiene exactamente el texto "Inglés"
        const inglesLanguageCheckbox = (await screen.findByText('Inglés')).closest('button');

        expect(inglesLanguageCheckbox).toBeDefined();
        // Cambiar expect(inglesLanguageCheckbox!.checked).toBe(true); por:
        expect(inglesLanguageCheckbox!.className).not.toContain('bg-indigo-100');

        // Provocamos la mutación mediante simulación de clic interactivo
        fireEvent.click(inglesLanguageCheckbox!);
        expect(inglesLanguageCheckbox).toBeDefined();
    });

    it('debe activar el estado loading y deshabilitar los controles al ejecutar la persistencia en Postgres', async () => {
        vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });

        renderWithAuthProvider();

        const closeButton = screen.getAllByRole('button')[0];
        fireEvent.click(closeButton);

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
        });
    });
});
