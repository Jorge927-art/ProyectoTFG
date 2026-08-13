import { useCallback, useEffect, useState, useContext, useRef } from 'react';
import { AuthContext } from '../../../auth/AuthContext'; // Ajusta la ruta exacta según dónde guardes tu carpeta /auth/
import { apiClient } from '../../../services/apiClient'; // Ajustada la ruta de 4 a 3 niveles
import { getUserDocuments } from '../../../services/documentService'; // Ajustada la ruta de 4 a 3 niveles
import type { DocumentMetadata } from '../../../services/documentService';
import { dismissSingleNotification as dismissSingleNotificationApi } from '../../../services/professorAlertService';

/**
 * DTO para representar una notificación en el sistema.
 * Contiene información sobre el tipo de notificación, título, mensaje y URL de redirección.
 */
export interface NotificationDTO {
    notificationId?: number | null;
    type: 'DOCUMENT_INBOX' | 'COURSE_PROGRESS' | 'STUDENT_NEAR_COMPLETION' | 'COURSE_ASSIGNMENT_CHANGE' | 'COURSE_RECOMMENDATION' | 'GRADE_PUBLISHED' | 'PROFESSOR_TASK_ALERT';
    title: string;
    message: string;
    redirectUrl: string;
}

const getDocumentsRouteByRole = (role: string): string => {
    if (role === 'PROFESSOR') return '/professor?focus=documents';
    if (role === 'ADMIN') return '/admin?focus=documents';
    return '/student?focus=documents';
};

const buildDocumentRedirectWithContext = (role: string, document?: DocumentMetadata): string => {
    const rolePath = role === 'PROFESSOR' ? '/professor' : role === 'ADMIN' ? '/admin' : '/student';
    const params = new URLSearchParams();
    params.set('focus', 'documents');

    if (document?.documentid) {
        params.set('documentId', String(document.documentid));
    }

    if (role === 'PROFESSOR' && document?.sender?.userId) {
        params.set('senderId', String(document.sender.userId));
    }

    return `${rolePath}?${params.toString()}`;
};

type NotificationApiPayload =
    | NotificationDTO[]
    | {
        notifications?: NotificationDTO[];
        data?: NotificationDTO[];
        items?: NotificationDTO[];
        content?: NotificationDTO[];
    };

const normalizeNotificationPayload = (payload: NotificationApiPayload | null | undefined): NotificationDTO[] => {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (payload && typeof payload === 'object') {
        const candidates = [payload.notifications, payload.data, payload.items, payload.content];
        const resolved = candidates.find(Array.isArray);
        if (resolved) {
            return resolved;
        }
    }

    return [];
};

/**
 * Constante que define el nombre del evento personalizado para refrescar las notificaciones globales.
 */
export const NOTIFICATIONS_REFRESH_EVENT = 'global-notifications:refresh';

export const emitNotificationsRefresh = (): void => {
    window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
};

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

    const buildDocumentsRedirect = useCallback(() => {
        return getDocumentsRouteByRole(normalizedRole);
    }, [normalizedRole]);

    const buildDocumentContextRedirect = useCallback((document?: DocumentMetadata) => {
        return buildDocumentRedirectWithContext(normalizedRole, document);
    }, [normalizedRole]);

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
            const [alertsResponse, docsResponse] = await Promise.allSettled([
                apiClient.get<NotificationApiPayload>('/api/auth/notifications'),
                getUserDocuments(),
            ]);

            const rawAlerts = alertsResponse.status === 'fulfilled'
                ? normalizeNotificationPayload(alertsResponse.value.data)
                : [];
            const normalizedAlerts = rawAlerts.map((alert) => {
                if (alert.type !== 'DOCUMENT_INBOX') {
                    return alert;
                }

                if (typeof alert.redirectUrl === 'string' && alert.redirectUrl.trim().length > 0) {
                    return alert;
                }

                return {
                    ...alert,
                    redirectUrl: buildDocumentsRedirect(),
                };
            });
            const receivedDocuments = docsResponse.status === 'fulfilled' ? (docsResponse.value || []) : [];
            const unreadDocuments = receivedDocuments.filter(doc => !doc.isRead);
            const firstUnreadDocument = unreadDocuments[0];

            const contextualizedAlerts = normalizedAlerts.map((alert) => {
                if (alert.type !== 'DOCUMENT_INBOX') {
                    return alert;
                }

                const redirectValue = typeof alert.redirectUrl === 'string' ? alert.redirectUrl.trim() : '';
                const hasContext = redirectValue.includes('documentId=');
                if (hasContext) {
                    return alert;
                }

                return {
                    ...alert,
                    redirectUrl: buildDocumentContextRedirect(firstUnreadDocument),
                };
            });

            const hasDocumentAlert = contextualizedAlerts.some(alert => alert.type === 'DOCUMENT_INBOX');
            const computedDocumentAlert = unreadDocuments.length > 0 && !hasDocumentAlert
                ? [{
                    type: 'DOCUMENT_INBOX' as const,
                    title: 'Bandeja de Entrada',
                    message: `Tienes ${unreadDocuments.length} documento(s) pendiente(s) en tu bandeja.`,
                    redirectUrl: buildDocumentContextRedirect(firstUnreadDocument),
                }]
                : [];

            setAlerts([...computedDocumentAlert, ...contextualizedAlerts]);
            setDocuments(receivedDocuments);

        } catch (err) {
            console.error("Error al sincronizar el canal de alarmas académicas o documentos por rol:", err);
            setAlerts([]);
            setDocuments([]);
        } finally {
            isFetchingRef.current = false;
            setLoading(false);
        }
    }, [buildDocumentContextRedirect, buildDocumentsRedirect, normalizedRole, userId]);

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
        emitNotificationsRefresh();
    }, []);

   const dismissNotifications = useCallback(async (options?: { suppressRefreshBroadcast?: boolean }) => {
        try {
            await apiClient.patch('/api/auth/notifications/dismiss');
        } catch (err) {
            console.error('Error al marcar notificaciones como vistas:', err);
        } finally {
            if (!options?.suppressRefreshBroadcast) {
                broadcastRefresh();
            }
        }
    }, [broadcastRefresh, normalizedRole, userId]);

    const dismissSingleAlert = useCallback(async (alert: NotificationDTO, index: number) => {
        try {
            const notificationId = typeof alert.notificationId === 'number' ? alert.notificationId : null;
            await dismissSingleNotificationApi(notificationId, alert.type);
        } catch (err) {
            console.error('Error al descartar la notificación individual:', err);
        } finally {
            setAlerts((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
        }
    }, []);

    // Retornamos un objeto con los datos y funciones necesarias para el componente que use este hook
    return {
        alerts,
        documents,
        hasAlerts: alerts.length > 0,
        hasUnread: alerts.length > 0,
        refreshAlerts: broadcastRefresh,
        refreshNotifications: broadcastRefresh,
        dismissNotifications,
        dismissSingleAlert,
        loading
    };
};
