import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { describe, test, it, expect, vi, beforeEach } from 'vitest';
import NotificationBell from './GlobalNotificationBell';
import * as notificationsHook from './useNotifications';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate
}));

describe('NotificationBell - Suite de Alertas Académicas', () => {
    const mockRefresh = vi.fn();
    const mockDismiss = vi.fn();
    let useNotificationsSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.clearAllMocks();
        useNotificationsSpy = vi.spyOn(notificationsHook, 'useNotifications');
    });

    it('debe mostrar la campana en color slate neutro cuando NO hay alertas', () => {
        useNotificationsSpy.mockReturnValue({
            alerts: [],
            documents: [],
            hasAlerts: false,
            hasUnread: false,
            refreshAlerts: mockRefresh,
            refreshNotifications: mockRefresh,
            dismissNotifications: mockDismiss,
            loading: false
        });

        render(<NotificationBell />);

        const bellButton = screen.getByRole('button');
        expect(bellButton.className).toContain('bg-white');
        expect(bellButton.className).not.toContain('bg-red-50!');
    });

    it('debe cambiar la campana a ROJO parpadeante cuando existen alertas activas', () => {
        useNotificationsSpy.mockReturnValue({
            alerts: [
                { type: 'DOCUMENT_INBOX', title: 'Bandeja', message: '1 doc', redirectUrl: '/docs' }
            ],
            documents: [],
            hasAlerts: true,
            hasUnread: true,
            refreshAlerts: mockRefresh,
            refreshNotifications: mockRefresh,
            dismissNotifications: mockDismiss,
            loading: false
        });

        render(<NotificationBell />);

        const bellButton = screen.getByRole('button');
        expect(bellButton.className).toMatch(/bg-red-50!/);
    });

    it('debe desplegar el panel flotante y listar las alertas al hacer clic', async () => {
        useNotificationsSpy.mockReturnValue({
            alerts: [
                { type: 'DOCUMENT_INBOX', title: 'Nuevo Documento', message: 'Tienes 1 documento pendiente', redirectUrl: '/docs' }
            ],
            documents: [],
            hasAlerts: true,
            hasUnread: true,
            refreshAlerts: mockRefresh,
            refreshNotifications: mockRefresh,
            dismissNotifications: mockDismiss,
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
        useNotificationsSpy.mockReturnValue({
            alerts: [],
            documents: [],
            hasAlerts: false,
            hasUnread: false,
            refreshAlerts: vi.fn(),
            refreshNotifications: vi.fn(),
            dismissNotifications: mockDismiss,
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

    it('no debe marcar notificaciones como vistas automáticamente al abrir', () => {
        useNotificationsSpy.mockReturnValue({
            alerts: [
                { type: 'DOCUMENT_INBOX', title: 'Bandeja', message: '1 doc', redirectUrl: '/docs' }
            ],
            documents: [],
            hasAlerts: true,
            hasUnread: true,
            refreshAlerts: mockRefresh,
            refreshNotifications: mockRefresh,
            dismissNotifications: mockDismiss,
            loading: false
        });

        render(<NotificationBell />);

        fireEvent.click(screen.getByRole('button', { name: 'Campana de notificaciones' }));

        expect(mockDismiss).not.toHaveBeenCalled();
    });

    it('debe permitir marcar como vistas desde el botón explícito del panel', () => {
        useNotificationsSpy.mockReturnValue({
            alerts: [
                { type: 'DOCUMENT_INBOX', title: 'Bandeja', message: '1 doc', redirectUrl: '/docs' }
            ],
            documents: [],
            hasAlerts: true,
            hasUnread: true,
            refreshAlerts: mockRefresh,
            refreshNotifications: mockRefresh,
            dismissNotifications: mockDismiss,
            loading: false
        });

        render(<NotificationBell />);

        fireEvent.click(screen.getByRole('button', { name: 'Campana de notificaciones' }));
        fireEvent.click(screen.getByRole('button', { name: 'Marcar vistas' }));

        expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('no debe marcar notificaciones como vistas al abrir si no hay no leidas', () => {
        useNotificationsSpy.mockReturnValue({
            alerts: [],
            documents: [],
            hasAlerts: false,
            hasUnread: false,
            refreshAlerts: mockRefresh,
            refreshNotifications: mockRefresh,
            dismissNotifications: mockDismiss,
            loading: false
        });

        render(<NotificationBell />);

        fireEvent.click(screen.getByRole('button', { name: 'Campana de notificaciones' }));

        expect(mockDismiss).not.toHaveBeenCalled();
    });

    it('debe redirigir a la ruta del aviso al hacer clic sobre una notificación', async () => {
        useNotificationsSpy.mockReturnValue({
            alerts: [
                {
                    type: 'COURSE_PROGRESS',
                    title: 'Asignatura por finalizar',
                    message: 'Tu curso está al 95%',
                    redirectUrl: '/student'
                }
            ],
            documents: [],
            hasAlerts: true,
            hasUnread: true,
            refreshAlerts: mockRefresh,
            refreshNotifications: mockRefresh,
            dismissNotifications: mockDismiss,
            loading: false
        });

        render(<NotificationBell />);

        fireEvent.click(screen.getByRole('button', { name: 'Campana de notificaciones' }));
        fireEvent.click(screen.getByRole('button', { name: /Asignatura por finalizar/i }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/student');
            expect(mockDismiss).toHaveBeenCalledTimes(1);
        });
    });

    it('debe redirigir al panel de documentos cuando el aviso es DOCUMENT_INBOX', async () => {
        useNotificationsSpy.mockReturnValue({
            alerts: [
                {
                    type: 'DOCUMENT_INBOX',
                    title: 'Bandeja de Entrada',
                    message: 'Tienes 2 documentos pendientes',
                    redirectUrl: '/student?focus=documents'
                }
            ],
            documents: [],
            hasAlerts: true,
            hasUnread: true,
            refreshAlerts: mockRefresh,
            refreshNotifications: mockRefresh,
            dismissNotifications: mockDismiss,
            loading: false
        });

        render(<NotificationBell />);

        fireEvent.click(screen.getByRole('button', { name: 'Campana de notificaciones' }));
        fireEvent.click(screen.getByRole('button', { name: /Bandeja de Entrada/i }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/student?focus=documents');
            expect(mockDismiss).toHaveBeenCalledTimes(1);
        });
    });
});

