import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfessorDashboard from './ProfessorDashboard';

const { mockedAuthUser } = vi.hoisted(() => ({
    mockedAuthUser: {
        username: 'Laura',
        email: 'laura@universidad.edu'
    } as { username?: string; email?: string }
}));

vi.mock('../../../auth/useAuth', () => ({
    useAuth: () => ({
        user: mockedAuthUser
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
        onClose,
        onSyncCount
    }: {
        courseId: number | null;
        isOpen: boolean;
        onClose: () => void;
        onSyncCount?: (courseId: number, count: number) => void;
    }) => {
        if (!isOpen || courseId === null) return null;
        return (
            <div>
                <h2>Control operativo y seguimiento del Curso ID: {courseId}</h2>
                <button type="button" aria-label="Cerrar gestión del curso" onClick={onClose}>
                    X
                </button>
                <button type="button" onClick={() => onSyncCount?.(courseId, 5)}>
                    Sync count 5
                </button>
                <button type="button" onClick={() => onSyncCount?.(courseId, 1)}>
                    Sync same count
                </button>
                <button type="button" onClick={() => onSyncCount?.(9999, 77)}>
                    Sync unknown course
                </button>
            </div>
        );
    }
}));

describe('ProfessorDashboard', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockedAuthUser.username = 'Laura';
        mockedAuthUser.email = 'laura@universidad.edu';
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
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

        expect(await screen.findByRole('heading', { name: 'Arquitectura Hexagonal en Java' })).toBeInTheDocument();
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

        expect(await screen.findByRole('heading', { name: 'Data Analysis and Fundamental Statistics' })).toBeInTheDocument();
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

    it('usa courseType cuando category es General y subCategory está vacía', async () => {
        mockedGetProfessorAssignedCourses.mockResolvedValue([
            {
                course_id: 89,
                title: 'Cloud Native Patterns',
                category: 'General',
                subCategory: ' ',
                courseType: 'Cloud'
            }
        ]);

        render(<ProfessorDashboard />);

        expect(await screen.findByRole('heading', { name: 'Cloud Native Patterns' })).toBeInTheDocument();
        expect(screen.getByText('Cloud')).toBeInTheDocument();
    });

    it('usa fallback General cuando no hay category, subCategory ni courseType', async () => {
        mockedGetProfessorAssignedCourses.mockResolvedValue([
            {
                course_id: 90,
                title: 'Curso sin taxonomía',
                category: ' ',
                subCategory: ' ',
                courseType: ' '
            }
        ]);

        render(<ProfessorDashboard />);

        expect(await screen.findByRole('heading', { name: 'Curso sin taxonomía' })).toBeInTheDocument();
        expect(screen.getByText('General')).toBeInTheDocument();
    });

    it('mantiene el curso con conteo 0 y registra error si falla el conteo de alumnos en hidratación', async () => {
        mockedGetProfessorAssignedCourses.mockResolvedValue([
            {
                course_id: 200,
                title: 'Curso con error de conteo',
                category: 'Backend'
            }
        ]);
        mockedGetActiveStudentsByCourse.mockRejectedValueOnce(new Error('count-failed'));

        render(<ProfessorDashboard />);

        expect(await screen.findByRole('heading', { name: 'Curso con error de conteo' })).toBeInTheDocument();
        expect(screen.getByText('Total: 0 alumnos matriculados')).toBeInTheDocument();
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('registra error si falla la carga de cursos asignados', async () => {
        mockedGetProfessorAssignedCourses.mockRejectedValueOnce(new Error('hydrate-failed'));

        render(<ProfessorDashboard />);

        await screen.findByText('Panel de Control Docente');
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(screen.queryByRole('button', { name: 'Gestionar Curso' })).not.toBeInTheDocument();
    });

    it('añade un curso con conteo 0 si falla el conteo durante selección manual', async () => {
        const user = userEvent.setup();
        mockedGetActiveStudentsByCourse.mockRejectedValueOnce(new Error('manual-count-failed'));

        render(<ProfessorDashboard />);

        await user.click(screen.getByRole('button', { name: 'Simular asignación de curso' }));

        expect(await screen.findByRole('heading', { name: 'Curso Test' })).toBeInTheDocument();
        expect(screen.getByText('Total: 0 alumnos matriculados')).toBeInTheDocument();
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('actualiza el conteo del curso cuando el modal sincroniza un valor distinto', async () => {
        const user = userEvent.setup();
        mockedGetProfessorAssignedCourses.mockResolvedValue([
            {
                course_id: 303,
                title: 'Curso sincronizable',
                category: 'Backend'
            }
        ]);
        mockedGetActiveStudentsByCourse.mockResolvedValue([{ studentId: 1 }]);

        render(<ProfessorDashboard />);

        await screen.findByRole('heading', { name: 'Curso sincronizable' });
        expect(screen.getByText('Total: 1 alumnos matriculados')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Gestionar Curso' }));
        await user.click(screen.getByRole('button', { name: 'Sync count 5' }));

        expect(screen.getByText('Total: 5 alumnos matriculados')).toBeInTheDocument();
    });

    it('mantiene el conteo si la sincronización informa el mismo valor', async () => {
        const user = userEvent.setup();
        mockedGetProfessorAssignedCourses.mockResolvedValue([
            {
                course_id: 404,
                title: 'Curso estable',
                category: 'Backend'
            }
        ]);
        mockedGetActiveStudentsByCourse.mockResolvedValue([{ studentId: 1 }]);

        render(<ProfessorDashboard />);

        await screen.findByRole('heading', { name: 'Curso estable' });
        expect(screen.getByText('Total: 1 alumnos matriculados')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Gestionar Curso' }));
        await user.click(screen.getByRole('button', { name: 'Sync same count' }));

        expect(screen.getByText('Total: 1 alumnos matriculados')).toBeInTheDocument();
    });

    it('ignora sincronización si el courseId no existe en la colección actual', async () => {
        const user = userEvent.setup();
        mockedGetProfessorAssignedCourses.mockResolvedValue([
            {
                course_id: 505,
                title: 'Curso filtro por id',
                category: 'Backend'
            }
        ]);
        mockedGetActiveStudentsByCourse.mockResolvedValue([{ studentId: 1 }]);

        render(<ProfessorDashboard />);

        await screen.findByRole('heading', { name: 'Curso filtro por id' });
        expect(screen.getByText('Total: 1 alumnos matriculados')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Gestionar Curso' }));
        await user.click(screen.getByRole('button', { name: 'Sync unknown course' }));

        expect(screen.getByText('Total: 1 alumnos matriculados')).toBeInTheDocument();
    });

    it('normaliza categoría usando subCategory cuando category llega vacía', async () => {
        mockedGetProfessorAssignedCourses.mockResolvedValue([
            {
                course_id: 601,
                title: 'Curso por subcategoría',
                category: '   ',
                subCategory: 'Data Engineering',
                courseType: 'Bootcamp'
            }
        ]);

        render(<ProfessorDashboard />);

        expect(await screen.findByRole('heading', { name: 'Curso por subcategoría' })).toBeInTheDocument();
        expect(screen.getByText('Data Engineering')).toBeInTheDocument();
    });

    it('normaliza categoría usando courseType cuando category y subCategory llegan vacías', async () => {
        mockedGetProfessorAssignedCourses.mockResolvedValue([
            {
                course_id: 602,
                title: 'Curso por tipo',
                category: '   ',
                subCategory: '   ',
                courseType: 'Masterclass'
            }
        ]);

        render(<ProfessorDashboard />);

        expect(await screen.findByRole('heading', { name: 'Curso por tipo' })).toBeInTheDocument();
        expect(screen.getByText('Masterclass')).toBeInTheDocument();
    });

    it('soporta sesión sin usuario y no rompe la hidratación del dashboard', async () => {
        mockedAuthUser.username = undefined;
        mockedAuthUser.email = undefined;

        mockedGetProfessorAssignedCourses.mockResolvedValue([
            {
                course_id: 603,
                title: 'Curso sin usuario en sesión',
                category: 'Backend'
            }
        ]);
        mockedGetActiveStudentsByCourse.mockResolvedValue([{ studentId: 1 }]);

        render(<ProfessorDashboard />);

        expect(await screen.findByRole('heading', { name: 'Curso sin usuario en sesión' })).toBeInTheDocument();
        expect(screen.getByText('Total: 1 alumnos matriculados')).toBeInTheDocument();
    });

    it('activa la rama cancelled al desmontar antes de resolver la hidratación', async () => {
        let resolveAssignedCourses: (value: Array<{ course_id: number; title: string; category: string }>) => void = () => undefined;

        mockedGetProfessorAssignedCourses.mockImplementationOnce(
            () => new Promise((resolve) => {
                resolveAssignedCourses = resolve as (value: Array<{ course_id: number; title: string; category: string }>) => void;
            })
        );

        const { unmount } = render(<ProfessorDashboard />);

        unmount();

        resolveAssignedCourses([
            {
                course_id: 700,
                title: 'Curso tardío',
                category: 'Backend'
            }
        ]);

        await Promise.resolve();
        await Promise.resolve();

        expect(mockedGetProfessorAssignedCourses).toHaveBeenCalledTimes(1);
    });
});