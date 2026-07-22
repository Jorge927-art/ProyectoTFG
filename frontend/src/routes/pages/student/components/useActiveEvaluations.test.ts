import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useActiveEvaluations } from './useActiveEvaluations';
import { getPendingEvaluations, submitAcademicEvaluation } from '../../../../services/evaluationService';
import type { PendingEvaluationDTO, EvaluationInput } from '../../../../services/evaluationService';

// =========================================================================
// 1. AISLAMIENTO CENTRALIZADO DE LA CAPA DE SERVICIOS CORE
// =========================================================================
vi.mock('../../../../services/evaluationService', () => ({
    getPendingEvaluations: vi.fn(),
    submitAcademicEvaluation: vi.fn()
}));

describe('useActiveEvaluations - Suite de Pruebas Unitarias del Hook de Evaluación', () => {
    
    // Colección mock estructurada según el DTO real del dominio académico
    const mockPendingData: PendingEvaluationDTO[] = [
        {
            evaluation_id: 1001,
            title: 'Evaluación Parcial Bloque A',
            course: {
                course_id: 42,
                title: 'Desarrollo Cloud con AWS'
            }
        },
        {
            evaluation_id: 1002,
            title: 'Evaluación Parcial Bloque B',
            course: {
                course_id: 99,
                title: 'Diseño de Software Avanzado'
            }
        }
    ] as unknown as PendingEvaluationDTO[]; // Casteo parcial seguro para tu DTO

    const sampleInput: EvaluationInput = {
        course_id: 42,
        score: 9.5,
        comments: 'Entrega de TFG excelente.'
    } as unknown as EvaluationInput;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    /* =========================================================================
       1. CONTROL DE RESOLUCIÓN INICIAL Y ESTADOS DE CARGA (FETCH)
       ========================================================================= */
    it('Debe alternar loadingPending e hidratar la lista local si el servicio responde con éxito en el montaje', async () => {
        vi.mocked(getPendingEvaluations).mockResolvedValue(mockPendingData);

        const { result } = renderHook(() => useActiveEvaluations());

        // Comprobación de estado intermedio de hidratación inicial
        expect(result.current.loadingPending).toBe(true);
        expect(result.current.evaluationError).toBe('');

        await waitFor(() => {
            expect(result.current.loadingPending).toBe(false);
            expect(result.current.pendingList).toEqual(mockPendingData);
        });

        expect(getPendingEvaluations).toHaveBeenCalledTimes(1);
    });
    /* =========================================================================
       2. GESTIÓN DE EXCEPCIONES EN LA CARGA INICIAL
       ========================================================================= */
    it('Debe capturar la excepción, inyectar el aviso de error descriptivo y apagar el spinner si el fetch falla', async () => {
        vi.mocked(getPendingEvaluations).mockRejectedValue(new Error('Fallo crítico en base de datos'));

        const { result } = renderHook(() => useActiveEvaluations());

        await waitFor(() => {
            expect(result.current.loadingPending).toBe(false);
            expect(result.current.pendingList).toEqual([]);
            expect(result.current.evaluationError).toBe('Error al cargar evaluaciones pendientes.');
        });
    });
    /* =========================================================================
       3. CONTROL DE SUBMISIÓN REACTIVA Y FILTRADO OPTIMISTA [ADR-35]
       ========================================================================= */
    it('Debe procesar la evaluación, alternar isSubmitting y expulsar síncronamente el curso de la lista local tras el éxito', async () => {
        vi.mocked(getPendingEvaluations).mockResolvedValue(mockPendingData);
        // [CORRECCIÓN CRÍTICA ts(2345)]: Retornamos el objeto de éxito esperado por el contrato del servicio en Spring Boot
        vi.mocked(submitAcademicEvaluation).mockResolvedValue({ message: 'Evaluación procesada con éxito' });

        const { result } = renderHook(() => useActiveEvaluations());

        // Aseguramos que la lista inicial esté hidratada con los 2 elementos
        await waitFor(() => expect(result.current.loadingPending).toBe(false));
        expect(result.current.pendingList).toHaveLength(2);

        // [CORRECCIÓN CRÍTICA eslint]: Eliminamos la variable sin usar 'submissionPromise' ejecutando la acción directamente
        act(() => {
            result.current.submitEvaluation(sampleInput);
        });

        // El estado asíncrono de transmisión debe activarse síncronamente
        expect(result.current.isSubmitting).toBe(true);
        expect(result.current.evaluationError).toBe('');

        // Esperamos la resolución final de la cadena de promesas
        await waitFor(() => {
            expect(result.current.isSubmitting).toBe(false);
            // [FILTRADO OPTIMISTA ADR-35]: El curso 42 debe desaparecer, quedando solo el curso 99
            expect(result.current.pendingList).toHaveLength(1);
            expect(result.current.pendingList[0].course.course_id).toBe(99);
        });

        expect(submitAcademicEvaluation).toHaveBeenCalledWith(sampleInput);
    });
    /* =========================================================================
       4. GESTIÓN DE EXCEPCIONES EN LA SUMISIÓN DE EVALUACIONES
       ========================================================================= */
    it('Debe inyectar el aviso de error específico y apagar isSubmitting si el envío falla', async () => {
        vi.mocked(getPendingEvaluations).mockResolvedValue(mockPendingData);
        vi.mocked(submitAcademicEvaluation).mockRejectedValue(new Error('Fallo del backend'));

        const { result } = renderHook(() => useActiveEvaluations());

        await waitFor(() => expect(result.current.loadingPending).toBe(false));

        // Disparar la sumisión fallida de datos
        await act(async () => {
            await result.current.submitEvaluation(sampleInput);
        });

        // Validar que se gestionó la excepción sin romper el estado interno
        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.evaluationError).toBe('No se pudo procesar la evaluación. Inténtalo de nuevo.');
        // La lista no debe sufrir filtrados optimistas ya que la operación falló
        expect(result.current.pendingList).toHaveLength(2);
    });

    /* =========================================================================
       5. CONTROL DEL DISPARADOR DE REFRESCO OPERATIVO (REFRESH)
       ========================================================================= */
    it('Debe invocar de nuevo al servicio de consultas si se ejecuta refreshPending de forma explícita', async () => {
        vi.mocked(getPendingEvaluations).mockResolvedValue(mockPendingData);

        const { result } = renderHook(() => useActiveEvaluations());

        await waitFor(() => expect(result.current.loadingPending).toBe(false));
        expect(getPendingEvaluations).toHaveBeenCalledTimes(1);

        // Forzar la actualización manual de datos pendientes
        act(() => {
            result.current.refreshPending();
        });

        await waitFor(() => {
            expect(result.current.loadingPending).toBe(false);
        });
        
        expect(getPendingEvaluations).toHaveBeenCalledTimes(2);
    });
});


