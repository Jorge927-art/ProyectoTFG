import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

import { useCourseStats } from './useCourseStats';
import { apiClient } from '@/services/apiClient';
import type { CourseStatsInfo } from '../../../../services/courseTypes';

// =========================================================================
// 1. AISLAMIENTO CENTRALIZADO DE LA CAPA DE RED (AXIOS INTERCEPTADO)
// =========================================================================
vi.mock('@/services/apiClient', () => ({
    apiClient: {
        get: vi.fn()
    }
}));

describe('useCourseStats - Suite de Pruebas Unitarias del Hook Analítico', () => {
    
    // Objeto mock de métricas agregadas bajo la interfaz inmutable CourseStatsInfo
    const mockStatsData: CourseStatsInfo = {
        totalStudents: 45,
        completionRate: 88.5,
        averageGrade: 7.8,
        activeSubmissions: 12
    } as unknown as CourseStatsInfo; // Casteo parcial seguro para adaptarlo a tu DTO real

    beforeEach(() => {
        vi.clearAllMocks();
    });

    /* =========================================================================
       1. CONTROL DE CORTOCIRCUITO DEFENSIVO ANTE IDs INVÁLIDOS o NULOS
       ========================================================================= */
    it('Debe bloquear la llamada HTTP síncronamente y retornar null si el ID es nulo, indefinido o menor a 1', () => {
        const { result, rerender } = renderHook(({ id }) => useCourseStats(id), {
            initialProps: { id: null as number | null | undefined }
        });

        // Caso 1: ID nulo
        expect(result.current.stats).toBeNull();
        expect(result.current.loadingStats).toBe(false);
        expect(apiClient.get).not.toHaveBeenCalled();

        // Caso 2: Re-renderizar inyectando un ID indefinido
        rerender({ id: undefined });
        expect(result.current.stats).toBeNull();
        expect(apiClient.get).not.toHaveBeenCalled();

        // Caso 3: Re-renderizar inyectando un ID negativo que viola la persistencia
        rerender({ id: -5 });
        expect(result.current.stats).toBeNull();
        expect(apiClient.get).not.toHaveBeenCalled();
    });

    /* =========================================================================
       2. CONTROL DE RESOLUCIÓN ASÍNCRONA Y ESTADOS DE CARGA (CASO ÉXITO)
       ========================================================================= */
    it('Debe alternar loadingStats a true e hidratar las métricas si Spring Boot responde con éxito', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({
            status: 200,
            data: mockStatsData
        });

        // Lanzamos el hook con un ID válido de asignatura
        const { result } = renderHook(() => useCourseStats(42));

        // Validación síncrona inmediata de la transición de carga
        expect(result.current.loadingStats).toBe(true);
        expect(result.current.statsError).toBe('');

        // Esperamos la resolución asíncrona de la promesa de red sin bloquear el hilo
        await waitFor(() => {
            expect(result.current.loadingStats).toBe(false);
            expect(result.current.stats).toEqual(mockStatsData);
            expect(result.current.statsError).toBe('');
        });

        expect(apiClient.get).toHaveBeenCalledWith('/api/v1/stats/course/42');
        expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    /* =========================================================================
       3. GESTIÓN DE EXCEPCIONES Y CAPTURA DE ERRORES EN LA AGREGACIÓN
       ========================================================================= */
    it('Debe capturar la excepción de red, inyectar el aviso descriptivo y apagar el spinner', async () => {
        // Simulamos un fallo crítico 500 en las agregaciones de PostgreSQL
        vi.mocked(apiClient.get).mockRejectedValue(new Error('Fallo de conexión en DB'));

        const { result } = renderHook(() => useCourseStats(42));

        await waitFor(() => {
            expect(result.current.loadingStats).toBe(false);
            expect(result.current.stats).toBeNull();
            expect(result.current.statsError).toBe('No se pudieron cargar las métricas consolidadas del catálogo.');
        });
    });

    /* =========================================================================
       4. REACTIVIDAD DINÁMICA ANTE CAMBIOS DE PROPIEDADES (RE-RENDER)
       ========================================================================= */
    it('Debe disparar una nueva solicitud HTTP si el ID del curso muta dinámicamente', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ status: 200, data: mockStatsData });

        const { result, rerender } = renderHook(({ id }) => useCourseStats(id), {
            initialProps: { id: 42 }
        });

        await waitFor(() => expect(result.current.loadingStats).toBe(false));
        expect(apiClient.get).toHaveBeenCalledWith('/api/v1/stats/course/42');

        // Modificamos las propiedades inyectando un nuevo curso ID: 99
        rerender({ id: 99 });

        expect(result.current.loadingStats).toBe(true);

        await waitFor(() => {
            expect(result.current.loadingStats).toBe(false);
        });
        expect(apiClient.get).toHaveBeenCalledWith('/api/v1/stats/course/99');
        expect(apiClient.get).toHaveBeenCalledTimes(2);
    });
    /* =========================================================================
       5. CONTROL DEL DISPARADOR DE REFRESCO OPERATIVO (REFRESH)
       ========================================================================= */
    it('Debe invocar nuevamente el endpoint si se ejecuta la función refreshStats de forma explícita', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ status: 200, data: mockStatsData });

        const { result } = renderHook(() => useCourseStats(42));

        await waitFor(() => expect(result.current.loadingStats).toBe(false));
        expect(apiClient.get).toHaveBeenCalledTimes(1);

        // [CORRECCIÓN CRÍTICA]: Envolvemos la acción reactiva en act para sincronizar el bucle de eventos
        act(() => {
            result.current.refreshStats();
        });

        // Esperamos directamente a que termine el refresco evaluando que se sume la segunda petición HTTP
        await waitFor(() => {
            expect(result.current.loadingStats).toBe(false);
            expect(apiClient.get).toHaveBeenCalledTimes(2);
        });
    });
});
   
