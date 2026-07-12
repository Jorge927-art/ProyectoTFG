import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrolledCourses } from './EnrolledCourses';
import type { EnrollmentInfo } from '../../../../services/courseTypes';
import { apiClient } from '../../../../services/apiClient';

vi.mock('../../../../services/apiClient', () => ({
    apiClient: {
        post: vi.fn().mockResolvedValue({ status: 200 }),
    },
}));

describe('Auditoría UI: Aislamiento de Estados en EnrolledCourses', () => {
    const mockOnRefresh = vi.fn();

    // Fabricamos dos matrículas de prueba con estados e IDs 100% controlados
    const mockEnrolledList: EnrollmentInfo[] = [
        {
            enrollmentid: 101,
            enrolled_at: '2026-01-01T00:00:00.000Z',
            started_at: null, // ──> ESTE CURSO ESTÁ PENDIENTE
            status: 'EN_PROGRESO',
            progress_percentage: 0,
            course: {
                course_id: 1,
                title: 'Curso Pendiente de Prueba',
                category: 'BUSINESS',
                instructors: 'Profesor A'
            }
        },
        {
            enrollmentid: 102,
            enrolled_at: '2026-01-01T00:00:00.000Z',
            started_at: '2026-01-02T00:00:00.000Z', // ──> ESTE CURSO YA SE INICIÓ
            status: 'EN_CURSO',
            progress_percentage: 15, // 15% de progreso calculado por el tiempo transcurrido
            course: {
                course_id: 2,
                title: 'Curso Iniciado de Prueba',
                category: 'DATA_SCIENCE',
                instructors: 'Profesor B'
            }
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe renderizar el botón "Iniciar curso" única y exclusivamente en las tarjetas con started_at nulo', () => {
        render(
            <EnrolledCourses
                enrolledList={mockEnrolledList}
                loadingEnrollments={false}
                onRefresh={mockOnRefresh}
            />
        );

        // 1. Validamos que el botón azul existe para el curso número 1
        const startButtons = screen.getAllByRole('button', { name: /iniciar curso/i });
        expect(startButtons.length).toBe(1); // Exigimos que SOLO haya un botón en toda la lista

        // 2. Validamos que la etiqueta del segundo curso muestra el texto de alta fidelidad inmutable
        expect(screen.getByText('✓ Estudiando asignatura')).toBeInTheDocument();
        expect(screen.getByText('En curso (24h/día)')).toBeInTheDocument();
        expect(screen.getByText('15%')).toBeInTheDocument();
    });

    it('debe despachar el ID de matrícula correcto al hacer clic en el botón de acción', () => {
        render(
            <EnrolledCourses
                enrolledList={mockEnrolledList}
                loadingEnrollments={false}
                onRefresh={mockOnRefresh}
            />
        );

        const startButton = screen.getByRole('button', { name: /iniciar curso/i });
        fireEvent.click(startButton);

        // Verificamos que la mutación use el identificador de la matrícula y no el del curso.
        expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith('/api/auth/enrollment/101/start');
    });
});
