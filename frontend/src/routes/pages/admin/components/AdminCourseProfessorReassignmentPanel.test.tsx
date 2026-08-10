import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminCourseProfessorReassignmentPanel } from './AdminCourseProfessorReassignmentPanel';
import * as assignmentService from '../../../../services/adminCourseAssignmentService';
import * as notificationsHook from '../../../../components/ui/globalNotificationBell/useNotifications';

vi.mock('../../../../services/adminCourseAssignmentService', async () => {
    const actual = await vi.importActual<typeof import('../../../../services/adminCourseAssignmentService')>('../../../../services/adminCourseAssignmentService');
    return {
        ...actual,
        getAdminProfessorOptions: vi.fn(),
        getAdminCoursesByProfessor: vi.fn(),
        reassignAdminCourseProfessor: vi.fn(),
        resolveAdminCourseAssignmentError: vi.fn(() => 'Error controlado'),
    };
});

describe('AdminCourseProfessorReassignmentPanel', () => {
    const refreshNotifications = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(notificationsHook, 'useNotifications').mockReturnValue({
            alerts: [],
            documents: [],
            hasAlerts: false,
            hasUnread: false,
            refreshAlerts: vi.fn(),
            refreshNotifications,
            dismissNotifications: vi.fn(),
            loading: false
        });

        vi.spyOn(assignmentService, 'getAdminProfessorOptions').mockResolvedValue([
            { userId: 10, username: 'alfa_docente' },
            { userId: 20, username: 'beta_docente' }
        ]);
        vi.spyOn(assignmentService, 'getAdminCoursesByProfessor').mockResolvedValue([
            {
                courseId: 300,
                title: 'Arquitectura',
                currentProfessorUserId: 10,
                currentProfessorUsername: 'alfa_docente'
            }
        ]);
    });

    it('carga profesores al montar y muestra cabecera del panel', async () => {
        render(<AdminCourseProfessorReassignmentPanel />);

        expect(screen.getByText('Reasignación Administrativa de Profesores')).toBeInTheDocument();

        await waitFor(() => {
            expect(assignmentService.getAdminProfessorOptions).toHaveBeenCalledTimes(1);
        });
    });

    it('deshabilita la acción de reasignación cuando no hay profesor entrante seleccionado', async () => {
        render(<AdminCourseProfessorReassignmentPanel />);

        await waitFor(() => {
            expect(assignmentService.getAdminProfessorOptions).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByLabelText('Profesor saliente'), { target: { value: '10' } });

        await waitFor(() => {
            expect(assignmentService.getAdminCoursesByProfessor).toHaveBeenCalledWith(10);
        });

        expect(screen.getByRole('button', { name: 'Reasignar curso' })).toBeDisabled();
    });

    it('reasigna con confirmación positiva y refresca notificaciones', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.spyOn(assignmentService, 'reassignAdminCourseProfessor').mockResolvedValue({
            message: 'ok',
            courseId: 300,
            courseTitle: 'Arquitectura',
            previousProfessorUserId: 10,
            previousProfessorUsername: 'alfa_docente',
            newProfessorUserId: 20,
            newProfessorUsername: 'beta_docente'
        });

        render(<AdminCourseProfessorReassignmentPanel />);

        await waitFor(() => {
            expect(assignmentService.getAdminProfessorOptions).toHaveBeenCalled();
        });

        fireEvent.change(screen.getByLabelText('Profesor saliente'), { target: { value: '10' } });

        await waitFor(() => {
            expect(assignmentService.getAdminCoursesByProfessor).toHaveBeenCalledWith(10);
        });

        fireEvent.change(screen.getByLabelText('Profesor entrante'), { target: { value: '20' } });
        fireEvent.click(screen.getByRole('button', { name: 'Reasignar curso' }));

        await waitFor(() => {
            expect(assignmentService.reassignAdminCourseProfessor).toHaveBeenCalledWith(300, 20);
        });

        expect(window.confirm).toHaveBeenCalled();
        expect(refreshNotifications).toHaveBeenCalledTimes(1);
    });
});
