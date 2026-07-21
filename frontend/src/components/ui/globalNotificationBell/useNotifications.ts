import { useCallback, useEffect, useState, useContext, useRef } from 'react';
import { AuthContext } from '../../../auth/AuthContext'; // Ajusta la ruta exacta según dónde guardes tu carpeta /auth/
import { apiClient } from '../../../services/apiClient'; // Ajustada la ruta de 4 a 3 niveles
import { getUserDocuments } from '../../../services/documentService'; // Ajustada la ruta de 4 a 3 niveles
import type { DocumentMetadata } from '../../../services/documentService';

/** Contrato estricto del DTO de notificaciones devuelto por Spring Boot */
export interface NotificationDTO {
    type: 'DOCUMENT_INBOX' | 'COURSE_PROGRESS';
    title: string;
    message: string;
    redirectUrl: string;
}

// Renombramos el evento a uno global agnóstico al rol para el TFG
const NOTIFICATIONS_REFRESH_EVENT = 'global-notifications:refresh';

/** Hook general sensible al rol para el consumo y refresco dinámico de alarmas académicas */
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

    // Evalúa si hay documentos recibidos no leídos (isRead === false) compartida para todos los roles
    const hasUnread = documents.some(doc => !doc.isRead);

    return { 
        alerts, 
        documents, 
        hasAlerts: alerts.length > 0,
        hasUnread, 
        refreshAlerts: broadcastRefresh,
        refreshNotifications: broadcastRefresh, 
        loading 
    };
};
