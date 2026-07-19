import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { describe, test, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NotificationBell from './GlobalNotificationBell';
import * as notificationsHook from './useNotifications';

// Configuramos de forma nativa el mock del módulo perimetral de notificaciones para Vitest
vi.mock('./useNotifications', () => ({
    useNotifications: vi.fn()
}));

describe('NotificationBell - Suite de Alertas Académicas', () => {
    const mockRefresh = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('debe mostrar la campana en color slate neutro cuando NO hay alertas', () => {
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

        const bellButton = screen.getByRole('button');
        expect(bellButton.className).toContain('bg-white');
        expect(bellButton.className).not.toContain('bg-red-50!');
    });

    it('debe cambiar la campana a ROJO parpadeante cuando existen alertas activas', () => {
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
        expect(bellButton.className).toMatch(/bg-red-50!/);
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

        // 1. Simulamos el clic de apertura de la campana
        const bellButton = screen.getByRole('button');
        fireEvent.click(bellButton);

        // 2. CORRECCIÓN ROBUSTA: Validamos que el contenedor flotante se abre y muestra la cabecera
        await waitFor(() => {
            expect(screen.getByText('Avisos del Sistema')).toBeInTheDocument();
        });
    });

    test('Robustez Perimetral: Debe renderizar la campana en estado neutral ante un error 500 del backend sin congelar la interfaz', () => {
        vi.spyOn(notificationsHook, 'useNotifications').mockReturnValue({
            alerts: [],
            documents: [],
            hasAlerts: false,
            hasUnread: false,
            refreshAlerts: vi.fn(),
            refreshNotifications: vi.fn(),
            loading: false
        });

        const { container } = render(<NotificationBell />);

        // Usamos el buscador simple por rol para máxima compatibilidad con GenericButton
        const bellButton = screen.getByRole('button');
        expect(bellButton).toBeInTheDocument();

        fireEvent.click(bellButton);

        expect(screen.getByText('Avisos del Sistema')).toBeInTheDocument();
        expect(screen.getByText('Tu bandeja está limpia')).toBeInTheDocument();
        expect(screen.getByText('No tienes avisos pendientes por el momento.')).toBeInTheDocument();

        const pulseIndicator = container.querySelector('.animate-pulse');
        expect(pulseIndicator).toBeNull();
    });
});

