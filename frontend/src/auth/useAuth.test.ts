import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useAuth } from './useAuth';
import { AuthContext } from './AuthContext';
import type { ReactNode, Provider } from 'react';

// --- AISLAMIENTO PERIMETRAL ESTRICTO: INITIALIZACIÓN CONTROLADA DEL CONTEXTO ---
vi.mock('./AuthContext', () => ({
    AuthContext: React.createContext<unknown>(undefined),
}));

describe('useAuth - Suite de Pruebas Unitarias Completa', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe lanzar una excepción corporativa explícita si el hook se consume fuera de un AuthProvider', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => renderHook(() => useAuth())).toThrow(
            'useAuth debe usarse dentro de <AuthProvider>. Verifica que el árbol esté envuelto por AuthProvider en main.tsx.'
        );

        consoleSpy.mockRestore();
    });

    it('debe retornar limpiamente el valor completo del dominio de autenticación si se encuentra envuelto por el proveedor', () => {
        const mockAuthContextValue = {
            user: { username: 'coole_engineer_2026', role: 'SOFTWARE_ENGINEER' },
            login: vi.fn(),
            logout: vi.fn(),
            isAuthenticated: true,
        };

        // CORRECCIÓN QUIRÚRGICA: Doble casteo estricto parcial ('as unknown as Provider<unknown>') para satisfacer la firma genérica de sobrecarga de React.createElement
        const providerComponent = (AuthContext.Provider as unknown) as Provider<unknown>;

        const wrapper = ({ children }: { children: ReactNode }) => (
            React.createElement(providerComponent, { value: mockAuthContextValue }, children)
        );

        // Renderizar el hook inyectando el perímetro contextual controlado
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Aserciones de correspondencia exacta y fidelidad técnica funcionales
        expect(result.current as unknown).toEqual(mockAuthContextValue);
        expect((result.current as { user: { username: string } | null }).user?.username).toBe('coole_engineer_2026');
        expect((result.current as { isAuthenticated: boolean }).isAuthenticated).toBe(true);
    });
});
