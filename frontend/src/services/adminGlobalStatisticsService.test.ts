import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getAdminGlobalStatistics,
    finalizeAdminGlobalPreviousYear,
    resolveAdminGlobalStatisticsErrorMessage
} from './adminGlobalStatisticsService';
import { apiClient } from './apiClient';
import axios from 'axios';

vi.mock('./apiClient', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn()
    }
}));

vi.mock('axios', () => ({
    default: {
        isAxiosError: vi.fn()
    }
}));

describe('adminGlobalStatisticsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('consulta el endpoint global de estadísticas admin', async () => {
        const payload = {
            currentYear: 2026,
            totalStudents: 120,
            totalProfessors: 8,
            topCourses: [{ courseId: 1, courseTitle: 'Algebra', enrolledStudents: 33 }],
            yearlyComparisons: []
        };
        vi.mocked(apiClient.get).mockResolvedValue({ data: payload });

        const result = await getAdminGlobalStatistics();

        expect(apiClient.get).toHaveBeenCalledWith('/api/admin/statistics/global');
        expect(result).toEqual(payload);
    });

    it('dispara la consolidación manual del año previo', async () => {
        const payload = {
            message: 'Histórico anual consolidado correctamente.',
            finalizedYear: 2025
        };
        vi.mocked(apiClient.post).mockResolvedValue({ data: payload });

        const result = await finalizeAdminGlobalPreviousYear();

        expect(apiClient.post).toHaveBeenCalledWith('/api/admin/statistics/global/finalize-previous-year');
        expect(result).toEqual(payload);
    });

    it('extrae mensaje de backend en errores axios', () => {
        vi.mocked(axios.isAxiosError).mockReturnValue(true);

        const message = resolveAdminGlobalStatisticsErrorMessage({ response: { data: { message: 'fallo controlado' } } });
        expect(message).toBe('fallo controlado');
    });

    it('devuelve mensaje genérico en errores no axios', () => {
        vi.mocked(axios.isAxiosError).mockReturnValue(false);

        expect(resolveAdminGlobalStatisticsErrorMessage(new Error('boom')))
            .toBe('No se pudo cargar el panel estadístico global.');
    });
});
