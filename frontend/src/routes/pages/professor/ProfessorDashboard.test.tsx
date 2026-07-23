import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfessorDashboard from './ProfessorDashboard';

vi.mock('../../../auth/useAuth', () => ({
    useAuth: () => ({
        user: {
            username: 'Laura',
            email: 'laura@universidad.edu'
        }
    })
}));

const {
    mockedGetProfessorAssignedCourses,
    mockedGetActiveStudentsByCourse
} = vi.hoisted(() => ({
    mockedGetProfessorAssignedCourses: vi.fn(),
    mockedGetActiveStudentsByCourse: vi.fn()
}));

vi.mock('./components/ProfessorCoursePicker', () => ({
    ProfessorCoursePicker: ({
        onSelectionSuccess
    }: {
        onSelectionSuccess?: (course: { course_id: number; title: string; category?: string }) => void;
    }) => (
        <button
            type="button"
            onClick={() => onSelectionSuccess?.({ course_id: 1, title: 'Curso Test', category: 'Programación' })}
        >
            Simular asignación de curso
        </button>
    )
}));

vi.mock('../../layouts/DashboardLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('../../../services/evaluationService', () => ({
    getActiveStudentsByCourse: mockedGetActiveStudentsByCourse,
    getProfessorAssignedCourses: mockedGetProfessorAssignedCourses,
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
        mockedGetProfessorAssignedCourses.mockResolvedValue([]);
        mockedGetActiveStudentsByCourse.mockResolvedValue([]);
    });

    it('abre el modal de gestión al pulsar Gestionar Curso', async () => {
        const user = userEvent.setup();

        render(<ProfessorDashboard />);

        await user.click(screen.getByRole('button', { name: 'Simular asignación de curso' }));

        await user.click(screen.getAllByRole('button', { name: 'Gestionar Curso' })[0]);

        expect(screen.getByText('Control operativo y seguimiento del Curso ID: 1')).toBeInTheDocument();
        expect(screen.getByText(/Curso ID: 1/)).toBeInTheDocument();
    });

    it('cierra el modal de gestión al pulsar el botón de cierre', async () => {
        const user = userEvent.setup();

        render(<ProfessorDashboard />);

        await user.click(screen.getByRole('button', { name: 'Simular asignación de curso' }));

        await user.click(screen.getAllByRole('button', { name: 'Gestionar Curso' })[0]);

        expect(screen.getByText('Control operativo y seguimiento del Curso ID: 1')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cerrar gestión del curso' }));

        expect(screen.queryByText('Control operativo y seguimiento del Curso ID: 1')).not.toBeInTheDocument();
        expect(screen.queryByText(/Curso ID: 1/)).not.toBeInTheDocument();
    });

    it('arranca sin cursos visibles hasta que el profesor elige uno', () => {
        render(<ProfessorDashboard />);

        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Gestionar Curso' })).not.toBeInTheDocument();
    });

    it('hidrata las asignaturas asignadas al volver a iniciar sesión', async () => {
        mockedGetProfessorAssignedCourses.mockResolvedValue([
            {
                course_id: 77,
                title: 'Arquitectura Hexagonal en Java',
                category: 'Backend'
            }
        ]);
        mockedGetActiveStudentsByCourse.mockResolvedValue([{ studentId: 1 }]);

        render(<ProfessorDashboard />);

        expect(await screen.findByText('Arquitectura Hexagonal en Java')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('prioriza subCategory cuando category llega como General en la hidratación del dashboard', async () => {
        mockedGetProfessorAssignedCourses.mockResolvedValue([
            {
                course_id: 88,
                title: 'Data Analysis and Fundamental Statistics',
                category: 'General',
                subCategory: 'Data Science'
            }
        ]);
        mockedGetActiveStudentsByCourse.mockResolvedValue([]);

        render(<ProfessorDashboard />);

        expect(await screen.findByText('Data Analysis and Fundamental Statistics')).toBeInTheDocument();
        expect(screen.getByText('Data Science')).toBeInTheDocument();
    });

    it('no duplica la asignatura si el profesor selecciona el mismo curso más de una vez', async () => {
        const user = userEvent.setup();

        render(<ProfessorDashboard />);

        const selectButton = screen.getByRole('button', { name: 'Simular asignación de curso' });

        await user.click(selectButton);
        await user.click(selectButton);

        const manageButtons = screen.getAllByRole('button', { name: 'Gestionar Curso' });
        expect(manageButtons).toHaveLength(1);
        expect(screen.getByText('1')).toBeInTheDocument();
    });
});