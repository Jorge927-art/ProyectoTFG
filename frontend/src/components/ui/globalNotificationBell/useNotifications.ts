import { useCallback, useEffect, useState, useContext } from 'react';
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

    const fetchAlerts = useCallback(async () => {
        // Cortocircuito defensivo: si no hay usuario autenticado o carece de rol, no hacemos peticiones
        if (!user || !user.role) {
            setAlerts([]);
            setDocuments([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            
            // LA CLAVE RECOMENTADA: Bifurcación algorítmica limpia según el rol del usuario
            const userRole = user.role.toUpperCase();

            if (userRole === 'ADMIN') {
                // El Administrador consume las alertas del sistema y documentos globales de auditoría
                const [alertsResponse, docsResponse] = await Promise.all([
                    apiClient.get<NotificationDTO[]>('/api/auth/notifications'),
                    getUserDocuments() // Adapta a tu endpoint de administrador si fuera diferente en el futuro
                ]);
                setAlerts(alertsResponse.data || []);
                setDocuments(docsResponse || []);

            } else if (userRole === 'PROFESSOR' || userRole === 'TEACHER') {
                // El Profesor monitoriza las entregas recibidas de sus alumnos
                const [alertsResponse, docsResponse] = await Promise.all([
                    apiClient.get<NotificationDTO[]>('/api/auth/notifications'),
                    getUserDocuments() // Traerá los documentos donde él figura como 'receiverUser'
                ]);
                setAlerts(alertsResponse.data || []);
                setDocuments(docsResponse || []);

            } else {
                // Flujo por defecto para Estudiantes (STUDENT)
                const [alertsResponse, docsResponse] = await Promise.all([
                    apiClient.get<NotificationDTO[]>('/api/auth/notifications'),
                    getUserDocuments() // Trae sus documentos y evalúa estados de lectura o progreso
                ]);
                setAlerts(alertsResponse.data || []);
                setDocuments(docsResponse || []);
            }
            
        } catch (err) {
            console.error("Error al sincronizar el canal de alarmas académicas o documentos por rol:", err);
            setAlerts([]); 
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

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
