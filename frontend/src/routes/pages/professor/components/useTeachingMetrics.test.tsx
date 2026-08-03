import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTeachingMetrics } from './useTeachingMetrics';
import * as teachingMetricsService from '../../../../services/teachingMetricsService';

vi.mock('../../../../services/teachingMetricsService', () => ({
    getTeachingMetricsSummary: vi.fn(),
    getStudentMetricsBreakdown: vi.fn()
}));

describe('useTeachingMetrics', () => {
    const summary = {
        courseId: 10,
        collectiveProgress: 80,
        completionRate: 50,
        averageGrade: 8.5
    };

    const students = [
        {
            userId: 1,
            username: 'alumno1',
            email: 'alumno1@uni.es',
            courseId: 10,
            courseTitle: 'Arquitectura',
            progressPercentage: 90,
            averageGrade: 8.5
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe cargar resumen y desglose al montar el hook', async () => {
        vi.mocked(teachingMetricsService.getTeachingMetricsSummary).mockResolvedValue(summary);
        vi.mocked(teachingMetricsService.getStudentMetricsBreakdown).mockResolvedValue(students);

        const { result } = renderHook(() => useTeachingMetrics(10));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.summary).toEqual(summary);
        expect(result.current.students).toEqual(students);
        expect(result.current.error).toBe('');
        expect(teachingMetricsService.getTeachingMetricsSummary).toHaveBeenCalledWith(10);
        expect(teachingMetricsService.getStudentMetricsBreakdown).toHaveBeenCalledWith(10);
    });

    it('debe exponer error cuando falla la carga de métricas', async () => {
        vi.mocked(teachingMetricsService.getTeachingMetricsSummary).mockRejectedValue(new Error('Fallo de red'));
        vi.mocked(teachingMetricsService.getStudentMetricsBreakdown).mockResolvedValue([]);

        const { result } = renderHook(() => useTeachingMetrics(null));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.summary).toBeNull();
        expect(result.current.students).toEqual([]);
        expect(result.current.error).toBe('No se pudieron cargar las métricas de docencia.');
    });

    it('debe recargar los datos cuando se invoca refresh y cuando cambia el courseId', async () => {
        vi.mocked(teachingMetricsService.getTeachingMetricsSummary)
            .mockResolvedValueOnce(summary)
            .mockResolvedValueOnce({ ...summary, courseId: 20 });
        vi.mocked(teachingMetricsService.getStudentMetricsBreakdown)
            .mockResolvedValueOnce(students)
            .mockResolvedValueOnce([]);

        const { result, rerender } = renderHook(({ courseId }) => useTeachingMetrics(courseId), {
            initialProps: { courseId: 10 }
        });

        await waitFor(() => expect(result.current.summary).toEqual(summary));

        await act(async () => {
            await result.current.refresh();
        });

        expect(teachingMetricsService.getTeachingMetricsSummary).toHaveBeenCalledTimes(2);
        expect(teachingMetricsService.getStudentMetricsBreakdown).toHaveBeenCalledTimes(2);

        rerender({ courseId: 20 });

        await waitFor(() => expect(teachingMetricsService.getTeachingMetricsSummary).toHaveBeenCalledWith(20));
    });
});