import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfessorDashboard from './ProfessorDashboard';

vi.mock('../../layouts/DashboardLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('../../../../services/evaluationService', () => ({
    getActiveStudentsByCourse: vi.fn().mockResolvedValue([]),
    getCourseManagementMetrics: vi.fn().mockResolvedValue({
        groupAverageScore: 7.2,
        activeStudentsCount: 10,
        pendingTasksCount: 3
    })
}));

vi.mock('./components/useCourseManagement', () => ({
    useCourseManagement: () => ({
        activeTab: 'alumnado',
        setActiveTab: vi.fn(),
        students: [], // <-- Soluciona definitivamente el error .length de undefined
        metrics: {
            activeStudentsCount: 0,
            groupAverageGrade: 0,
            pendingSubmissionsCount: 0
        },
        loading: false,
        fileError: null,
        handleFileChange: vi.fn()
    })
}));

describe('ProfessorDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('abre el modal de gestión al pulsar Gestionar Curso', async () => {
        const user = userEvent.setup();

        render(<ProfessorDashboard />);

        await user.click(screen.getAllByRole('button', { name: 'Gestionar Curso' })[0]);

        expect(screen.getByText('Consola de Gestión de Asignatura')).toBeInTheDocument();
        expect(screen.getByText(/Curso ID: 1/)).toBeInTheDocument();
    });

    it('cierra el modal de gestión al pulsar el botón de cierre', async () => {
        const user = userEvent.setup();

        render(<ProfessorDashboard />);

        await user.click(screen.getAllByRole('button', { name: 'Gestionar Curso' })[0]);

        expect(screen.getByText('Consola de Gestión de Asignatura')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cerrar gestión del curso' }));

        expect(screen.queryByText('Consola de Gestión de Asignatura')).not.toBeInTheDocument();
        expect(screen.queryByText(/Curso ID: 1/)).not.toBeInTheDocument();
    });
});