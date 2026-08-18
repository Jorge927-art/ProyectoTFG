import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    assignTeacherWithAlertConfig,
    dismissProfessorBellAlert,
    dismissSingleNotification,
    emitProfessorAlertsRefresh,
    getCourseDispatchConfig,
    getProfessorAlerts,
    PROFESSOR_ALERTS_REFRESH_EVENT,
    updateProfessorAlertStatus,
} from './professorAlertService';
import { apiClient } from './apiClient';

vi.mock('./apiClient', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
    },
}));

describe('professorAlertService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('emite el evento global de refresco de avisos docentes', () => {
        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

        emitProfessorAlertsRefresh();

        expect(dispatchEventSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: PROFESSOR_ALERTS_REFRESH_EVENT })
        );
    });

    it('asigna un profesor con la configuración de avisos indicada', async () => {
        const responseData = { message: 'Asignación completada', courseId: 300, dispatchParts: 4 };
        vi.mocked(apiClient.post).mockResolvedValue({ data: responseData } as never);

        const result = await assignTeacherWithAlertConfig(300, 4);

        expect(apiClient.post).toHaveBeenCalledWith(
            '/api/courses/300/assign-teacher-with-alert-config',
            { dispatchParts: 4 }
        );
        expect(result).toEqual(responseData);
    });

    it('devuelve la lista de avisos docentes cuando el backend responde un array', async () => {
        const alerts = [{
            alertId: 1,
            alertType: 'INITIAL_CONTACT' as const,
            status: 'PENDING' as const,
            checkpointIndex: 0,
            checkpointPercent: 0,
            courseId: 300,
            courseTitle: 'Arquitectura',
            studentUserId: 20,
            studentUsername: 'alumno_test',
            title: 'Contacto inicial',
            message: 'Pendiente de revisión',
            createdAt: '2026-08-18T10:00:00Z',
            bellDismissed: false,
        }];
        vi.mocked(apiClient.get).mockResolvedValue({ data: alerts } as never);

        const result = await getProfessorAlerts();

        expect(apiClient.get).toHaveBeenCalledWith('/api/professor/alerts');
        expect(result).toEqual(alerts);
    });

    it('devuelve una lista vacía si los avisos no llegan como array', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [] } } as never);

        await expect(getProfessorAlerts()).resolves.toEqual([]);
    });

    it('actualiza el estado del aviso seleccionado', async () => {
        const updatedAlert = { alertId: 7, status: 'VIEWED' as const };
        vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedAlert } as never);

        const result = await updateProfessorAlertStatus(7, 'VIEWED');

        expect(apiClient.patch).toHaveBeenCalledWith(
            '/api/professor/alerts/7/status',
            { status: 'VIEWED' }
        );
        expect(result).toEqual(updatedAlert);
    });

    it('descarta el aviso de campana de un profesor', async () => {
        vi.mocked(apiClient.patch).mockResolvedValue({} as never);

        await dismissProfessorBellAlert(9);

        expect(apiClient.patch).toHaveBeenCalledWith('/api/professor/alerts/9/dismiss-bell');
    });

    it('consulta la configuración de avisos de un curso', async () => {
        const config = {
            configured: true,
            config: {
                courseId: 300,
                dispatchParts: 3,
                examThreshold: 90,
                intermediateCheckpoints: [30, 60],
            },
        };
        vi.mocked(apiClient.get).mockResolvedValue({ data: config } as never);

        const result = await getCourseDispatchConfig(300);

        expect(apiClient.get).toHaveBeenCalledWith('/api/professor/alerts/course/300/config');
        expect(result).toEqual(config);
    });

    it('descarta una notificación con su tipo y admite notificationId nulo', async () => {
        vi.mocked(apiClient.patch).mockResolvedValue({} as never);

        await dismissSingleNotification(null, 'PROFESSOR_TASK_ALERT');

        expect(apiClient.patch).toHaveBeenCalledWith(
            '/api/auth/notifications/dismiss-one',
            { notificationId: null, type: 'PROFESSOR_TASK_ALERT' }
        );
    });
});
