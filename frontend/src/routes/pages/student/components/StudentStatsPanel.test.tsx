import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StudentStatsPanel } from './StudentStatsPanel';

const mockDismissGradeNotifications = vi.fn(async () => undefined);

vi.mock('../../../../services/evaluationService', () => ({
    dismissGradeNotifications: () => mockDismissGradeNotifications(),
}));

// Simulamos de forma asíncrona el hook para controlar el payload analítico de PostgreSQL
vi.mock('./useCourseStats', () => ({
    useCourseStats: (id: number | null | undefined) => {
        if (id === 1) {
            return {
                stats: {
                    courseId: 1,
                    averageGrade: null, // Simulamos estado inerte (sin notas)
                    localEnrollments: 0,
                    communityRating: null, // Sin valoraciones aún
                    instructorRating: null,
                    platform: 'Coursera',
                    category: 'Data Science'
                },
                loadingStats: false,
                statsError: ''
            };
        }
        return { stats: null, loadingStats: false, statsError: '' };
    }
}));

// Simulamos de forma atómica el GenericCard para aislar el árbol de componentes
vi.mock('../../../../components/ui/genericCard/GenericCard', () => {
    return {
        default: ({ children, className }: { children: React.ReactNode; className: string }) => (
            <article className={className}>{children}</article>
        )
    };
});

describe('StudentStatsPanel - Pruebas de Control [ADR-41]', () => {
    it('debería mostrar la nota del examen y los trabajos individuales de la matrícula', () => {
        render(
            <StudentStatsPanel
                activeCourseId={1}
                enrolledList={[
                    {
                        enrollmentid: 10,
                        enrolled_at: '2026-07-01T10:00:00Z',
                        started_at: null,
                        status: 'EN_PROGRESO',
                        progress_percentage: 40,
                        course: {
                            course_id: 1,
                            title: 'Migrating to Cloud SQL',
                            category: 'Cloud',
                            instructors: 'Profesor Demo',
                            duration: 20
                        },
                        grades: [
                            { title: 'Trabajo 1 - Diseño', score: '8.5' },
                            { title: 'Trabajo 2 - Despliegue', score: '9.0' },
                            { title: 'Examen final', score: '7.5' }
                        ]
                    }
                ]}
            />
        );

        expect(screen.getByText('Rendimiento y Métricas del Curso')).toBeInTheDocument();
        expect(screen.getByText('Nota del examen')).toBeInTheDocument();
        expect(screen.getByText('7.5 / 10')).toBeInTheDocument();
        expect(screen.getByText('Trabajo 1 - Diseño')).toBeInTheDocument();
        expect(screen.getByText('Trabajo 2 - Despliegue')).toBeInTheDocument();
    });

    it('debería mantener de forma estricta la clase flex-1 para ocupar el espacio asignado', () => {
        render(
            <StudentStatsPanel
                activeCourseId={1}
                enrolledList={[]}
            />
        );

        const article = screen.getByRole('article');
        expect(article).toHaveClass('flex-1');
    });

    it('debería combinar notas de múltiples matrículas del mismo curso', () => {
        render(
            <StudentStatsPanel
                activeCourseId={1}
                enrolledList={[
                    {
                        enrollmentid: 101,
                        enrolled_at: '2026-07-01T10:00:00Z',
                        started_at: null,
                        status: 'EN_PROGRESO',
                        progress_percentage: 40,
                        course: {
                            course_id: 1,
                            title: 'Migrating to Cloud SQL',
                            category: 'Cloud',
                            instructors: 'Profesor Demo',
                            duration: 20
                        },
                        grades: [{ title: 'Trabajo Académico Escrito', score: '7.0' }]
                    },
                    {
                        enrollmentid: 102,
                        enrolled_at: '2026-07-02T10:00:00Z',
                        started_at: null,
                        status: 'EN_PROGRESO',
                        progress_percentage: 45,
                        course: {
                            course_id: 1,
                            title: 'Migrating to Cloud SQL',
                            category: 'Cloud',
                            instructors: 'Profesor Demo',
                            duration: 20
                        },
                        grades: [{ title: 'Trabajo de Investigación', score: '8.0' }]
                    }
                ]}
            />
        );

        expect(screen.getByText('2 entregas')).toBeInTheDocument();
        expect(screen.getByText('Trabajo Académico Escrito')).toBeInTheDocument();
        expect(screen.getByText('Trabajo de Investigación')).toBeInTheDocument();
    });

    it('no debe clasificar como examen los trabajos cuyo título contiene la palabra final', () => {
        render(
            <StudentStatsPanel
                activeCourseId={1}
                enrolledList={[
                    {
                        enrollmentid: 110,
                        enrolled_at: '2026-07-01T10:00:00Z',
                        started_at: null,
                        status: 'EN_PROGRESO',
                        progress_percentage: 40,
                        course: {
                            course_id: 1,
                            title: 'Migrating to Cloud SQL',
                            category: 'Cloud',
                            instructors: 'Profesor Demo',
                            duration: 20
                        },
                        grades: [
                            { title: 'Trabajo final módulo 1', score: '7.0' },
                            { title: 'Trabajo final módulo 2', score: '8.5' },
                            { title: 'Examen final', score: '9.0' }
                        ]
                    }
                ]}
            />
        );

        expect(screen.getByText('2 entregas')).toBeInTheDocument();
        expect(screen.getByText('Trabajo final módulo 1')).toBeInTheDocument();
        expect(screen.getByText('Trabajo final módulo 2')).toBeInTheDocument();
        expect(screen.getByText('9.0 / 10')).toBeInTheDocument();
    });

    it('debería mostrar la Nota Final de la Asignatura cuando existe', () => {
        render(
            <StudentStatsPanel
                activeCourseId={1}
                enrolledList={[{
                    enrollmentid: 10,
                    enrolled_at: '2026-07-01T10:00:00Z',
                    started_at: null,
                    status: 'EN_PROGRESO',
                    progress_percentage: 40,
                    course: { course_id: 1, title: 'Migrating to Cloud SQL', category: 'Cloud', instructors: 'Profesor Demo', duration: 20 },
                    grades: [
                        { title: 'Trabajo 1', score: '8.0' },
                        { title: 'Examen final', score: '7.0' },
                        { title: 'Nota Final Asignatura', score: '7.5' }
                    ]
                }]}
            />
        );

        expect(screen.getByText('Nota Final de la Asignatura')).toBeInTheDocument();
        expect(screen.getByText('7.5 / 10')).toBeInTheDocument();
        // Importante: confirma que NO se cuela en "Trabajos y actividades"
        expect(screen.getByText('1 entregas')).toBeInTheDocument();
    });

    it('debería mostrar mensaje de pendiente cuando aún no hay Nota Final', () => {
        render(
            <StudentStatsPanel
                activeCourseId={1}
                enrolledList={[{
                    enrollmentid: 10,
                    enrolled_at: '2026-07-01T10:00:00Z',
                    started_at: null,
                    status: 'EN_PROGRESO',
                    progress_percentage: 40,
                    course: { course_id: 1, title: 'Migrating to Cloud SQL', category: 'Cloud', instructors: 'Profesor Demo', duration: 20 },
                    grades: [{ title: 'Trabajo 1', score: '8.0' }]
                }]}
            />
        );

        expect(screen.getByText('Aún no se ha publicado la nota final de esta asignatura.')).toBeInTheDocument();
    });

    it('muestra indicador de aclaración y abre modal compacto al pulsar una nota con comentario', () => {
        render(
            <StudentStatsPanel
                activeCourseId={1}
                enrolledList={[{
                    enrollmentid: 10,
                    enrolled_at: '2026-07-01T10:00:00Z',
                    started_at: null,
                    status: 'EN_PROGRESO',
                    progress_percentage: 40,
                    course: { course_id: 1, title: 'Migrating to Cloud SQL', category: 'Cloud', instructors: 'Profesor Demo', duration: 20 },
                    grades: [
                        { title: 'Examen final', score: '8.9', comments: 'Buena evolución general. Refuerza la parte práctica.' }
                    ]
                }]}
            />
        );

        expect(screen.getByText('Incluye aclaracion')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Nota del examen/i }));

        expect(screen.getByText('Detalle de nota')).toBeInTheDocument();
        expect(screen.getByText('Aclaracion del profesor')).toBeInTheDocument();
        expect(screen.getByText('Buena evolución general. Refuerza la parte práctica.')).toBeInTheDocument();
    });
});
