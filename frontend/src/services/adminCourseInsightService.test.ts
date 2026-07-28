import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    searchCourses,
    getCourseDetail,
    getCourseUserStats,
    resolveCourseInsightErrorMessage
} from './adminCourseInsightService';
import { apiClient } from './apiClient';
import axios from 'axios';

vi.mock('./apiClient', () => ({
    apiClient: {
        get: vi.fn()
    }
}));

vi.mock('axios', () => ({
    default: {
        isAxiosError: vi.fn()
    }
}));

describe('adminCourseInsightService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('searchCourses consulta el endpoint correcto con el keyword como parámetro', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({
            data: [{ courseId: 300, title: 'Arquitectura de Software', category: 'Ingenieria' }]
        });

        const result = await searchCourses('Arquitectura');

        expect(apiClient.get).toHaveBeenCalledWith('/api/admin/courses/search', {
            params: { keyword: 'Arquitectura' }
        });
        expect(result).toEqual([{ courseId: 300, title: 'Arquitectura de Software', category: 'Ingenieria' }]);
    });

    it('getCourseDetail consulta el detalle del curso por id', async () => {
        const detail = {
            courseId: 300,
            title: 'Arquitectura de Software',
            professor: { userId: 20, username: 'laura_teacher', role: 'PROFESSOR', enabled: true },
            students: []
        };
        vi.mocked(apiClient.get).mockResolvedValue({ data: detail });

        const result = await getCourseDetail(300);

        expect(apiClient.get).toHaveBeenCalledWith('/api/admin/courses/300');
        expect(result).toEqual(detail);
    });

    it('getCourseUserStats consulta las estadísticas del usuario dentro del curso', async () => {
        const stats = {
            activeStudentsInCourse: 12,
            studentProgressPercentage: 65,
            courseAverageProgressPercentage: 60,
            studentGrades: [{ title: 'Examen Final', score: 8.5 }],
            completionRatePercentage: 100,
            averageCourseRating: 4.2,
            averageInstructorRating: 4.6
        };
        vi.mocked(apiClient.get).mockResolvedValue({ data: stats });

        const result = await getCourseUserStats(300, 10);

        expect(apiClient.get).toHaveBeenCalledWith('/api/admin/courses/300/users/10/stats');
        expect(result).toEqual(stats);
    });

    it('resolveCourseInsightErrorMessage devuelve el error del backend si existe', () => {
        const err = { response: { data: { error: 'Curso no encontrado.' } } };
        vi.mocked(axios.isAxiosError).mockReturnValue(true);

        expect(resolveCourseInsightErrorMessage(err)).toBe('Curso no encontrado.');
    });

    it('resolveCourseInsightErrorMessage devuelve el mensaje genérico para otros errores', () => {
        vi.mocked(axios.isAxiosError).mockReturnValue(false);

        expect(resolveCourseInsightErrorMessage(new Error('boom')))
            .toBe('Error al consultar la información estadística del curso.');
    });
});