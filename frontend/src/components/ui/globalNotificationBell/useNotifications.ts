import { useCallback, useEffect, useState, useContext, useRef } from 'react';
import { AuthContext } from '../../../auth/AuthContext'; // Ajusta la ruta exacta según dónde guardes tu carpeta /auth/
import { apiClient } from '../../../services/apiClient'; // Ajustada la ruta de 4 a 3 niveles
import { getUserDocuments } from '../../../services/documentService'; // Ajustada la ruta de 4 a 3 niveles
import type { DocumentMetadata } from '../../../services/documentService';

/**
 * DTO para representar una notificación en el sistema.
 * Contiene información sobre el tipo de notificación, título, mensaje y URL de redirección.
 */
export interface NotificationDTO {
    type: 'DOCUMENT_INBOX' | 'COURSE_PROGRESS' | 'STUDENT_NEAR_COMPLETION';
    title: string;
    message: string;
    redirectUrl: string;
}

/**
 * Constante que define el nombre del evento personalizado para refrescar las notificaciones globales.
 */
const NOTIFICATIONS_REFRESH_EVENT = 'global-notifications:refresh';

/**
 *  Hook personalizado para gestionar las notificaciones globales del usuario.
 *  Este hook se encarga de obtener las notificaciones y documentos del usuario autenticado,
 *  así como de manejar el estado de carga y la sincronización de datos.
 * @returns Un objeto que contiene las notificaciones, documentos, estado de carga y funciones para refrescar los datos.
 */
export const useNotifications = () => {
    const { user } = useContext(AuthContext); // Consumimos el contexto global de autenticación
    const [alerts, setAlerts] = useState<NotificationDTO[]>([]);
    const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const isFetchingRef = useRef(false);

    // Derivamos dependencias primitivas para evitar refrescos por cambios no funcionales
    // del objeto user (por ejemplo, expiresAt en el monitor de inactividad).
    const userId = user?.userId ?? null;
    const normalizedRole = typeof user?.role === 'string' ? user.role.toUpperCase() : '';

    const fetchAlerts = useCallback(async () => {
        // Cortocircuito defensivo: si no hay usuario autenticado o carece de rol, no hacemos peticiones
        if (!userId || !normalizedRole) {
            setAlerts([]);
            setDocuments([]);
            setLoading(false);
            return;
        }

        // Evita solapamiento de peticiones cuando se emiten varios refresh muy seguidos.
        if (isFetchingRef.current) {
            return;
        }

        try {
            isFetchingRef.current = true;
            setLoading(true);
            const [alertsResponse, docsResponse] = await Promise.all([
                apiClient.get<NotificationDTO[]>('/api/auth/notifications'),
                getUserDocuments()
            ]);
            setAlerts(alertsResponse.data || []);
            setDocuments(docsResponse || []);
            
        } catch (err) {
            console.error("Error al sincronizar el canal de alarmas académicas o documentos por rol:", err);
            setAlerts([]); 
            setDocuments([]);
        } finally {
            isFetchingRef.current = false;
            setLoading(false);
        }
    }, [normalizedRole, userId]);

    // Sincronización inicial y escucha de refrescos globales
    useEffect(() => {
        const handleRefresh = () => {
            void fetchAlerts();
        };

        void fetchAlerts();
        window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, handleRefresh);

        return () => {
            window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, handleRefresh);
        };
    }, [fetchAlerts]);

    const broadcastRefresh = useCallback(() => {
        window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
    }, []);

   const dismissNotifications = useCallback(async () => {
        try {
            await apiClient.patch('/api/auth/notifications/dismiss');
        } catch (err) {
            console.error('Error al marcar notificaciones como vistas:', err);
        } finally {
            broadcastRefresh();
        }
    }, [broadcastRefresh]);
    
    // Retornamos un objeto con los datos y funciones necesarias para el componente que use este hook
    return {
        alerts,
        documents,
        hasAlerts: alerts.length > 0,
        hasUnread: alerts.length > 0,
        refreshAlerts: broadcastRefresh,
        refreshNotifications: broadcastRefresh,
        dismissNotifications,
        loading
    };
};
