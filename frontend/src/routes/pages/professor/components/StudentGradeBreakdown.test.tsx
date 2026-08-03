import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentGradeBreakdown } from './StudentGradeBreakdown';
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
    },
    {
        userId: 2,
        username: 'alumno2',
        email: 'alumno2@uni.es',
        courseId: 20,
        courseTitle: 'Bases',
        progressPercentage: 70,
        averageGrade: 0
    }
];

const manyStudents: StudentMetricBreakdown[] = [
    ...students,
    {
        userId: 3,
        username: 'alumno3',
        email: 'alumno3@uni.es',
        courseId: 30,
        courseTitle: 'Sistemas',
        progressPercentage: 65,
        averageGrade: 7.2
    },
    {
        userId: 4,
        username: 'alumno4',
        email: 'alumno4@uni.es',
        courseId: 40,
        courseTitle: 'Compiladores',
        progressPercentage: 88,
        averageGrade: 8.8
    }
];

describe('StudentGradeBreakdown', () => {
    it('debe mostrar el estado vacío cuando no hay calificaciones', () => {
        render(<StudentGradeBreakdown students={[]} showCourseColumn={true} />);

        expect(screen.getByText('Sin calificaciones registradas en el ámbito seleccionado.')).toBeInTheDocument();
    });

    it('debe mostrar el curso y la nota media formateada cuando existe información', () => {
        render(<StudentGradeBreakdown students={students} showCourseColumn={true} />);

        expect(screen.getByText('alumno1')).toBeInTheDocument();
        expect(screen.getByText('Arquitectura')).toBeInTheDocument();
        expect(screen.getByText('8.5 / 10')).toBeInTheDocument();
        expect(screen.getByText('---')).toBeInTheDocument();
    });

    it('no debe mostrar la columna de curso al filtrar una sola asignatura', () => {
        render(<StudentGradeBreakdown students={students} showCourseColumn={false} />);

        expect(screen.getByText('alumno2')).toBeInTheDocument();
        expect(screen.queryByText('Arquitectura')).not.toBeInTheDocument();
    });

    it('debe habilitar scroll interno cuando hay más de tres alumnos', () => {
        render(<StudentGradeBreakdown students={manyStudents} showCourseColumn={false} />);

        const list = screen.getByTestId('student-grade-list');
        expect(list.className).toContain('overflow-y-scroll');
        expect(list.className).toContain('max-h-56');
    });

    it('debe mantener la altura fija del listado cuando hay tres o menos alumnos', () => {
        render(<StudentGradeBreakdown students={students} showCourseColumn={false} />);

        const list = screen.getByTestId('student-grade-list');
        expect(list.className).toContain('overflow-y-scroll');
        expect(list.className).toContain('max-h-56');
    });
});