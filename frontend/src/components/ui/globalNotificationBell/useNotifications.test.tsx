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

// Componente Wrapper para inyectar de forma controlada la sesión del alumno en las pruebas
// Componente Wrapper para inyectar de forma controlada la sesión del alumno en las pruebas
const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
    const mockAuthValue = {
        user: {
            user_id: 1,
            username: 'alumno',
            email: 'alumno@tfg.com',
            role: 'STUDENT' as const // SOLUCIÓN: Usamos 'as const' para que TypeScript infiera el literal exacto sin usar 'any'
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
        // Inyectamos el wrapper en ambas instancias del hook para que lean al alumno simulado
        const bellHook = renderHook(() => useNotifications(), { wrapper: AuthWrapper });
        const panelHook = renderHook(() => useNotifications(), { wrapper: AuthWrapper });

        await waitFor(() => {
            expect(bellHook.result.current.loading).toBe(false);
            expect(panelHook.result.current.loading).toBe(false);
        });

        await waitFor(() => {
            expect(bellHook.result.current.hasUnread).toBe(true);
            expect(panelHook.result.current.hasUnread).toBe(true);
        });

        // Simula que el backend ya marcó el documento como leído tras descarga.
        currentDocuments = [buildDoc(true)];

        await act(async () => {
            bellHook.result.current.refreshNotifications();
        });

        await waitFor(() => {
            expect(bellHook.result.current.hasUnread).toBe(false);
            expect(panelHook.result.current.hasUnread).toBe(false);
        });
    });
});
