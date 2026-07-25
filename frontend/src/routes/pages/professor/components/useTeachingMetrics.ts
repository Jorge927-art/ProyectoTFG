// frontend/src/routes/pages/professor/components/useTeachingMetrics.ts
import { useState, useEffect, useCallback } from 'react';
import {
    getTeachingMetricsSummary,
    getStudentMetricsBreakdown,
    type TeachingMetricsSummary,
    type StudentMetricBreakdown
} from '../../../../services/teachingMetricsService';

/**
 * Hook reactivo del panel "Métricas de Docencia" [espejo de useCourseStats].
 * courseId === null representa la opción TODOS (agregación sobre las
 * asignaturas del profesor autenticado). Aísla el ciclo de vida de la
 * petición de red y protege los estados de UI ante fugas de memoria.
 */
export const useTeachingMetrics = (courseId: number | null) => {
    const [summary, setSummary] = useState<TeachingMetricsSummary | null>(null);
    const [students, setStudents] = useState<StudentMetricBreakdown[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [summaryData, studentsData] = await Promise.all([
                getTeachingMetricsSummary(courseId),
                getStudentMetricsBreakdown(courseId)
            ]);
            setSummary(summaryData);
            setStudents(studentsData);
        } catch (err) {
            console.error('Error al cargar las métricas de docencia:', err);
            setError('No se pudieron cargar las métricas de docencia.');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    return { summary, students, loading, error, refresh: fetchMetrics };
};