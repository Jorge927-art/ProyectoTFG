import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeachingMetricsPanel } from './TeachingMetricsPanel';
import * as teachingMetricsHook from './useTeachingMetrics';
import type { TaughtCourse } from '../../../../services/userDomains';

vi.mock('../../../../components/ui/genericCard/GenericCard', () => ({
    default: ({ children }: { children: React.ReactNode }) => <section data-testid="generic-card">{children}</section>
}));

vi.mock('./useTeachingMetrics', () => ({
    useTeachingMetrics: vi.fn()
}));

vi.mock('./MetricStatCard', () => ({
    MetricStatCard: ({ title, value }: { title: string; value: string }) => (
        <div data-testid={`metric-${title}`}>{value}</div>
    )
}));

vi.mock('./StudentProgressBreakdown', () => ({
    StudentProgressBreakdown: ({ showCourseColumn }: { showCourseColumn: boolean }) => (
        <div data-testid="progress-breakdown" data-show-course-column={String(showCourseColumn)} />
    )
}));

vi.mock('./StudentGradeBreakdown', () => ({
    StudentGradeBreakdown: ({ showCourseColumn }: { showCourseColumn: boolean }) => (
        <div data-testid="grade-breakdown" data-show-course-column={String(showCourseColumn)} />
    )
}));

describe('TeachingMetricsPanel', () => {
    const availableCourses: TaughtCourse[] = [
        { id: 10, title: 'Arquitectura', category: 'Ingenieria', studentsCount: 20, averageProgress: 80 },
        { id: 20, title: 'Bases', category: 'Datos', studentsCount: 15, averageProgress: 70 }
    ];

    const hookResult = {
        summary: {
            courseId: 10,
            collectiveProgress: 80,
            completionRate: 50,
            averageGrade: 8.5
        },
        students: [
            {
                userId: 1,
                username: 'alumno1',
                email: 'alumno1@uni.es',
                courseId: 10,
                courseTitle: 'Arquitectura',
                progressPercentage: 90,
                averageGrade: 8.5
            }
        ],
        loading: false,
        error: '',
        refresh: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(teachingMetricsHook.useTeachingMetrics).mockReturnValue(hookResult as ReturnType<typeof teachingMetricsHook.useTeachingMetrics>);
    });

    it('debe renderizar el selector y notificar cambios de asignatura', () => {
        const mockOnCourseChange = vi.fn();

        render(
            <TeachingMetricsPanel
                selectedCourseId={null}
                onCourseChange={mockOnCourseChange}
                availableCourses={availableCourses}
            />
        );

        expect(screen.getByRole('option', { name: 'TODAS' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Arquitectura' })).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Asignatura'), { target: { value: '20' } });
        expect(mockOnCourseChange).toHaveBeenCalledWith(20);

        fireEvent.change(screen.getByLabelText('Asignatura'), { target: { value: '' } });
        expect(mockOnCourseChange).toHaveBeenCalledWith(null);
    });

    it('debe mostrar el estado de carga y ocultar el contenido principal', () => {
        vi.mocked(teachingMetricsHook.useTeachingMetrics).mockReturnValue({
            ...hookResult,
            loading: true
        } as ReturnType<typeof teachingMetricsHook.useTeachingMetrics>);

        render(
            <TeachingMetricsPanel
                selectedCourseId={null}
                onCourseChange={vi.fn()}
                availableCourses={availableCourses}
            />
        );

        expect(screen.getByText('Calculando métricas...')).toBeInTheDocument();
        expect(screen.queryByTestId('progress-breakdown')).not.toBeInTheDocument();
    });

    it('debe mostrar el error cuando la carga falla', () => {
        vi.mocked(teachingMetricsHook.useTeachingMetrics).mockReturnValue({
            ...hookResult,
            error: 'No se pudieron cargar las métricas de docencia.'
        } as ReturnType<typeof teachingMetricsHook.useTeachingMetrics>);

        render(
            <TeachingMetricsPanel
                selectedCourseId={null}
                onCourseChange={vi.fn()}
                availableCourses={availableCourses}
            />
        );

        expect(screen.getByText('No se pudieron cargar las métricas de docencia.')).toBeInTheDocument();
    });

    it('debe propagar showCourseColumn según el curso seleccionado', () => {
        const { rerender } = render(
            <TeachingMetricsPanel
                selectedCourseId={null}
                onCourseChange={vi.fn()}
                availableCourses={availableCourses}
            />
        );

        expect(screen.getByTestId('progress-breakdown')).toHaveAttribute('data-show-course-column', 'true');
        expect(screen.getByTestId('grade-breakdown')).toHaveAttribute('data-show-course-column', 'true');

        rerender(
            <TeachingMetricsPanel
                selectedCourseId={10}
                onCourseChange={vi.fn()}
                availableCourses={availableCourses}
            />
        );

        expect(screen.getByTestId('progress-breakdown')).toHaveAttribute('data-show-course-column', 'false');
        expect(screen.getByTestId('grade-breakdown')).toHaveAttribute('data-show-course-column', 'false');
    });
});