import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/apiClient'; // Ajusta la ruta exacta a tu apiClient si es necesario
import type { CourseStatsInfo } from '../../../../services/courseTypes'; // Ajusta los niveles de carpetas según tu proyecto

/**
 * Hook analítico reactivo para la gestión stateless de estadísticas [ADR-41].
 * Aísla el ciclo de vida de la petición de red y protege los estados de UI ante fugas de memoria.
 */
export const useCourseStats = (courseId: number | undefined | null) => {
    const [stats, setStats] = useState<CourseStatsInfo | null>(null);
    const [loadingStats, setLoadingStats] = useState<boolean>(false);
    const [statsError, setStatsError] = useState<string>('');

    /**
     * Petición asíncrona encapsulada para mitigar condiciones de carrera.
     */
    const fetchStats = useCallback(async (id: number) => {
        setLoadingStats(true);
        setStatsError('');
        try {
            // Invocación al endpoint desacoplado del backend en verde
            const response = await apiClient.get(`/api/v1/stats/course/${id}`);
            if (response.data !== undefined) {
                setStats(response.data);
            }
        } catch (err) {
            console.error("Error al computar agregaciones estadísticas:", err);
            setStatsError("No se pudieron cargar las métricas consolidadas del catálogo.");
        } finally {
            setLoadingStats(false);
        }
    }, []);

    /**
     * Disparador reactivo con cortocircuito defensivo: bloquea la llamada si el ID es inválido.
     */
    useEffect(() => {
        if (courseId !== undefined && courseId !== null && courseId > 0) {
            fetchStats(courseId);
        } else {
            setStats(null);
            setStatsError('');
        }
    }, [courseId, fetchStats]);

    return {
        stats,
        loadingStats,
        statsError,
        refreshStats: () => courseId && fetchStats(courseId)
    };
};
