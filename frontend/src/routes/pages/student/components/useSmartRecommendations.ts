import { useState, useEffect } from 'react';
import { apiClient } from '../../../../services/apiClient';
import type { RecommendedCourse } from '../../../../services/userDomains';

/**
 * Hook de lógica distribuida para la hidratación del motor de recomendaciones [ADR-20].
 * Consume de forma segura el endpoint algorítmico del backend [ADR-30].
 */
export const useSmartRecommendations = (triggerRefresh: string) => {
    const [recommendations, setRecommendations] = useState<RecommendedCourse[]>([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState<boolean>(true);
    const [recommendationsError, setRecommendationsError] = useState<string>('');

    useEffect(() => {
        let isMounted = true;
        const fetchRecommendations = async () => {
            setLoadingRecommendations(true);
            try {
                const response = await apiClient.get('/api/courses/recommendations');
                if (isMounted && response.status === 200) {
                    setRecommendations(response.data || []);
                }
            } catch (err) {
                if (isMounted) {
                    console.error("Error al cargar las sugerencias de la base de datos:", err);
                    setRecommendationsError('No se pudieron inicializar tus sugerencias personalizadas.');
                }
            } finally {
                if (isMounted) setLoadingRecommendations(false);
            }
        };

        fetchRecommendations();

        return () => {
            isMounted = false;
        };
    }, [triggerRefresh]); // Se refresca automáticamente si cambia el mensaje de éxito (ej: tras matricularse)

    return { recommendations, loadingRecommendations, recommendationsError };
};
