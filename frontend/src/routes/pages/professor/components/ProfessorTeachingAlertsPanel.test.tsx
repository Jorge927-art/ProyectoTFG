import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfessorTeachingAlertsPanel from './ProfessorTeachingAlertsPanel';
import * as alertService from '../../../../services/professorAlertService';

vi.mock('../../../../services/professorAlertService', () => ({
    getProfessorAlerts: vi.fn(),
    updateProfessorAlertStatus: vi.fn(),
}));

const buildAlert = (status: 'PENDING' | 'VIEWED' | 'RESOLVED') => ({
    alertId: status === 'PENDING' ? 1 : status === 'VIEWED' ? 2 : 3,
    alertType: 'INITIAL_CONTACT' as const,
    status,
    checkpointIndex: 0,
    checkpointPercent: 0,
    courseId: 10,
    courseTitle: 'Curso de prueba',
    studentUserId: 20,
    studentUsername: 'alumno_test',
    title: 'Contacto inicial obligatorio',
    message: 'Envía la documentación inicial.',
    createdAt: '2026-08-14T10:00:00Z',
    bellDismissed: false,
});

describe('ProfessorTeachingAlertsPanel - transición operativa', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(alertService.getProfessorAlerts).mockResolvedValue([]);
    });

    it('muestra Marcar como visto solo para avisos pendientes', async () => {
        vi.mocked(alertService.getProfessorAlerts).mockResolvedValue([buildAlert('PENDING')]);

        render(<ProfessorTeachingAlertsPanel />);

        expect(await screen.findByRole('button', { name: 'Marcar como visto' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /resuelto/i })).not.toBeInTheDocument();
    });

    it('no muestra ninguna acción manual para avisos vistos', async () => {
        vi.mocked(alertService.getProfessorAlerts).mockResolvedValue([buildAlert('VIEWED')]);

        render(<ProfessorTeachingAlertsPanel />);

        await screen.findByText('Visto');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('no muestra ninguna acción manual para avisos resueltos', async () => {
        vi.mocked(alertService.getProfessorAlerts).mockResolvedValue([buildAlert('RESOLVED')]);

        render(<ProfessorTeachingAlertsPanel />);

        await screen.findByText('Resuelto');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('mantiene la transición pendiente a visto', async () => {
        const pending = buildAlert('PENDING');
        const viewed = { ...pending, status: 'VIEWED' as const };
        vi.mocked(alertService.getProfessorAlerts).mockResolvedValue([pending]);
        vi.mocked(alertService.updateProfessorAlertStatus).mockResolvedValue(viewed);

        render(<ProfessorTeachingAlertsPanel />);
        fireEvent.click(await screen.findByRole('button', { name: 'Marcar como visto' }));

        await waitFor(() => {
            expect(alertService.updateProfessorAlertStatus).toHaveBeenCalledWith(1, 'VIEWED');
        });
        expect(screen.queryByRole('button', { name: /resuelto/i })).not.toBeInTheDocument();
    });
});
