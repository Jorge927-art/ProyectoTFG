import { useState, useEffect, useCallback } from 'react';
import { getPendingEvaluations, submitAcademicEvaluation, type PendingEvaluationDTO, type EvaluationInput } from '../../../../services/evaluationService';

type PendingEvaluationsPayload =
  | PendingEvaluationDTO[]
  | {
      pending?: PendingEvaluationDTO[];
      data?: PendingEvaluationDTO[];
      items?: PendingEvaluationDTO[];
      content?: PendingEvaluationDTO[];
    };

const normalizePendingList = (payload: PendingEvaluationsPayload): PendingEvaluationDTO[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const candidates = [payload.pending, payload.data, payload.items, payload.content];
    const resolved = candidates.find(Array.isArray);
    if (resolved) {
      return resolved;
    }
  }

  return [];
};

export const useActiveEvaluations = () => {
  const [pendingList, setPendingList] = useState<PendingEvaluationDTO[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationError, setEvaluationError] = useState('');

  const fetchPending = useCallback(async () => {
    setLoadingPending(true);
    setEvaluationError('');
    try {
      const data = await getPendingEvaluations() as PendingEvaluationsPayload;
      setPendingList(normalizePendingList(data));
    } catch  {
      setEvaluationError('Error al cargar evaluaciones pendientes.');
      setPendingList([]);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const submitEvaluation = async (data: EvaluationInput) => {
    setIsSubmitting(true);
    setEvaluationError('');
    try {
      await submitAcademicEvaluation(data);
      // Tras el éxito, eliminamos el curso de la lista local para feedback inmediato [ADR-35]
      setPendingList(prev => (Array.isArray(prev) ? prev : []).filter(item => item.course.course_id !== data.course_id));
    } catch  {
      setEvaluationError('No se pudo procesar la evaluación. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return { pendingList, loadingPending, isSubmitting, evaluationError, submitEvaluation, refreshPending: fetchPending };
};
