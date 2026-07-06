import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EvaluationPanel } from './EvaluationPanel';
import { useActiveEvaluations } from './useActiveEvaluations';

// 1. Mockear el hook para aislar el componente visual de las llamadas de Axios
vi.mock('./useActiveEvaluations', () => ({
    useActiveEvaluations: vi.fn()
}));

describe('EvaluationPanel Component [TFG Test Suite]', () => {
    const mockSubmitEvaluation = vi.fn();
    const mockSetEvaluationError = vi.fn();
    const mockRefreshPending = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Configuración por defecto para un estado inicial limpio sin asignaturas
        vi.mocked(useActiveEvaluations).mockReturnValue({
            pendingList: [],
            loadingPending: false,
            isSubmitting: false,
            evaluationError: '',
            setEvaluationError: mockSetEvaluationError,
            refreshPending: mockRefreshPending,
            submitEvaluation: mockSubmitEvaluation
        } as ReturnType<typeof useActiveEvaluations>);
    });

    it('debe renderizar el estado vacío cuando no existen asignaturas pendientes de evaluar', () => {
        render(<EvaluationPanel />);

        expect(screen.getByText('Evaluación Académica de Docentes y Cursos')).toBeInTheDocument();
        expect(screen.getByText('Has evaluado todas tus asignaturas vigentes. ¡Buen trabajo!')).toBeInTheDocument();
    });

    it('debe renderizar la lista de asignaturas y profesores activos pendientes de calificación', () => {
        const mockPending = [
            {
                enrollmentid: 10,
                enrolled_at: '2026-07-06T10:00:00.000Z',
                status: 'EN_PROGRESO',
                course: {
                    course_id: 101,
                    title: 'Introduction to Data Science',
                    category: 'Data Science',
                    instructors: 'Prof. Andrew Ng',
                    duration: 40
                }
            }
        ];

        vi.mocked(useActiveEvaluations).mockReturnValue({
            pendingList: mockPending,
            loadingPending: false,
            isSubmitting: false,
            evaluationError: '',
            setEvaluationError: mockSetEvaluationError,
            refreshPending: mockRefreshPending,
            submitEvaluation: mockSubmitEvaluation
        } as ReturnType<typeof useActiveEvaluations>);

        render(<EvaluationPanel />);

        expect(screen.getByText('Introduction to Data Science')).toBeInTheDocument();
        expect(screen.getByText('Docente: Prof. Andrew Ng')).toBeInTheDocument();
        expect(screen.getByText('1 pendientes')).toBeInTheDocument();
    });

    it('debe mostrar el spinner de carga asíncrona mientras sincroniza con PostgreSQL', () => {
        vi.mocked(useActiveEvaluations).mockReturnValue({
            pendingList: [],
            loadingPending: true,
            isSubmitting: false,
            evaluationError: '',
            setEvaluationError: mockSetEvaluationError,
            refreshPending: mockRefreshPending,
            submitEvaluation: mockSubmitEvaluation
        } as ReturnType<typeof useActiveEvaluations>);

        render(<EvaluationPanel />);

        expect(screen.getByText('Sincronizando asignaturas matriculadas...')).toBeInTheDocument();
    });

    it('debe desplegar el Alert Box controlado si el hook reporta un fallo de red o denegación', () => {
        vi.mocked(useActiveEvaluations).mockReturnValue({
            pendingList: [],
            loadingPending: false,
            isSubmitting: false,
            evaluationError: 'Acceso denegado: No puedes evaluar un curso sin matrícula activa.',
            setEvaluationError: mockSetEvaluationError,
            refreshPending: mockRefreshPending,
            submitEvaluation: mockSubmitEvaluation
        } as ReturnType<typeof useActiveEvaluations>);

        render(<EvaluationPanel />);

        expect(screen.getByText('Acceso denegado: No puedes evaluar un curso sin matrícula activa.')).toBeInTheDocument();
    });

    it('debe abrir el formulario de rating dual al pulsar el botón Evaluar', async () => {
        const mockPending = [
            {
                enrollmentid: 10,
                enrolled_at: '2026-07-06T10:00:00.000Z',
                status: 'EN_PROGRESO',
                course: {
                    course_id: 101,
                    title: 'Introduction to Data Science',
                    category: 'Data Science',
                    instructors: 'Prof. Andrew Ng',
                    duration: 40
                }
            }
        ];

        vi.mocked(useActiveEvaluations).mockReturnValue({
            pendingList: mockPending,
            loadingPending: false,
            isSubmitting: false,
            evaluationError: '',
            setEvaluationError: mockSetEvaluationError,
            refreshPending: mockRefreshPending,
            submitEvaluation: mockSubmitEvaluation
        } as ReturnType<typeof useActiveEvaluations>);

        render(<EvaluationPanel />);

        const evalButton = screen.getByRole('button', { name: /Evaluar/i });
        fireEvent.click(evalButton);

        // [CORRECCIÓN ACT WARNING]: Esperamos de forma asíncrona a que concluya la mutación del DOM virtual
        await waitFor(() => {
            expect(mockSetEvaluationError).toHaveBeenCalledWith('');
        });
    });
});
