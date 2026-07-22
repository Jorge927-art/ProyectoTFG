import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfessorDashboard from './ProfessorDashboard';

vi.mock('../../layouts/DashboardLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('../../../services/evaluationService', () => ({
    getActiveStudentsByCourse: vi.fn().mockResolvedValue([]),
    getCourseManagementMetrics: vi.fn().mockResolvedValue({
        groupAverageScore: 7.2,
        activeStudentsCount: 10,
        pendingTasksCount: 3
    })
}));

vi.mock('./components/CourseManagementModal', () => ({
    CourseManagementModal: ({
        courseId,
        isOpen,
        onClose
    }: {
        courseId: number | null;
        isOpen: boolean;
        onClose: () => void;
    }) => {
        if (!isOpen || courseId === null) return null;
        return (
            <div>
                <h2>Control operativo y seguimiento del Curso ID: {courseId}</h2>
                <button type="button" aria-label="Cerrar gestión del curso" onClick={onClose}>
                    X
                </button>
            </div>
        );
    }
}));

describe('ProfessorDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('abre el modal de gestión al pulsar Gestionar Curso', async () => {
        const user = userEvent.setup();

        render(<ProfessorDashboard />);

        await user.click(screen.getAllByRole('button', { name: 'Gestionar Curso' })[0]);

        expect(screen.getByText('Control operativo y seguimiento del Curso ID: 1')).toBeInTheDocument();
        expect(screen.getByText(/Curso ID: 1/)).toBeInTheDocument();
    });

    it('cierra el modal de gestión al pulsar el botón de cierre', async () => {
        const user = userEvent.setup();

        render(<ProfessorDashboard />);

        await user.click(screen.getAllByRole('button', { name: 'Gestionar Curso' })[0]);

        expect(screen.getByText('Control operativo y seguimiento del Curso ID: 1')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cerrar gestión del curso' }));

        expect(screen.queryByText('Control operativo y seguimiento del Curso ID: 1')).not.toBeInTheDocument();
        expect(screen.queryByText(/Curso ID: 1/)).not.toBeInTheDocument();
    });
});