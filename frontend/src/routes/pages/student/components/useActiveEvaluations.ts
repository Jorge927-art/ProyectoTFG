import { useState, useEffect, useCallback } from 'react';
import { getPendingEvaluations, submitAcademicEvaluation, type PendingEvaluationDTO, type EvaluationInput } from '../../../../services/evaluationService';


export const useActiveEvaluations = (successTrigger?: string) => {
    const [pendingList, setPendingList] = useState<PendingEvaluationDTO[]>([]);
    const [loadingPending, setLoadingPending] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [evaluationError, setEvaluationError] = useState<string>('');

    /**
     * Sincroniza con PostgreSQL para extraer los cursos con profesores activos pendientes de evaluar.
     */
    const fetchPendingEvaluations = useCallback(async () => {
        setLoadingPending(true);
        setEvaluationError('');
        try {
            const data = await getPendingEvaluations();
            setPendingList(data);
        } catch (err: unknown) {
            console.error("Error crítico al recuperar asignaturas pendientes de evaluación:", err);
            setEvaluationError("No se pudieron sincronizar las asignaturas pendientes desde el servidor.");
        } finally {
            setLoadingPending(false);
        }
    }, []);

    /**
     * Transmite la evaluación dual de estrellas y comentarios al backend.
     */
    const submitEvaluation = async (inputData: EvaluationInput): Promise<boolean> => {
        setIsSubmitting(true);
        setEvaluationError('');
        try {
            await submitAcademicEvaluation(inputData);
            await fetchPendingEvaluations(); // Refresca en caliente la lista local quitando el curso evaluado
            return true;
        } catch (err: unknown) {
            console.error("Error al procesar el envío de la evaluación académica:", err);
            // Captura estricta del mensaje de denegación perimetral o error de Spring Boot
            const errorConResponse = err as { response?: { data?: { error?: string } } };
            const backendError = errorConResponse.response?.data?.error || "Error crítico al guardar tu evaluación.";
            setEvaluationError(backendError);
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reactividad integrada para escuchar cambios o triggers externos del Dashboard
    useEffect(() => {
        fetchPendingEvaluations();
    }, [successTrigger, fetchPendingEvaluations]);

    return {
        pendingList,
        loadingPending,
        isSubmitting,
        evaluationError,
        setEvaluationError,
        refreshPending: fetchPendingEvaluations,
        submitEvaluation
    };
};
