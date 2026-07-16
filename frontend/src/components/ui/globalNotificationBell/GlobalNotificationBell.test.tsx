import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NotificationBell from './GlobalNotificationBell';
import * as notificationsHook from './useNotifications';

describe('NotificationBell - Suite de Alertas Académicas', () => {
    const mockRefresh = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.mocked(notificationsHook.useNotifications).mockRestore();
    });

    it('debe mostrar la campana en color slate neutro cuando NO hay alertas', () => {
        // Configuramos el mock para simular bandeja vacía
        vi.spyOn(notificationsHook, 'useNotifications').mockReturnValue({
            alerts: [],
            documents: [],
            hasAlerts: false,
            hasUnread: false,
            refreshAlerts: mockRefresh,
            refreshNotifications: mockRefresh,
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
        vi.spyOn(notificationsHook, 'useNotifications').mockReturnValue({
            alerts: [
                { type: 'DOCUMENT_INBOX', title: 'Bandeja', message: '1 doc', redirectUrl: '/docs' }
            ],
            documents: [],
            hasAlerts: true,
            hasUnread: true,
            refreshAlerts: mockRefresh,
            refreshNotifications: mockRefresh,
            loading: false
        });

        render(<NotificationBell />);

        const bellButton = screen.getByRole('button');

        // ✅ VALIDACIÓN CRÍTICA: Certificar el cambio al color de alerta rojo canónico de Tailwind v4
        expect(bellButton.className).toContain('bg-red-50!');
    });

    it('debe desplegar el panel flotante y listar las alertas al hacer clic', async () => {
        vi.spyOn(notificationsHook, 'useNotifications').mockReturnValue({
            alerts: [
                { type: 'DOCUMENT_INBOX', title: 'Nuevo Documento', message: 'Tienes 1 documento pendiente', redirectUrl: '/docs' }
            ],
            documents: [],
            hasAlerts: true,
            hasUnread: true,
            refreshAlerts: mockRefresh,
            refreshNotifications: mockRefresh,
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
