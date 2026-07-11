import { useState, useEffect } from 'react';
import { apiClient } from '../../../../services/apiClient';

/** Contrato estricto del DTO de notificaciones devuelto por Spring Boot */
export interface NotificationDTO {
    type: 'DOCUMENT_INBOX' | 'COURSE_PROGRESS';
    title: string;
    message: string;
    redirectUrl: string;
}

/** Hook aislado para el consumo y refresco dinámico de alarmas académicas [ADR-20] */
export const useNotifications = () => {
    const [alerts, setAlerts] = useState<NotificationDTO[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            // Impacta directamente en nuestro nuevo endpoint protegido del controlador
            const response = await apiClient.get<NotificationDTO[]>('/api/auth/notifications');
            setAlerts(response.data || []);
        } catch (err) {
            console.error("Error al sincronizar el canal de alarmas académicas:", err);
            setAlerts([]); // Fallback seguro en blanco ante caídas de red o tokens expirados
        } finally {
            setLoading(false);
        }
    };

    // Sincronización inicial automatizada al montar el componente en la Navbar
    useEffect(() => {
        fetchAlerts();
    }, []);

    return { 
        alerts, 
        hasAlerts: alerts.length > 0,
        refreshAlerts: fetchAlerts,
        loading 
    };
};
