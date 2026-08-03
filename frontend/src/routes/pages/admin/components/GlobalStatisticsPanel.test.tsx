import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GlobalStatisticsPanel } from './GlobalStatisticsPanel';
import {
    finalizeAdminGlobalPreviousYear,
    getAdminGlobalStatistics,
    resolveAdminGlobalStatisticsErrorMessage,
} from '../../../../services/adminGlobalStatisticsService';

vi.mock('../../../../services/adminGlobalStatisticsService', () => ({
    getAdminGlobalStatistics: vi.fn(),
    finalizeAdminGlobalPreviousYear: vi.fn(),
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

    it('consolida el año cerrado y refresca los datos al completar con éxito', async () => {
        const refreshedData = {
            ...baseData,
            yearlyComparisons: [
                { year: 2026, totalStudents: 120, totalProfessors: 9, topCourseEnrollment: 45, realData: true },
                { year: 2025, totalStudents: 120, totalProfessors: 9, topCourseEnrollment: 45, realData: true },
                { year: 2024, totalStudents: 100, totalProfessors: 7, topCourseEnrollment: 35, realData: false },
            ],
        };

        vi.mocked(getAdminGlobalStatistics)
            .mockResolvedValueOnce(baseData)
            .mockResolvedValueOnce(refreshedData);
        vi.mocked(finalizeAdminGlobalPreviousYear).mockResolvedValue({
            message: 'Histórico anual consolidado correctamente.',
            finalizedYear: 2025,
        });

        render(<GlobalStatisticsPanel />);

        await waitFor(() => {
            expect(screen.getByText('1. Algebra')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Consolidar año cerrado' }));

        await waitFor(() => {
            expect(finalizeAdminGlobalPreviousYear).toHaveBeenCalledTimes(1);
            expect(getAdminGlobalStatistics).toHaveBeenCalledTimes(2);
            expect(screen.getByText('Histórico anual consolidado correctamente. Año consolidado: 2025.')).toBeInTheDocument();
        });
    });

    it('muestra error cuando falla la consolidación manual', async () => {
        vi.mocked(getAdminGlobalStatistics).mockResolvedValue(baseData);
        vi.mocked(finalizeAdminGlobalPreviousYear).mockRejectedValue(new Error('boom'));
        vi.mocked(resolveAdminGlobalStatisticsErrorMessage)
            .mockReturnValue('No se pudo consolidar el histórico anual.');

        render(<GlobalStatisticsPanel />);

        await waitFor(() => {
            expect(screen.getByText('1. Algebra')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Consolidar año cerrado' }));

        await waitFor(() => {
            expect(screen.getByText('No se pudo consolidar el histórico anual.')).toBeInTheDocument();
        });
    });
});
