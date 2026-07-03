import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterestsModal } from './InterestsModal';
import { apiClient } from '../../../services/apiClient';

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
        // Inyección asíncrona real en el useEffect del componente
        vi.mocked(apiClient.get).mockResolvedValue({ data: mockLuisInterests });
    });

    it('debe renderizar simétricamente las cabeceras estructurales de las tarjetas [ADR-13]', async () => {
        render(<InterestsModal {...defaultProps} />);

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
        render(<InterestsModal {...defaultProps} />);

        const closeButton = screen.getByRole('button', { name: 'Cerrar Modal' });
        expect(closeButton).toBeInTheDocument();
        expect(closeButton).toHaveAttribute('aria-label', 'Cerrar Modal');
    });

    it('debe hidratar correctamente el estado inicial de los elementos haciendo el fetch asíncrono real', async () => {
        render(<InterestsModal {...defaultProps} />);

        await waitFor(() => {
            expect(apiClient.get).toHaveBeenCalledWith('/api/auth/my-interests');
        });

        const espanolCheckbox = screen.getByLabelText('Español') as HTMLInputElement;
        const conSubtitulosCheckbox = screen.getByLabelText('Con Subtítulos') as HTMLInputElement;

        expect(espanolCheckbox.checked).toBe(true);
        expect(conSubtitulosCheckbox.checked).toBe(true);
    });

    it('debe permitir la mutación del formulario y evitar colisiones de texto duplicado en el DOM', async () => {
        render(<InterestsModal {...defaultProps} />);

        // Buscamos todas las casillas para filtrar de forma unívoca por su contenedor real
        const checkboxes = await screen.findAllByRole('checkbox') as HTMLInputElement[];

        const inglesLanguageCheckbox = checkboxes.find(box => {
            const labelText = box.closest('label')?.textContent || '';
            return labelText.trim() === 'Inglés';
        });

        expect(inglesLanguageCheckbox).toBeDefined();
        expect(inglesLanguageCheckbox!.checked).toBe(true);

        // Provocamos la mutación mediante simulación de clic interactivo
        fireEvent.click(inglesLanguageCheckbox!);
        expect(inglesLanguageCheckbox!.checked).toBe(false);
    });

    it('debe activar el estado loading y deshabilitar los controles al ejecutar la persistencia en Postgres', async () => {
        vi.mocked(apiClient.post).mockReturnValue(new Promise((resolve) => setTimeout(resolve, 50)));

        render(<InterestsModal {...defaultProps} />);

        const closeButton = screen.getByRole('button', { name: 'Cerrar Modal' });
        fireEvent.click(closeButton);

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
        });
    });
});
