import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EvaluationPanel } from './EvaluationPanel';
import { useActiveEvaluations } from './useActiveEvaluations';

// 1. Mockear el hook para aislar el componente visual de las llamadas de Axios
vi.mock('./useActiveEvaluations', () => ({
    useActiveEvaluations: vi.fn()
}));

describe('EvaluationPanel Component [TFG Test Suite]', () => {
    const mockSubmitEvaluation = vi.fn();
    const mockRefreshPending = vi.fn();
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

    beforeEach(() => {
        vi.clearAllMocks();

        // CONTRATO INTEGRAL: Se añade refreshPending para satisfacer la interfaz del hook real
        vi.mocked(useActiveEvaluations).mockReturnValue({
            pendingList: [],
            loadingPending: false,
            isSubmitting: false,
            evaluationError: '',
            refreshPending: mockRefreshPending,
            submitEvaluation: mockSubmitEvaluation
        });
    });

    it('debe renderizar el estado vacío cuando no existen asignaturas pendientes de evaluar', () => {
        render(<EvaluationPanel />);

        expect(screen.getByText('Evaluación académica')).toBeInTheDocument();
        expect(screen.getByText('¡Todo al día! No tienes evaluaciones pendientes.')).toBeInTheDocument();
    });

    it('debe renderizar la lista de asignaturas y profesores activos pendientes de calificación', () => {
        vi.mocked(useActiveEvaluations).mockReturnValue({
            pendingList: mockPending,
            loadingPending: false,
            isSubmitting: false,
            evaluationError: '',
            refreshPending: mockRefreshPending,
            submitEvaluation: mockSubmitEvaluation
        });

        render(<EvaluationPanel />);

        expect(screen.getByText('Introduction to Data Science')).toBeInTheDocument();
        expect(screen.getByText('Prof: Prof. Andrew Ng')).toBeInTheDocument();
    });

    it('debe mostrar el spinner de carga asíncrona mientras sincroniza con PostgreSQL', () => {
        vi.mocked(useActiveEvaluations).mockReturnValue({
            pendingList: [],
            loadingPending: true,
            isSubmitting: false,
            evaluationError: '',
            refreshPending: mockRefreshPending,
            submitEvaluation: mockSubmitEvaluation
        });

        render(<EvaluationPanel />);

        expect(screen.getByText('Consultando red académica...')).toBeInTheDocument();
    });

    it('debe desplegar el Alert Box controlado si el hook reporta un fallo de red o denegación', () => {
        vi.mocked(useActiveEvaluations).mockReturnValue({
            pendingList: [],
            loadingPending: false,
            isSubmitting: false,
            evaluationError: 'Acceso denegado: No puedes evaluar un curso sin matrícula activa.',
            refreshPending: mockRefreshPending,
            submitEvaluation: mockSubmitEvaluation
        });

        render(<EvaluationPanel />);

        expect(screen.getByText('Acceso denegado: No puedes evaluar un curso sin matrícula activa.')).toBeInTheDocument();
    });

    it('debe validar la existencia de las estrellas de rating dual e interceptar la acción de envío', async () => {
        vi.mocked(useActiveEvaluations).mockReturnValue({
            pendingList: mockPending,
            loadingPending: false,
            isSubmitting: false,
            evaluationError: '',
            refreshPending: mockRefreshPending,
            submitEvaluation: mockSubmitEvaluation
        });

        render(<EvaluationPanel />);

        expect(screen.getByText('Calidad del curso')).toBeInTheDocument();
        expect(screen.getByText('Desempeño docente')).toBeInTheDocument();

        const submitButton = screen.getByRole('button', { name: /ENVIAR EVALUACIÓN/i });
        expect(submitButton).toBeDisabled();
    });

    it('debe degradar con seguridad al estado vacío si pendingList llega con formato no-array', () => {
        vi.mocked(useActiveEvaluations).mockReturnValue({
            pendingList: { pending: [] } as unknown as never[],
            loadingPending: false,
            isSubmitting: false,
            evaluationError: '',
            refreshPending: mockRefreshPending,
            submitEvaluation: mockSubmitEvaluation
        });

        render(<EvaluationPanel />);

        expect(screen.getByText('¡Todo al día! No tienes evaluaciones pendientes.')).toBeInTheDocument();
    });

    it('debe mostrar el error de validación cuando el backend rechaza el envío de la evaluación', () => {
        vi.mocked(useActiveEvaluations).mockReturnValue({
            pendingList: mockPending,
            loadingPending: false,
            isSubmitting: false,
            evaluationError: 'Error de validación: la puntuación debe estar entre 1 y 5.',
            refreshPending: mockRefreshPending,
            submitEvaluation: mockSubmitEvaluation
        });

        render(<EvaluationPanel />);

        expect(screen.getByText('Error de validación: la puntuación debe estar entre 1 y 5.')).toBeInTheDocument();
        expect(screen.getByText('Introduction to Data Science')).toBeInTheDocument();
    });

    it('debe bloquear doble envío cuando la evaluación ya se está enviando', () => {
        vi.mocked(useActiveEvaluations).mockReturnValue({
            pendingList: mockPending,
            loadingPending: false,
            isSubmitting: true,
            evaluationError: '',
            refreshPending: mockRefreshPending,
            submitEvaluation: mockSubmitEvaluation
        });

        render(<EvaluationPanel />);

        const submitButton = screen.getByRole('button', { name: /Enviando.../i });
        expect(submitButton).toBeDisabled();

        fireEvent.click(submitButton);
        fireEvent.click(submitButton);

        expect(mockSubmitEvaluation).not.toHaveBeenCalled();
    });

    it('debe reflejar el caso de ya evaluado mostrando alerta y sin habilitar reenvío vacío', () => {
        vi.mocked(useActiveEvaluations).mockReturnValue({
            pendingList: mockPending,
            loadingPending: false,
            isSubmitting: false,
            evaluationError: 'Ya has evaluado esta asignatura.',
            refreshPending: mockRefreshPending,
            submitEvaluation: mockSubmitEvaluation
        });

        render(<EvaluationPanel />);

        expect(screen.getByText('Ya has evaluado esta asignatura.')).toBeInTheDocument();
        const submitButton = screen.getByRole('button', { name: /ENVIAR EVALUACIÓN/i });
        expect(submitButton).toBeDisabled();
    });
});
