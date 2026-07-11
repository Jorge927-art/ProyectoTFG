import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotificationBell from './NotificationBell';
import { useNotifications } from './useNotifications';

// 1. Creamos un mock simulado del hook aislado para controlar los escenarios
vi.mock('./useNotifications', () => ({
    useNotifications: vi.fn()
}));

describe('NotificationBell - Suite de Alertas Académicas', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe mostrar la campana en color slate neutro cuando NO hay alertas', () => {
        // Configuramos el mock para simular bandeja vacía
        vi.mocked(useNotifications).mockReturnValue({
            alerts: [],
            hasAlerts: false,
            refreshAlerts: vi.fn(),
            loading: false
        });

        render(<NotificationBell />);

        // Buscamos el botón de la campana por su rol de accesibilidad
        const bellButton = screen.getByRole('button');

        // Verificamos que contenga las clases de fondo blanco estándar
        expect(bellButton.className).toContain('bg-white');
        expect(bellButton.className).not.toContain('bg-red-50!');
    });

    it('debe cambiar la campana a ROJO parpadeante cuando existen alertas activas', () => {
        // Configuramos el mock simulando un documento y un progreso del curso >= 90%
        vi.mocked(useNotifications).mockReturnValue({
            alerts: [
                { type: 'DOCUMENT_INBOX', title: 'Bandeja', message: '1 doc', redirectUrl: '/docs' }
            ],
            hasAlerts: true,
            refreshAlerts: vi.fn(),
            loading: false
        });

        render(<NotificationBell />);

        const bellButton = screen.getByRole('button');

        // ✅ VALIDACIÓN CRÍTICA: Certificar el cambio al color de alerta rojo canónico de Tailwind v4
        expect(bellButton.className).toContain('bg-red-50!');
    });

    it('debe desplegar el panel flotante y listar las alertas al hacer clic', async () => {
        vi.mocked(useNotifications).mockReturnValue({
            alerts: [
                { type: 'DOCUMENT_INBOX', title: 'Nuevo Documento', message: 'Tienes 1 documento pendiente', redirectUrl: '/docs' }
            ],
            hasAlerts: true,
            refreshAlerts: vi.fn(),
            loading: false
        });

        render(<NotificationBell />);

        // Simulamos la apertura del desplegable interactivo mediante un clic
        const bellButton = screen.getByRole('button');
        fireEvent.click(bellButton);

        // Verificamos que el título del panel flotante aparezca en el DOM virtual
        expect(screen.getByText('Avisos del Sistema')).toBeInTheDocument();
        expect(screen.getByText('Nuevo Documento')).toBeInTheDocument();
        expect(screen.getByText('Tienes 1 documento pendiente')).toBeInTheDocument();
    });
});
