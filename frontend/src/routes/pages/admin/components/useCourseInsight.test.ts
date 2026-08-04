import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCourseInsight } from './useCourseInsight';
import {
    searchCourses,
    getCourseDetail,
    getCourseUserStats,
    getCourseCollectiveStats,
    resolveCourseInsightErrorMessage
} from '../../../../services/adminCourseInsightService';

vi.mock('../../../../services/adminCourseInsightService', () => ({
    searchCourses: vi.fn(),
    getCourseDetail: vi.fn(),
    getCourseUserStats: vi.fn(),
    getCourseCollectiveStats: vi.fn(),
    resolveCourseInsightErrorMessage: vi.fn()
}));

const fakeFormEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

const sampleCourse = { courseId: 300, title: 'Arquitectura de Software', category: 'Ingenieria' };
const sampleDetail = {
    courseId: 300,
    title: 'Arquitectura de Software',
    professor: { userId: 20, username: 'laura_teacher', role: 'PROFESSOR' as const, enabled: true },
    students: [{ userId: 10, username: 'laura_student', role: 'STUDENT' as const, enabled: true }]
};
const sampleStats = {
    activeStudentsInCourse: 12,
    studentProgressPercentage: 65,
    courseAverageProgressPercentage: 60,
    studentGrades: [{ title: 'Examen Final', score: 8.5 }],
    workGrade: null,
    finalExamGrade: 8.5,
    completionRatePercentage: 100,
    averageCourseRating: 4.2,
    averageInstructorRating: 4.6
};

const sampleCollectiveStats = {
    activeStudentsInCourse: 12,
    courseAverageProgressPercentage: 60,
    completionRatePercentage: 75,
    averageCourseRating: 4.2,
    averageInstructorRating: 4.6,
    averageGrade: 7.8,
    averageWorkGrade: 7.4,
    averageFinalExamGrade: 8.1
};

describe('useCourseInsight', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('no busca si el keyword está vacío', async () => {
        const { result } = renderHook(() => useCourseInsight());

        await act(async () => {
            await result.current.handleSearch(fakeFormEvent);
        });

        expect(searchCourses).not.toHaveBeenCalled();
    });

    it('handleSearch guarda los resultados y limpia la selección previa', async () => {
        vi.mocked(searchCourses).mockResolvedValue([sampleCourse]);

        const { result } = renderHook(() => useCourseInsight());

        act(() => {
            result.current.setKeyword('Arquitectura');
        });

        await act(async () => {
            await result.current.handleSearch(fakeFormEvent);
        });

        expect(result.current.results).toEqual([sampleCourse]);
        expect(result.current.selectedCourse).toBeNull();
        expect(result.current.selectedUser).toBeNull();
    });

    it('handleSearch captura errores y los traduce mediante el servicio', async () => {
        vi.mocked(searchCourses).mockRejectedValue(new Error('network-error'));
        vi.mocked(resolveCourseInsightErrorMessage).mockReturnValue('Error al consultar la información estadística del curso.');

        const { result } = renderHook(() => useCourseInsight());

        act(() => {
            result.current.setKeyword('Arquitectura');
        });

        await act(async () => {
            await result.current.handleSearch(fakeFormEvent);
        });

        expect(result.current.error).toBe('Error al consultar la información estadística del curso.');
        expect(result.current.results).toEqual([]);
    });

    it('handleSelectCourse carga el detalle del curso seleccionado', async () => {
        vi.mocked(getCourseDetail).mockResolvedValue(sampleDetail);
        vi.mocked(getCourseCollectiveStats).mockResolvedValue(sampleCollectiveStats);

        const { result } = renderHook(() => useCourseInsight());

        await act(async () => {
            await result.current.handleSelectCourse(300);
        });

        expect(getCourseDetail).toHaveBeenCalledWith(300);
        expect(getCourseCollectiveStats).toHaveBeenCalledWith(300);
        expect(result.current.selectedCourse).toEqual(sampleDetail);
        expect(result.current.collectiveStats).toEqual(sampleCollectiveStats);
        expect(result.current.selectedUser).toBeNull();
        expect(result.current.stats).toBeNull();
    });

    it('handleSelectUser no hace nada si no hay curso seleccionado', async () => {
        const { result } = renderHook(() => useCourseInsight());

        await act(async () => {
            await result.current.handleSelectUser(sampleDetail.students[0]);
        });

        expect(getCourseUserStats).not.toHaveBeenCalled();
    });

    it('handleSelectUser carga las estadísticas del usuario dentro del curso seleccionado', async () => {
        vi.mocked(getCourseDetail).mockResolvedValue(sampleDetail);
        vi.mocked(getCourseCollectiveStats).mockResolvedValue(sampleCollectiveStats);
        vi.mocked(getCourseUserStats).mockResolvedValue(sampleStats);

        const { result } = renderHook(() => useCourseInsight());

        await act(async () => {
            await result.current.handleSelectCourse(300);
        });

        await act(async () => {
            await result.current.handleSelectUser(sampleDetail.students[0]);
        });

        expect(getCourseUserStats).toHaveBeenCalledWith(300, 10);
        expect(result.current.selectedUser).toEqual(sampleDetail.students[0]);
        expect(result.current.stats).toEqual(sampleStats);
    });

    it('handleSelectUser captura errores al consultar estadísticas', async () => {
        vi.mocked(getCourseDetail).mockResolvedValue(sampleDetail);
        vi.mocked(getCourseCollectiveStats).mockResolvedValue(sampleCollectiveStats);
        vi.mocked(getCourseUserStats).mockRejectedValue(new Error('stats-error'));
        vi.mocked(resolveCourseInsightErrorMessage).mockReturnValue('Error al consultar la información estadística del curso.');

        const { result } = renderHook(() => useCourseInsight());

        await act(async () => {
            await result.current.handleSelectCourse(300);
        });

        await act(async () => {
            await result.current.handleSelectUser(sampleDetail.students[0]);
        });

        expect(result.current.error).toBe('Error al consultar la información estadística del curso.');
        expect(result.current.stats).toBeNull();
    });

    it('handleSearch conserva resultado vacío cuando no hay cursos que empiecen por el prefijo buscado', async () => {
        vi.mocked(searchCourses).mockResolvedValue([
            { courseId: 901, title: 'Matemáticas Discretas', category: 'CS' }
        ]);

        const { result } = renderHook(() => useCourseInsight());

        act(() => {
            result.current.setKeyword('Ar');
        });

        await act(async () => {
            await result.current.handleSearch(fakeFormEvent);
        });

        expect(result.current.results).toEqual([]);
        expect(result.current.highlightedResultIndex).toBe(-1);
        expect(result.current.error).toBe('');
    });

    it('handleSelectCourse muestra error funcional cuando el curso no existe (404)', async () => {
        const notFoundError = Object.assign(new Error('Not Found'), { status: 404 });
        vi.mocked(getCourseDetail).mockRejectedValue(notFoundError);
        vi.mocked(getCourseCollectiveStats).mockRejectedValue(notFoundError);
        vi.mocked(resolveCourseInsightErrorMessage).mockReturnValue('No se encontró el curso solicitado.');

        const { result } = renderHook(() => useCourseInsight());

        await act(async () => {
            await result.current.handleSelectCourse(99999);
        });

        expect(result.current.selectedCourse).toBeNull();
        expect(result.current.collectiveStats).toBeNull();
        expect(result.current.error).toBe('No se encontró el curso solicitado.');
        expect(result.current.loadingDetail).toBe(false);
        expect(result.current.loadingCollectiveStats).toBe(false);
    });

    it('handleSelectCourse captura fallo de red y mantiene estado consistente', async () => {
        vi.mocked(getCourseDetail).mockRejectedValue(new Error('network-down'));
        vi.mocked(getCourseCollectiveStats).mockResolvedValue(sampleCollectiveStats);
        vi.mocked(resolveCourseInsightErrorMessage).mockReturnValue('Error de red al cargar el detalle del curso.');

        const { result } = renderHook(() => useCourseInsight());

        await act(async () => {
            await result.current.handleSelectCourse(300);
        });

        expect(result.current.selectedCourse).toBeNull();
        expect(result.current.collectiveStats).toBeNull();
        expect(result.current.error).toBe('Error de red al cargar el detalle del curso.');
        expect(result.current.loadingDetail).toBe(false);
        expect(result.current.loadingCollectiveStats).toBe(false);
    });
});