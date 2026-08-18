import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCourseInsight } from './useCourseInsight';
import {
    searchCourses,
    getCourseDetail,
    getCourseUserStats,
    getCourseCollectiveStats,
    finalizePreviousYearCourseStats,
    resolveCourseInsightErrorMessage
} from '../../../../services/adminCourseInsightService';

vi.mock('../../../../services/adminCourseInsightService', () => ({
    searchCourses: vi.fn(),
    getCourseDetail: vi.fn(),
    getCourseUserStats: vi.fn(),
    getCourseCollectiveStats: vi.fn(),
    finalizePreviousYearCourseStats: vi.fn(),
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
    averageFinalExamGrade: 8.1,
    yearlyComparisons: [
        { year: 2025, activeStudentsInCourse: 10, courseAverageProgressPercentage: 55, approvalIndexPercentage: 70, averageCourseRating: 4.0, averageInstructorRating: 4.3, averageGrade: 7.1, averageWorkGrade: 6.8, averageFinalExamGrade: 7.5, realData: false },
        { year: 2024, activeStudentsInCourse: 8, courseAverageProgressPercentage: 50, approvalIndexPercentage: 65, averageCourseRating: 3.8, averageInstructorRating: 4.1, averageGrade: 6.9, averageWorkGrade: 6.5, averageFinalExamGrade: 7.2, realData: false },
    ],
    studentStatistics: []
};

describe('useCourseInsight', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
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

    it('ejecuta la búsqueda predictiva tras el debounce y permite navegar por resultados con teclado', async () => {
        vi.useFakeTimers();
        vi.mocked(searchCourses).mockResolvedValue([
            { courseId: 301, title: 'Arquitectura', category: 'Ingenieria' },
            { courseId: 302, title: 'Algoritmos', category: 'Ingenieria' },
        ]);

        const { result } = renderHook(() => useCourseInsight());

        act(() => {
            result.current.setKeyword('A');
        });
        await act(async () => {
            vi.advanceTimersByTime(250);
            await Promise.resolve();
        });

        expect(result.current.results).toHaveLength(2);
        expect(result.current.highlightedResultIndex).toBe(0);

        const preventDefault = vi.fn();
        act(() => {
            result.current.handleSearchInputKeyDown({ key: 'ArrowDown', preventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>);
        });
        expect(result.current.highlightedResultIndex).toBe(1);

        act(() => {
            result.current.handleSearchInputKeyDown({ key: 'ArrowUp', preventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>);
        });
        expect(result.current.highlightedResultIndex).toBe(0);
        expect(preventDefault).toHaveBeenCalledTimes(2);

        act(() => {
            result.current.handleSearchInputKeyDown({ key: 'Escape', preventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>);
        });
        expect(result.current.results).toEqual([]);
        expect(result.current.highlightedResultIndex).toBe(-1);
    });

    it('selecciona el resultado resaltado al pulsar Enter', async () => {
        vi.useFakeTimers();
        vi.mocked(searchCourses).mockResolvedValue([sampleCourse]);
        vi.mocked(getCourseDetail).mockResolvedValue(sampleDetail);
        vi.mocked(getCourseCollectiveStats).mockResolvedValue(sampleCollectiveStats);

        const { result } = renderHook(() => useCourseInsight());

        act(() => {
            result.current.setKeyword('Ar');
        });
        await act(async () => {
            vi.advanceTimersByTime(250);
            await Promise.resolve();
        });

        const preventDefault = vi.fn();
        act(() => {
            result.current.handleSearchInputKeyDown({ key: 'Enter', preventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>);
        });
        await act(async () => {
            await Promise.resolve();
        });

        expect(preventDefault).toHaveBeenCalledOnce();
        expect(getCourseDetail).toHaveBeenCalledWith(300);
        expect(result.current.selectedCourse).toEqual(sampleDetail);
    });

    it('ignora las teclas de navegación cuando no hay resultados', () => {
        const preventDefault = vi.fn();
        const { result } = renderHook(() => useCourseInsight());

        act(() => {
            result.current.handleSearchInputKeyDown({ key: 'ArrowDown', preventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>);
        });

        expect(preventDefault).not.toHaveBeenCalled();
        expect(result.current.highlightedResultIndex).toBe(-1);
    });

    it('descarta la respuesta de una búsqueda que quedó obsoleta', async () => {
        vi.useFakeTimers();
        type SearchResponse = Array<{ courseId: number; title: string; category: string }>;
        const resolvers: Array<(value: SearchResponse) => void> = [];
        vi.mocked(searchCourses).mockImplementation(
            () => new Promise<SearchResponse>((resolve) => {
                resolvers.push(resolve);
            })
        );

        const { result } = renderHook(() => useCourseInsight());

        act(() => {
            result.current.setKeyword('A');
        });
        act(() => {
            vi.advanceTimersByTime(250);
        });

        act(() => {
            result.current.setKeyword('Ar');
        });
        act(() => {
            vi.advanceTimersByTime(250);
        });

        expect(resolvers).toHaveLength(2);
        await act(async () => {
            resolvers[0]([sampleCourse]);
            await Promise.resolve();
        });
        expect(result.current.results).toEqual([]);

        await act(async () => {
            resolvers[1]([sampleCourse]);
            await Promise.resolve();
        });
        expect(result.current.results).toEqual([sampleCourse]);
    });

    it('limpia resultados y selecciones al vaciar la búsqueda', async () => {
        vi.mocked(searchCourses).mockResolvedValue([sampleCourse]);
        vi.mocked(getCourseDetail).mockResolvedValue(sampleDetail);
        vi.mocked(getCourseCollectiveStats).mockResolvedValue(sampleCollectiveStats);

        const { result } = renderHook(() => useCourseInsight());

        await act(async () => {
            await result.current.handleSelectCourse(300);
        });
        act(() => {
            result.current.setKeyword('Arquitectura');
        });
        act(() => {
            result.current.setKeyword('');
        });

        expect(result.current.results).toEqual([]);
        expect(result.current.selectedCourse).toBeNull();
        expect(result.current.selectedUser).toBeNull();
        expect(result.current.stats).toBeNull();
        expect(result.current.collectiveStats).toBeNull();
        expect(result.current.error).toBe('');
    });

    it('no consolida si todavía no hay curso seleccionado', async () => {
        const { result } = renderHook(() => useCourseInsight());

        await act(async () => {
            await result.current.handleFinalizePreviousYear();
        });

        expect(finalizePreviousYearCourseStats).not.toHaveBeenCalled();
        expect(result.current.consolidating).toBe(false);
    });

    it('consolida el año anterior, muestra éxito y refresca el curso', async () => {
        vi.mocked(getCourseDetail).mockResolvedValue(sampleDetail);
        vi.mocked(getCourseCollectiveStats).mockResolvedValue(sampleCollectiveStats);
        vi.mocked(finalizePreviousYearCourseStats).mockResolvedValue({
            message: 'Histórico consolidado correctamente',
            finalizedYear: 2025,
        });

        const { result } = renderHook(() => useCourseInsight());

        await act(async () => {
            await result.current.handleSelectCourse(300);
        });
        await act(async () => {
            await result.current.handleFinalizePreviousYear();
        });

        expect(finalizePreviousYearCourseStats).toHaveBeenCalledWith(300);
        expect(getCourseDetail).toHaveBeenCalledTimes(2);
        expect(result.current.successMessage).toBe('Histórico consolidado correctamente Año consolidado: 2025.');
        expect(result.current.consolidating).toBe(false);
    });

    it('muestra error cuando falla la consolidación del año anterior', async () => {
        vi.mocked(getCourseDetail).mockResolvedValue(sampleDetail);
        vi.mocked(getCourseCollectiveStats).mockResolvedValue(sampleCollectiveStats);
        vi.mocked(finalizePreviousYearCourseStats).mockRejectedValue(new Error('consolidation-error'));
        vi.mocked(resolveCourseInsightErrorMessage).mockReturnValue('No se pudo consolidar el histórico.');

        const { result } = renderHook(() => useCourseInsight());

        await act(async () => {
            await result.current.handleSelectCourse(300);
        });
        await act(async () => {
            await result.current.handleFinalizePreviousYear();
        });

        expect(result.current.error).toBe('No se pudo consolidar el histórico.');
        expect(result.current.consolidating).toBe(false);
        expect(result.current.successMessage).toBe('');
    });
});