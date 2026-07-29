import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthContext } from '../../../auth/AuthContext'; // Asegura que esta ruta apunte a tu AuthContext real
import { useNotifications } from './useNotifications';
import { apiClient } from '../../../services/apiClient';
import * as documentService from '../../../services/documentService';
import type { DocumentMetadata } from '../../../services/documentService';
import type { NotificationDTO } from './useNotifications';

const buildDoc = (isRead: boolean): DocumentMetadata => ({
    documentid: 1,
    filename: 'doc-1.pdf',
    originalname: 'doc-1.pdf',
    upload_date: '2026-07-15T00:00:00.000Z',
    sender: { userId: 2, username: 'profesor', email: 'prof@tfg.com', role: 'PROFESSOR' },
    receiver: { userId: 1, username: 'alumno', email: 'alumno@tfg.com', role: 'STUDENT' },
    folder_type: 'RECEIVED',
    isRead,
});

const buildAuthWrapper = (role: 'STUDENT' | 'PROFESSOR' | 'ADMIN') => {
    const usernameByRole = role === 'PROFESSOR' ? 'profesor' : role === 'ADMIN' ? 'admin' : 'alumno';
    const emailByRole = `${usernameByRole}@tfg.com`;

    return ({ children }: { children: React.ReactNode }) => {
        const mockAuthValue = {
            user: {
                userId: 1,
                username: usernameByRole,
                email: emailByRole,
                role
            },
            isAuthenticated: true,
            isLoading: false,
            login: () => { },
            updateUser: () => { },
            logout: () => { },
        };

        return (
            <AuthContext.Provider value={mockAuthValue as unknown as typeof AuthContext extends React.Context<infer U> ? U : never}>
                {children}
            </AuthContext.Provider>
        );
    };
};

const AuthWrapper = buildAuthWrapper('STUDENT');
const ProfessorAuthWrapper = buildAuthWrapper('PROFESSOR');
const AdminAuthWrapper = buildAuthWrapper('ADMIN');

const NoAuthWrapper = ({ children }: { children: React.ReactNode }) => {
    const mockAuthValue = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: () => { },
        updateUser: () => { },
        logout: () => { },
    };

    return (
        <AuthContext.Provider value={mockAuthValue as unknown as typeof AuthContext extends React.Context<infer U> ? U : never}>
            {children}
        </AuthContext.Provider>
    );
};

describe('useNotifications', () => {
    let currentAlerts: NotificationDTO[];
    let currentDocuments: DocumentMetadata[];

    beforeEach(() => {
        vi.clearAllMocks();

        currentAlerts = [
            {
                type: 'DOCUMENT_INBOX',
                title: 'Nuevo documento',
                message: 'Tienes un documento pendiente',
                redirectUrl: '/student/docs',
            },
        ];
        currentDocuments = [buildDoc(false)];

        vi.spyOn(apiClient, 'get').mockImplementation(async () => ({ data: currentAlerts }) as never);
        vi.spyOn(documentService, 'getUserDocuments').mockImplementation(async () => currentDocuments);
    });

    it('sincroniza el estado entre instancias al refrescar notificaciones globalmente', async () => {
        // CORRECCIÓN: Declaración con const para que TypeScript infiera automáticamente los tipos reales de RenderHookResult
        const bellHook = renderHook(() => useNotifications(), { wrapper: AuthWrapper });
        const panelHook = renderHook(() => useNotifications(), { wrapper: AuthWrapper });

        // 1. Garantizar que ambos hooks han terminado las tareas de carga del backend
        await waitFor(() => {
            expect(bellHook.result.current.loading).toBe(false);
            expect(panelHook.result.current.loading).toBe(false);
        });

        // 2. Comprobar de forma segura que detectan las notificaciones no leídas iniciales
        await waitFor(() => {
            expect(bellHook.result.current.hasUnread).toBe(true);
        });

        await waitFor(() => {
            expect(panelHook.result.current.hasUnread).toBe(true);
        });

        // Simula que el backend ya marcó el documento como leído tras descarga.
        currentDocuments = [buildDoc(true)];
        currentAlerts = []; // Vaciamos también las alertas para que hasUnread pase limpiamente a false

        // Forzamos el refresco global desde la primera instancia
        await act(async () => {
            await bellHook.result.current.refreshNotifications();
        });

        // Forzamos el refresco en la segunda instancia para simular la sincronización del catálogo
        await act(async () => {
            await panelHook.result.current.refreshNotifications();
        });

        // 3. Ambas instancias deben reflejar que ya no quedan elementos pendientes por leer
        await waitFor(() => {
            expect(bellHook.result.current.hasUnread).toBe(false);
            expect(panelHook.result.current.hasUnread).toBe(false);
        });
    });

    it('ejecuta dismiss contra el endpoint y refresca estado', async () => {
        const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({} as never);
        const hook = renderHook(() => useNotifications(), { wrapper: AuthWrapper });

        await waitFor(() => {
            expect(hook.result.current.loading).toBe(false);
        });

        currentAlerts = [];
        currentDocuments = [buildDoc(true)];

        await act(async () => {
            await hook.result.current.dismissNotifications();
        });

        expect(patchSpy).toHaveBeenCalledWith('/api/auth/notifications/dismiss');

        await waitFor(() => {
            expect(hook.result.current.hasUnread).toBe(false);
        });
    });

    it('cortocircuita llamadas remotas si no hay usuario autenticado', async () => {
        const getAlertsSpy = vi.spyOn(apiClient, 'get');
        const getDocsSpy = vi.spyOn(documentService, 'getUserDocuments');

        const hook = renderHook(() => useNotifications(), { wrapper: NoAuthWrapper });

        await waitFor(() => {
            expect(hook.result.current.loading).toBe(false);
        });

        expect(getAlertsSpy).not.toHaveBeenCalled();
        expect(getDocsSpy).not.toHaveBeenCalled();
        expect(hook.result.current.alerts).toEqual([]);
        expect(hook.result.current.documents).toEqual([]);
        expect(hook.result.current.hasUnread).toBe(false);
    });

    it('construye alerta de bandeja desde documentos no leídos si /notifications llega vacío', async () => {
        currentAlerts = [];
        currentDocuments = [buildDoc(false), { ...buildDoc(false), documentid: 2 }];

        const hook = renderHook(() => useNotifications(), { wrapper: AuthWrapper });

        await waitFor(() => {
            expect(hook.result.current.loading).toBe(false);
        });

        expect(hook.result.current.hasUnread).toBe(true);
        expect(hook.result.current.alerts).toHaveLength(1);
        expect(hook.result.current.alerts[0].type).toBe('DOCUMENT_INBOX');
        expect(hook.result.current.alerts[0].message).toContain('2 documento(s)');
        expect(hook.result.current.alerts[0].redirectUrl).toContain('/student?focus=documents');
        expect(hook.result.current.alerts[0].redirectUrl).toContain('documentId=1');
    });

    it('normaliza redirectUrl de DOCUMENT_INBOX para profesor hacia su zona de documentos', async () => {
        currentAlerts = [
            {
                type: 'DOCUMENT_INBOX',
                title: 'Bandeja',
                message: 'Tienes un documento pendiente',
                redirectUrl: '/professor'
            }
        ];

        const hook = renderHook(() => useNotifications(), { wrapper: ProfessorAuthWrapper });

        await waitFor(() => {
            expect(hook.result.current.loading).toBe(false);
        });

        expect(hook.result.current.alerts[0].redirectUrl).toContain('/professor?focus=documents');
        expect(hook.result.current.alerts[0].redirectUrl).toContain('documentId=1');
        expect(hook.result.current.alerts[0].redirectUrl).toContain('senderId=2');
    });

    it('normaliza redirectUrl de DOCUMENT_INBOX para admin hacia su zona de documentos', async () => {
        currentAlerts = [
            {
                type: 'DOCUMENT_INBOX',
                title: 'Bandeja',
                message: 'Tienes un documento pendiente',
                redirectUrl: '/admin'
            }
        ];

        const hook = renderHook(() => useNotifications(), { wrapper: AdminAuthWrapper });

        await waitFor(() => {
            expect(hook.result.current.loading).toBe(false);
        });

        expect(hook.result.current.alerts[0].redirectUrl).toContain('/admin?focus=documents');
        expect(hook.result.current.alerts[0].redirectUrl).toContain('documentId=1');
    });
});
