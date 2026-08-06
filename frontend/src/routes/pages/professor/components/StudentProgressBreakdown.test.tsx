import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentProgressBreakdown } from './StudentProgressBreakdown';
import type { StudentMetricBreakdown } from '../../../../services/teachingMetricsService';

vi.mock('../../../../components/ui/genericCard/GenericCard', () => ({
    default: ({ children }: { children: React.ReactNode }) => <section data-testid="generic-card">{children}</section>
}));

const students: StudentMetricBreakdown[] = [
    {
        userId: 1,
        username: 'alumno1',
        email: 'alumno1@uni.es',
        courseId: 10,
        courseTitle: 'Arquitectura',
        progressPercentage: 90,
        averageGrade: 8.5
    }
];

const manyStudents: StudentMetricBreakdown[] = [
    ...students,
    {
        userId: 2,
        username: 'alumno2',
        email: 'alumno2@uni.es',
        courseId: 10,
        courseTitle: 'Arquitectura',
        progressPercentage: 70,
        averageGrade: 7.1
    },
    {
        userId: 3,
        username: 'alumno3',
        email: 'alumno3@uni.es',
        courseId: 10,
        courseTitle: 'Arquitectura',
        progressPercentage: 55,
        averageGrade: 6.8
    },
    {
        userId: 4,
        username: 'alumno4',
        email: 'alumno4@uni.es',
        courseId: 10,
        courseTitle: 'Arquitectura',
        progressPercentage: 100,
        averageGrade: 9.2
    }
];

describe('StudentProgressBreakdown', () => {
    it('debe mostrar el estado vacío cuando no hay alumnos', () => {
        render(<StudentProgressBreakdown students={[]} showCourseColumn={true} />);

        expect(screen.getByText('Sin alumnos matriculados en el ámbito seleccionado.')).toBeInTheDocument();
    });

    it('debe mostrar curso y progreso cuando existen alumnos y el selector está en TODOS', () => {
        render(<StudentProgressBreakdown students={students} showCourseColumn={true} />);

        expect(screen.getByText('alumno1')).toBeInTheDocument();
        expect(screen.getByText('Arquitectura')).toBeInTheDocument();
        expect(screen.getByText('Progreso del curso')).toBeInTheDocument();
        expect(screen.getByText('90%')).toBeInTheDocument();
    });

    it('no debe mostrar la columna de curso cuando se filtra por una única asignatura', () => {
        render(<StudentProgressBreakdown students={students} showCourseColumn={false} />);

        expect(screen.getByText('alumno1')).toBeInTheDocument();
        expect(screen.queryByText('Arquitectura')).not.toBeInTheDocument();
    });

    it('debe habilitar scroll interno cuando hay más de tres alumnos', () => {
        render(<StudentProgressBreakdown students={manyStudents} showCourseColumn={false} />);

        const list = screen.getByTestId('student-progress-list');
        expect(list.className).toContain('overflow-y-scroll');
        expect(list.className).toContain('max-h-56');
    });

    it('debe mantener la altura fija del listado cuando hay tres o menos alumnos', () => {
        render(<StudentProgressBreakdown students={students} showCourseColumn={false} />);

        const list = screen.getByTestId('student-progress-list');
        expect(list.className).toContain('overflow-y-scroll');
        expect(list.className).toContain('max-h-56');
    });
});