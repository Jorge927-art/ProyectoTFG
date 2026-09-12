import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminStudentPreferencesPanel from './AdminStudentPreferencesPanel';
import * as preferencesService from '../../../../services/adminStudentPreferencesService';

vi.mock('../../../../services/adminStudentPreferencesService', () => ({
    getAdminStudentPreferences: vi.fn(),
    resolveAdminStudentPreferencesError: vi.fn(() => 'No se pudo actualizar el análisis de preferencias de los alumnos.'),
}));

describe('AdminStudentPreferencesPanel', () => {
    const payload = {
        studentsWithPreferences: 4,
        activeStudentsWithEnrollments: 12,
        preferences: [
            { dimension: 'Categorías', values: ['Programación', 'Diseño'], selections: 4, analyzedStudents: 4 },
            { dimension: 'Nivel de dificultad', values: ['Intermedio'], selections: 3, analyzedStudents: 4 },
        ],
        courses: [
            {
                courseId: 10,
                title: 'Java avanzado',
                totalScore: 85,
                categoryScore: 30,
                enrollmentScore: 20,
                levelScore: 20,
                languageScore: 15,
                subtitleScore: 0,
                durationScore: 0,
                activeEnrollments: 8,
                professorAssigned: true,
                professorUsername: 'laura',
            },
            {
                courseId: 11,
                title: 'Diseño UX',
                totalScore: 70,
                categoryScore: 30,
                enrollmentScore: 10,
                levelScore: 20,
                languageScore: 10,
                subtitleScore: 0,
                durationScore: 0,
                activeEnrollments: 4,
                professorAssigned: false,
                professorUsername: null,
            },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('no carga datos automáticamente y permite actualizarlos bajo demanda', async () => {
        vi.mocked(preferencesService.getAdminStudentPreferences).mockResolvedValue(payload);

        render(<AdminStudentPreferencesPanel />);

        expect(preferencesService.getAdminStudentPreferences).not.toHaveBeenCalled();
        expect(screen.getByText(/Pulsa Actualizar/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

        await waitFor(() => expect(preferencesService.getAdminStudentPreferences).toHaveBeenCalledTimes(1));
        expect(screen.getByText('Programación / Diseño')).toBeInTheDocument();
        expect(screen.getByText('Profesor asignado: laura')).toBeInTheDocument();
        expect(screen.getByText('Sin profesor asignado')).toBeInTheDocument();
        expect(screen.getByText('85 puntos')).toBeInTheDocument();
    });

    it('muestra el estado vacío cuando el backend no encuentra puntuaciones', async () => {
        vi.mocked(preferencesService.getAdminStudentPreferences).mockResolvedValue({
            ...payload,
            preferences: payload.preferences.map((preference) => ({ ...preference, values: [] })),
            courses: [],
        });

        render(<AdminStudentPreferencesPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

        await waitFor(() => expect(screen.getByText(/No hay preferencias ni matrículas activas/)).toBeInTheDocument());
    });

    it('conserva el contenido informativo de error cuando falla la actualización', async () => {
        vi.mocked(preferencesService.getAdminStudentPreferences).mockRejectedValue(new Error('fallo'));

        render(<AdminStudentPreferencesPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No se pudo actualizar'));
    });

    it('deshabilita Actualizar durante una petición pendiente y muestra la marca temporal al finalizar', async () => {
        let resolveRequest: (value: typeof payload) => void = () => undefined;
        vi.mocked(preferencesService.getAdminStudentPreferences).mockReturnValueOnce(
            new Promise((resolve) => {
                resolveRequest = resolve;
            })
        );

        render(<AdminStudentPreferencesPanel />);
        const refreshButton = screen.getByRole('button', { name: 'Actualizar' });
        fireEvent.click(refreshButton);

        expect(screen.getByRole('button', { name: 'Actualizando...' })).toBeDisabled();
        resolveRequest(payload);

        await waitFor(() => expect(screen.getByText(/Última actualización:/)).toBeInTheDocument());
    });

    it('muestra Sin datos y el fallback del título cuando la respuesta contiene campos vacíos', async () => {
        vi.mocked(preferencesService.getAdminStudentPreferences).mockResolvedValue({
            ...payload,
            preferences: [{ ...payload.preferences[0], values: [], selections: 0 }],
            courses: [{ ...payload.courses[0], title: null, professorUsername: null }],
        });

        render(<AdminStudentPreferencesPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

        await waitFor(() => {
            expect(screen.getByText('Sin datos')).toBeInTheDocument();
            expect(screen.getByText(/1\. Curso sin título/)).toBeInTheDocument();
            expect(screen.getByText('Profesor asignado: sin nombre')).toBeInTheDocument();
        });
    });
});
