import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCourseCatalog } from './useCourseCatalog';
import { apiClient } from '../../../../services/apiClient';
import axios from 'axios';
import type { DBModelCourse } from '../../../../services/courseTypes';

// --- AISLAMIENTO PERIMETRAL ESTRICTO: MOCK TIPADO DE API_CLIENT ---
vi.mock('../../../../services/apiClient', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

type MockedApiClient = {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
};

const mockedApi = apiClient as unknown as MockedApiClient;

describe('useCourseCatalog - Suite de Pruebas Unitarias de Lógica Predictiva', () => {
    
    const mockOnEnrollSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // --- ACCESORIOS DE PAYLOADS COMPLEJOS (FIXTURES) ---
    const mockCoursesCatalog: DBModelCourse[] = [
        {
            course_id: 201,
            title: 'Ingeniería de Software con NestJS',
            category: 'Backend',
            instructors: 'Dr. Arquitectura',
            duration: 50
        },
        {
            course_id: 202,
            title: 'Diseño de Sistemas Distribuidos',
            category: 'Arquitectura',
            instructors: 'Ing. Cloud',
            duration: 80
        }
    ];
    // --- BLOQUE 1: MECANISMO DE DEBOUNCE Y BUSCADOR PREDICTIVO ---
    it('debe orquestar el debounce de 400ms retrasando la llamada a la API hasta que cese la escritura', async () => {
        mockedApi.get.mockResolvedValue({ status: 200, data: mockCoursesCatalog });

        const { result } = renderHook(() => useCourseCatalog(mockOnEnrollSuccess));

        act(() => {
            vi.advanceTimersByTime(399);
        });
        expect(mockedApi.get).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(1);
            await Promise.resolve();
        });
        expect(mockedApi.get).toHaveBeenCalledTimes(1);
        expect(mockedApi.get).toHaveBeenCalledWith('/api/courses/search', { params: {} });

        act(() => {
            result.current.setSearchKeyword('React');
        });

        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(mockedApi.get).toHaveBeenCalledTimes(1);

        await act(async () => {
            vi.advanceTimersByTime(200);
            await Promise.resolve();
        });
        expect(mockedApi.get).toHaveBeenCalledTimes(2);
        expect(mockedApi.get).toHaveBeenLastCalledWith('/api/courses/search', { params: { keyword: 'React' } });
    });

    it('debe sanear espacios y neutralizar strings vacíos evitando enviar "?keyword=" al backend', async () => {
        mockedApi.get.mockResolvedValueOnce({ status: 200, data: [] });

        const { result } = renderHook(() => useCourseCatalog(mockOnEnrollSuccess));

        await act(async () => {
            result.current.setSearchKeyword('   ');
            vi.advanceTimersByTime(400);
            await Promise.resolve();
        });

        expect(mockedApi.get).toHaveBeenLastCalledWith('/api/courses/search', { params: {} });
    });

    // --- BLOQUE 2: FLUJOS DE ACCIÓN Y MATRICULACIÓN EXITOSA (HAPPY PATHS) ---
    it('debe procesar handleEnrollCourse, disparar el callback de éxito y refrescar el catálogo en caliente', async () => {
        mockedApi.get.mockResolvedValue({ status: 200, data: mockCoursesCatalog });
        mockedApi.post.mockResolvedValueOnce({ status: 201 });

        const { result } = renderHook(() => useCourseCatalog(mockOnEnrollSuccess));

        await act(async () => {
            vi.advanceTimersByTime(400);
            await Promise.resolve();
        });

        // CORRECCIÓN QUIRÚRGICA INTERMEDIA: Separación síncrona del disparo del estado frente a su resolución asíncrona posterior
        let enrollPromise: Promise<void>;
        act(() => {
            enrollPromise = result.current.handleEnrollCourse(201);
        });

        // Asegurar que el identificador está bloqueado en el estado de carga transicional antes de que se limpie en el finally
        expect(result.current.enrollingId).toBe(201);

        // Resolver la operación asíncronamente y vaciar el micro-event loop
        await act(async () => {
            await enrollPromise;
            await Promise.resolve();
        });

        expect(result.current.enrollingId).toBeNull();
        expect(mockedApi.post).toHaveBeenCalledWith('/api/courses/enroll/201');
        expect(mockOnEnrollSuccess).toHaveBeenCalledTimes(1);
        expect(mockOnEnrollSuccess).toHaveBeenCalledWith(mockCoursesCatalog[0]);

        expect(mockedApi.get).toHaveBeenCalledTimes(2);
    });
    // --- BLOQUE 3: GESTIÓN DE EXCEPCIONES Y ERRORES CONFIGURADOS DE AXIOS ---
    it('debe propagar fallbacks corporativos genéricos ante excepciones ordinarias de red', async () => {
        mockedApi.get.mockRejectedValueOnce(new Error('Fallo crítico en el cluster de base de datos'));

        const { result } = renderHook(() => useCourseCatalog(mockOnEnrollSuccess));

        await act(async () => {
            vi.advanceTimersByTime(400);
            await Promise.resolve();
        });

        expect(result.current.loadingCatalog).toBe(false);
        expect(result.current.catalogError).toBe('No se pudo sincronizar el catálogo de cursos en tiempo real.');
        expect(result.current.catalogCourses).toEqual([]);
        expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('debe decodificar quirúrgicamente errores tipados de Axios y extraer los mensajes específicos del backend', async () => {
        mockedApi.get.mockResolvedValue({ status: 200, data: mockCoursesCatalog });
        
        const customAxiosError = {
            isAxiosError: true,
            response: {
                status: 400,
                data: { message: 'LÍMITE EXCEDIDO: Ya constas matriculado en este grupo académico del TFG.' }
            }
        };

        vi.spyOn(axios, 'isAxiosError').mockReturnValueOnce(true);
        mockedApi.post.mockRejectedValueOnce(customAxiosError);

        const { result } = renderHook(() => useCourseCatalog(mockOnEnrollSuccess));

        await act(async () => {
            vi.advanceTimersByTime(400);
            await Promise.resolve();
        });

        await act(async () => {
            await result.current.handleEnrollCourse(201);
        });

        expect(result.current.catalogError).toBe('LÍMITE EXCEDIDO: Ya constas matriculado en este grupo académico del TFG.');
        expect(result.current.enrollingId).toBeNull();
        expect(mockOnEnrollSuccess).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledTimes(1);
    });
});
