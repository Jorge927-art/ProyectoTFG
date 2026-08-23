import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GlobalStatisticsPanel } from './GlobalStatisticsPanel';
import {
    getAdminGlobalStatistics,
    resolveAdminGlobalStatisticsErrorMessage,
    searchAdminProfessorRatings,
} from '../../../../services/adminGlobalStatisticsService';

vi.mock('../../../../services/adminGlobalStatisticsService', () => ({
    getAdminGlobalStatistics: vi.fn(),
    searchAdminProfessorRatings: vi.fn(),
    resolveAdminGlobalStatisticsErrorMessage: vi.fn(),
}));

describe('GlobalStatisticsPanel', () => {
    const baseData = {
        currentYear: 2026,
        totalStudents: 120,
        totalProfessors: 9,
        topCourses: [
            { courseId: 10, courseTitle: 'Algebra', enrolledStudents: 45 },
            { courseId: 20, courseTitle: 'Historia', enrolledStudents: 30 },
        ],
        yearlyComparisons: [
            { year: 2026, totalStudents: 120, totalProfessors: 9, topCourseEnrollment: 45, realData: true },
            { year: 2025, totalStudents: 110, totalProfessors: 8, topCourseEnrollment: 40, realData: false },
            { year: 2024, totalStudents: 100, totalProfessors: 7, topCourseEnrollment: 35, realData: false },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(resolveAdminGlobalStatisticsErrorMessage)
            .mockReturnValue('No se pudo cargar el panel estadístico global.');
        vi.mocked(searchAdminProfessorRatings).mockResolvedValue([]);
    });

    it('renderiza métricas y ranking cuando la carga es correcta', async () => {
        vi.mocked(getAdminGlobalStatistics).mockResolvedValue(baseData);

        render(<GlobalStatisticsPanel />);

        await waitFor(() => {
            expect(screen.getByText('Panel Estadístico Global')).toBeInTheDocument();
            expect(screen.getByText('Alumnos (total actual)')).toBeInTheDocument();
            expect(screen.getByText('Profesores (total actual)')).toBeInTheDocument();
            expect(screen.getByText('1. Algebra')).toBeInTheDocument();
            expect(screen.getAllByText(/2025 \(ficticio\)/).length).toBeGreaterThan(0);
            expect(screen.queryByRole('button', { name: /Consolidar año cerrado/i })).not.toBeInTheDocument();
        });
    });

    it('muestra mensaje de error cuando falla la carga inicial', async () => {
        vi.mocked(getAdminGlobalStatistics).mockRejectedValue(new Error('boom'));

        render(<GlobalStatisticsPanel />);

        await waitFor(() => {
            expect(resolveAdminGlobalStatisticsErrorMessage).toHaveBeenCalled();
            expect(screen.getByText('No se pudo cargar el panel estadístico global.')).toBeInTheDocument();
        });
    });

});
