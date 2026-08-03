import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStudentMetricsBreakdown, getTeachingMetricsSummary } from './teachingMetricsService';
import { apiClient } from './apiClient';

vi.mock('./apiClient', () => ({
    apiClient: {
        get: vi.fn()
    }
}));

type MockedApiClient = {
    get: ReturnType<typeof vi.fn>;
};

const mockedApi = apiClient as unknown as MockedApiClient;

describe('teachingMetricsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe consultar el resumen global sin parámetros cuando courseId es null', async () => {
        const payload = {
            courseId: null,
            collectiveProgress: 81.5,
            completionRate: 33.3,
            averageGrade: 8.9
        };
        mockedApi.get.mockResolvedValueOnce({ data: payload });

        const result = await getTeachingMetricsSummary(null);

        expect(result).toEqual(payload);
        expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/teacher/metrics/summary', { params: {} });
    });

    it('debe consultar el resumen de una asignatura concreta con el courseId en query params', async () => {
        mockedApi.get.mockResolvedValueOnce({ data: { courseId: 12 } });

        await getTeachingMetricsSummary(12);

        expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/teacher/metrics/summary', {
            params: { courseId: 12 }
        });
    });

    it('debe consultar el desglose de alumnos sin parámetros cuando courseId es null', async () => {
        const payload = [
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
        mockedApi.get.mockResolvedValueOnce({ data: payload });

        const result = await getStudentMetricsBreakdown(null);

        expect(result).toEqual(payload);
        expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/teacher/metrics/students', { params: {} });
    });

    it('debe consultar el desglose de alumnos filtrando por courseId', async () => {
        mockedApi.get.mockResolvedValueOnce({ data: [] });

        await getStudentMetricsBreakdown(27);

        expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/teacher/metrics/students', {
            params: { courseId: 27 }
        });
    });
});