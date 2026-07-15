import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../../services/apiClient';
import { getUserDocuments } from '../../../../services/documentService';
import type { DocumentMetadata } from '../../../../services/documentService';


/** Contrato estricto del DTO de notificaciones devuelto por Spring Boot */
export interface NotificationDTO {
    type: 'DOCUMENT_INBOX' | 'COURSE_PROGRESS';
    title: string;
    message: string;
    redirectUrl: string;
}

const NOTIFICATIONS_REFRESH_EVENT = 'student-notifications:refresh';

/** Hook aislado para el consumo y refresco dinámico de alarmas académicas [ADR-20] */
export const useNotifications = () => {
    const [alerts, setAlerts] = useState<NotificationDTO[]>([]);
    const [documents, setDocuments] = useState<DocumentMetadata[]>([]); // <-- NUEVO ESTADO: Guarda los documentos recibidos
    const [loading, setLoading] = useState<boolean>(true);

    const fetchAlerts = useCallback(async () => {
        try {
            setLoading(true);
            
            // 1. Ejecutar ambas peticiones en paralelo para optimizar la carga
            const [alertsResponse, docsResponse] = await Promise.all([
                apiClient.get<NotificationDTO[]>('/api/auth/notifications'),
                getUserDocuments() // Trae los documentos del backend para evaluar el estado de lectura
            ]);

            setAlerts(alertsResponse.data || []);
            setDocuments(docsResponse || []);
            
        } catch (err) {
            console.error("Error al sincronizar el canal de alarmas académicas o documentos:", err);
            setAlerts([]); 
            setDocuments([]); // Fallback seguro en blanco ante fallos de red
        } finally {
            setLoading(false);
        }
    }, []);

    // Sincronización inicial y escucha de refrescos globales disparados desde otros componentes.
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

    // RECOMENDACIÓN NOTEBOOKLM: Evalúa si hay documentos recibidos no leídos (isread === false)
    const hasUnread = documents.some(doc => !doc.isread);

    return { 
        alerts, 
        documents, // Expone la lista por si el componente de la campana necesita renderizarlos
        hasAlerts: alerts.length > 0,
        hasUnread, // <-- NUEVA BANDERA: Alimenta el estado "rojo/gris" de la campana de forma precisa
        refreshAlerts: broadcastRefresh,
        refreshNotifications: broadcastRefresh, // Fuerza la re-evaluación compartida entre instancias del hook
        loading 
    };
};
