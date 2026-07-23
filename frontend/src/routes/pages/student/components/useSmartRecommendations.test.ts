import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSmartRecommendations } from './useSmartRecommendations';
import { apiClient } from '../../../../services/apiClient';

// --- AISLAMIENTO PERIMETRAL ESTRICTO: MOCK TIPADO DE API_CLIENT ---
vi.mock('../../../../services/apiClient', () => ({
    apiClient: {
        get: vi.fn(),
    },
}));

type MockedApiClient = {
    get: ReturnType<typeof vi.fn>;
};

const mockedApi = apiClient as unknown as MockedApiClient;

describe('useSmartRecommendations - Suite de Pruebas Unitarias de Hooks con Estado', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Espiar el console.error para no ensuciar la salida del linter de pruebas
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    const mockCourses = [
        { course_id: 1, title: 'React Avanzado', category: 'Frontend', score: 5 },
        { course_id: 2, title: 'Estructuras de Datos con TS', category: 'CS', score: 4.8 }
    ];

    it('debe inicializar el estado en carga y resolver las recomendaciones tras una petición HTTP exitosa', async () => {
        mockedApi.get.mockResolvedValueOnce({ status: 200, data: mockCourses });

        const { result } = renderHook(() => useSmartRecommendations('init_state'));

        // 1. Validar el estado de carga intermedio inmediato
        expect(result.current.loadingRecommendations).toBe(true);
        expect(result.current.recommendations).toEqual([]);
        expect(result.current.recommendationsError).toBe('');

        // 2. Esperar la hidratación asíncrona de los estados reactivos
        await waitFor(() => {
            expect(result.current.loadingRecommendations).toBe(false);
        });

        expect(result.current.recommendations).toEqual(mockCourses);
        expect(result.current.recommendationsError).toBe('');
        expect(mockedApi.get).toHaveBeenCalledWith('/api/courses/recommendations');
    });

    it('debe reaccionar defensivamente y mapear un array vacío si response.data es nulo', async () => {
        mockedApi.get.mockResolvedValueOnce({ status: 200, data: null });

        const { result } = renderHook(() => useSmartRecommendations('init_state'));

        await waitFor(() => {
            expect(result.current.loadingRecommendations).toBe(false);
        });

        expect(result.current.recommendations).toEqual([]);
    });

    it('debe capturar las excepciones de la API y mutar el mensaje de error para el usuario', async () => {
        const errorMock = new Error('Database connection timed out');
        mockedApi.get.mockRejectedValueOnce(errorMock);

        const { result } = renderHook(() => useSmartRecommendations('init_state'));

        await waitFor(() => {
            expect(result.current.loadingRecommendations).toBe(false);
        });

        // Validar fallbacks corporativos de errores configurados en el TFG
        expect(result.current.recommendations).toEqual([]);
        expect(result.current.recommendationsError).toBe('No se pudieron inicializar tus sugerencias personalizadas.');
        expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('debe volver a disparar el ciclo fetch de hidratación reactiva si cambia el parámetro triggerRefresh', async () => {
        mockedApi.get.mockResolvedValue({ status: 200, data: mockCourses });

        // Instanciar con un valor inicial de refresh
        const { result, rerender } = renderHook(
            ({ refreshKey }) => useSmartRecommendations(refreshKey),
            { initialProps: { refreshKey: 'compra_inicial' } }
        );

        await waitFor(() => {
            expect(result.current.loadingRecommendations).toBe(false);
        });

        expect(mockedApi.get).toHaveBeenCalledTimes(1);

        // Provocar una re-evaluación del hook (ej: tras matricularse el alumno en un curso)
        rerender({ refreshKey: 'matricula_exitosa_refresh' });

        await waitFor(() => {
            expect(result.current.loadingRecommendations).toBe(false);
        });

        // Asegurar matemáticamente que la dependencia del useEffect ha forzado una segunda llamada
        expect(mockedApi.get).toHaveBeenCalledTimes(2);
    });
});
