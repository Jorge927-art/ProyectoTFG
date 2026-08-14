import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CourseInsightPanel } from './CourseInsightPanel';
import {
    searchCourses,
    getCourseDetail,
    getCourseCollectiveStats,
    finalizePreviousYearCourseStats,
    resolveCourseInsightErrorMessage,
} from '../../../../services/adminCourseInsightService';

vi.mock('../../../../services/adminCourseInsightService', () => ({
    searchCourses: vi.fn(),
    getCourseDetail: vi.fn(),
    getCourseCollectiveStats: vi.fn(),
    getCourseUserStats: vi.fn(),
    finalizePreviousYearCourseStats: vi.fn(),
    resolveCourseInsightErrorMessage: vi.fn(),
}));

describe('CourseInsightPanel', () => {
    const courseSearchResult = {
        courseId: 1,
        title: 'Algebra',
        category: 'Matemáticas',
    };

    const courseDetail = {
        courseId: 1,
        title: 'Algebra',
        professor: {
            userId: 1,
            username: 'prof_algebra',
            role: 'PROFESSOR' as const,
            enabled: true,
        },
        students: [
            { userId: 10, username: 'student1', role: 'STUDENT' as const, enabled: true },
            { userId: 11, username: 'student2', role: 'STUDENT' as const, enabled: true },
        ],
    };

    const baseCollectiveStats = {
        activeStudentsInCourse: 2,
        courseAverageProgressPercentage: 75.5,
        completionRatePercentage: 100,
        averageCourseRating: 4.2,
        averageInstructorRating: 4.5,
        averageGrade: 8.5,
        averageWorkGrade: 7.8,
        averageFinalExamGrade: 9.0,
        yearlyComparisons: [
            { year: 2026, activeStudentsInCourse: 2, courseAverageProgressPercentage: 75.5, approvalIndexPercentage: 100, averageCourseRating: 4.2, averageInstructorRating: 4.5, averageGrade: 8.5, averageWorkGrade: 7.8, averageFinalExamGrade: 9.0, realData: true },
            { year: 2025, activeStudentsInCourse: 2, courseAverageProgressPercentage: 70.0, approvalIndexPercentage: 90, averageCourseRating: 4.0, averageInstructorRating: 4.3, averageGrade: 8.0, averageWorkGrade: 7.5, averageFinalExamGrade: 8.5, realData: false },
            { year: 2024, activeStudentsInCourse: 2, courseAverageProgressPercentage: 65.0, approvalIndexPercentage: 80, averageCourseRating: 3.8, averageInstructorRating: 4.0, averageGrade: 7.5, averageWorkGrade: 7.0, averageFinalExamGrade: 8.0, realData: false },
        ],
        studentStatistics: [
            { userId: 10, username: 'student1', progressPercentage: 80, averageGrade: 8.5, averageWorkGrade: 7.8, averageFinalExamGrade: 9.0, passed: true },
            { userId: 11, username: 'student2', progressPercentage: 70, averageGrade: 8.0, averageWorkGrade: 7.5, averageFinalExamGrade: 8.5, passed: true },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(resolveCourseInsightErrorMessage).mockReturnValue(
            'No se pudo cargar el panel estadístico de cursos.'
        );
        vi.mocked(searchCourses).mockResolvedValue([]);
    });

    it('renderiza el panel y busca cursos correctamente', async () => {
        vi.mocked(searchCourses).mockResolvedValue([courseSearchResult]);

        render(<CourseInsightPanel />);

        expect(screen.getByText('Panel Estadístico de Cursos')).toBeInTheDocument();

        const input = screen.getByPlaceholderText('Escribe el inicio del nombre del curso...');
        fireEvent.change(input, { target: { value: 'Alg' } });

        await waitFor(() => {
            expect(screen.getByText('Algebra')).toBeInTheDocument();
        });
    });

    it('muestra mensaje de error cuando falla la búsqueda de cursos', async () => {
        vi.mocked(searchCourses).mockRejectedValue(new Error('network error'));
        vi.mocked(resolveCourseInsightErrorMessage).mockReturnValue('Error al buscar cursos.');

        render(<CourseInsightPanel />);

        const input = screen.getByPlaceholderText('Escribe el inicio del nombre del curso...');
        fireEvent.change(input, { target: { value: 'Alg' } });

        await waitFor(() => {
            expect(screen.getByText('Error al buscar cursos.')).toBeInTheDocument();
        });
    });

    it('carga el detalle del curso cuando se selecciona uno', async () => {
        vi.mocked(searchCourses).mockResolvedValue([courseSearchResult]);
        vi.mocked(getCourseDetail).mockResolvedValue(courseDetail);
        vi.mocked(getCourseCollectiveStats).mockResolvedValue(baseCollectiveStats);

        render(<CourseInsightPanel />);

        const input = screen.getByPlaceholderText('Escribe el inicio del nombre del curso...');
        fireEvent.change(input, { target: { value: 'Alg' } });

        await waitFor(() => {
            expect(screen.getByText('Algebra')).toBeInTheDocument();
        });

        const courseButton = screen.getByRole('button', { name: /Algebra/i });
        fireEvent.click(courseButton);

        await waitFor(() => {
            expect(getCourseDetail).toHaveBeenCalledWith(1);
            expect(getCourseCollectiveStats).toHaveBeenCalledWith(1);
        });
    });

    it('consolida el año cerrado del curso y refresca datos al completar con éxito', async () => {
        const updatedCollectiveStats = {
            ...baseCollectiveStats,
            yearlyComparisons: [
                { year: 2026, activeStudentsInCourse: 2, courseAverageProgressPercentage: 75.5, approvalIndexPercentage: 100, averageCourseRating: 4.2, averageInstructorRating: 4.5, averageGrade: 8.5, averageWorkGrade: 7.8, averageFinalExamGrade: 9.0, realData: true },
                { year: 2025, activeStudentsInCourse: 2, courseAverageProgressPercentage: 70.0, approvalIndexPercentage: 90, averageCourseRating: 4.0, averageInstructorRating: 4.3, averageGrade: 8.0, averageWorkGrade: 7.5, averageFinalExamGrade: 8.5, realData: true },
                { year: 2024, activeStudentsInCourse: 2, courseAverageProgressPercentage: 65.0, approvalIndexPercentage: 80, averageCourseRating: 3.8, averageInstructorRating: 4.0, averageGrade: 7.5, averageWorkGrade: 7.0, averageFinalExamGrade: 8.0, realData: false },
            ],
        };

        vi.mocked(searchCourses).mockResolvedValue([courseSearchResult]);
        vi.mocked(getCourseDetail).mockResolvedValue(courseDetail);
        vi.mocked(getCourseCollectiveStats)
            .mockResolvedValueOnce(baseCollectiveStats)
            .mockResolvedValueOnce(updatedCollectiveStats);
        vi.mocked(finalizePreviousYearCourseStats).mockResolvedValue({
            message: 'Histórico anual del curso consolidado correctamente.',
            finalizedYear: 2025,
        });

        render(<CourseInsightPanel />);

        const input = screen.getByPlaceholderText('Escribe el inicio del nombre del curso...');
        fireEvent.change(input, { target: { value: 'Alg' } });

        await waitFor(() => {
            expect(screen.getByText('Algebra')).toBeInTheDocument();
        });

        const courseButton = screen.getByRole('button', { name: /Algebra/i });
        fireEvent.click(courseButton);

        await waitFor(() => {
            expect(getCourseDetail).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(getCourseCollectiveStats).toHaveBeenCalled();
        });

        const finalizeButton = screen.getByRole('button', { name: /Consolidar año cerrado/i });
        fireEvent.click(finalizeButton);

        await waitFor(() => {
            expect(finalizePreviousYearCourseStats).toHaveBeenCalledWith(1);
            expect(getCourseCollectiveStats).toHaveBeenCalledTimes(2);
        });
    });

    it('muestra error cuando falla la consolidación anual del curso', async () => {
        vi.mocked(searchCourses).mockResolvedValue([courseSearchResult]);
        vi.mocked(getCourseDetail).mockResolvedValue(courseDetail);
        vi.mocked(getCourseCollectiveStats).mockResolvedValue(baseCollectiveStats);
        vi.mocked(finalizePreviousYearCourseStats).mockRejectedValue(new Error('consolidation failed'));
        vi.mocked(resolveCourseInsightErrorMessage).mockReturnValue(
            'No se pudo consolidar el histórico anual del curso.'
        );

        render(<CourseInsightPanel />);

        const input = screen.getByPlaceholderText('Escribe el inicio del nombre del curso...');
        fireEvent.change(input, { target: { value: 'Alg' } });

        await waitFor(() => {
            expect(screen.getByText('Algebra')).toBeInTheDocument();
        });

        const courseButton = screen.getByRole('button', { name: /Algebra/i });
        fireEvent.click(courseButton);

        await waitFor(() => {
            expect(getCourseDetail).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(getCourseCollectiveStats).toHaveBeenCalled();
        });

        const finalizeButton = screen.getByRole('button', { name: /Consolidar año cerrado/i });
        fireEvent.click(finalizeButton);

        await waitFor(() => {
            expect(screen.getByText('No se pudo consolidar el histórico anual del curso.')).toBeInTheDocument();
        });
    });

    it('desactiva el botón de consolidación mientras se está procesando', async () => {
        vi.mocked(searchCourses).mockResolvedValue([courseSearchResult]);
        vi.mocked(getCourseDetail).mockResolvedValue(courseDetail);
        vi.mocked(getCourseCollectiveStats).mockResolvedValue(baseCollectiveStats);
        vi.mocked(finalizePreviousYearCourseStats).mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve({ message: 'OK', finalizedYear: 2025 }), 100))
        );

        render(<CourseInsightPanel />);

        const input = screen.getByPlaceholderText('Escribe el inicio del nombre del curso...');
        fireEvent.change(input, { target: { value: 'Alg' } });

        await waitFor(() => {
            expect(screen.getByText('Algebra')).toBeInTheDocument();
        });

        const courseButton = screen.getByRole('button', { name: /Algebra/i });
        fireEvent.click(courseButton);

        await waitFor(() => {
            expect(getCourseDetail).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(getCourseCollectiveStats).toHaveBeenCalled();
        });

        const finalizeButton = screen.getByRole('button', { name: /Consolidar año cerrado/i });
        fireEvent.click(finalizeButton);

        await waitFor(() => {
            expect(finalizePreviousYearCourseStats).toHaveBeenCalledWith(1);
        });
    });
});
