import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCourseCatalog } from './useCourseCatalog';
import { apiClient } from '../services/apiClient';
import axios from 'axios';
import type { DBModelCourse } from '../services/courseTypes';

// 1. Aislamiento perimetral del cliente HTTP centralizado
vi.mock('../services/apiClient', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn()
    }
}));

describe('useCourseCatalog - Suite de Pruebas Unitarias del Hook de Catálogo', () => {
    const mockOnActionSuccess = vi.fn();

    const mockCourses: DBModelCourse[] = [
        { course_id: 101, title: 'Curso Algoritmos Avanzados', category: 'Ingeniería', instructors: 'Dr. Turing' }
    ];

    const waitForDebounce = () => new Promise((resolve) => setTimeout(resolve, 450));

    beforeEach(() => {
        vi.restoreAllMocks();
        vi.resetAllMocks();
    });

    it('Debe inicializar los estados por defecto y activar el debounce de carga tras los 400ms', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ status: 200, data: mockCourses });

        const { result } = renderHook(() => useCourseCatalog(mockOnActionSuccess));

        // [CORRECCIÓN CRÍTICA]: El estado inicial de loadingCatalog en producción arranca en false
        expect(result.current.searchKeyword).toBe('');
        expect(result.current.catalogCourses).toEqual([]);
        expect(result.current.loadingCatalog).toBe(false); 
        expect(result.current.catalogError).toBe('');

        // Espera real para que el debounce de 400ms ejecute fetchCatalogData sin fake timers compartidos.
        await act(async () => {
            await waitForDebounce();
        });

        expect(apiClient.get).toHaveBeenCalledWith('/api/courses/search', { params: {} });
        expect(result.current.loadingCatalog).toBe(false);
        expect(result.current.catalogCourses).toEqual(mockCourses);
    });

    it('Debe limpiar la palabra clave mediante trim e invocar el endpoint predictivo con parámetros de consulta', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ status: 200, data: mockCourses });

        const { result } = renderHook(() => useCourseCatalog(mockOnActionSuccess));

        // Cambiar la palabra clave con espacios para validar el saneamiento perimetral
        act(() => {
            result.current.setSearchKeyword('  Spring Boot  ');
        });

        expect(result.current.searchKeyword).toBe('  Spring Boot  ');

        // Espera real para disparar el debounce saneado.
        await act(async () => {
            await waitForDebounce();
        });

        expect(apiClient.get).toHaveBeenCalledWith('/api/courses/search', {
            params: { keyword: 'Spring Boot' }
        });
    });

    it('Debe capturar errores de infraestructura y renderizar el mensaje de contingencia en tiempo real', async () => {
        vi.mocked(apiClient.get).mockRejectedValue(new Error('Fallo de red crítico'));

        const { result } = renderHook(() => useCourseCatalog(mockOnActionSuccess));

        await act(async () => {
            await waitForDebounce();
        });

        expect(result.current.catalogCourses).toEqual([]);
        expect(result.current.catalogError).toBe('No se pudo sincronizar el catálogo de cursos en tiempo real.');
        expect(result.current.loadingCatalog).toBe(false);
    });

    it('Debe procesar executeCourseAction mediante POST invocando la callback de éxito con la coincidencia local', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ status: 200, data: mockCourses });
        vi.mocked(apiClient.post).mockResolvedValue({ status: 201 });

        const { result } = renderHook(() => useCourseCatalog(mockOnActionSuccess));

        await act(async () => {
            await waitForDebounce();
        });

        // Ejecutar la mutación operativa de inscripción
        await act(async () => {
            await result.current.executeCourseAction(101, '/api/courses/enroll/101', 'post');
        });

        expect(apiClient.post).toHaveBeenCalledWith('/api/courses/enroll/101');
        expect(mockOnActionSuccess).toHaveBeenCalledWith(mockCourses[0]);
    });

       it('Debe capturar errores específicos de Axios transmitidos desde el Backend al fallar la acción operativa', async () => {
        const axiosError = {
            isAxiosError: true,
            response: {
                data: { message: 'El alumno ya cuenta con una matrícula activa en este periodo curricular.' }
            }
        };
        vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
        vi.mocked(apiClient.post).mockRejectedValue(axiosError);

        const { result } = renderHook(() => useCourseCatalog(mockOnActionSuccess));

        await act(async () => {
            await result.current.executeCourseAction(999, '/api/courses/enroll/999', 'post');
        });

        expect(result.current.actionExecutionId).toBeNull();
        
        expect(result.current.catalogError).toBe('El alumno ya cuenta con una matrícula activa en este periodo curricular.');
    });

});
