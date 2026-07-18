import { render, screen, waitFor } from '@testing-library/react';
// Añadimos el tipo estricto "Mock" en la importación de vitest
import { describe, it, vi, expect, beforeEach, type Mock } from 'vitest';
import { CourseManagementModal } from './CourseManagementModal';
import * as evaluationService from '../../../../services/evaluationService';

// Forzamos el mockeo explícito del módulo de servicios
vi.mock('../../../../services/evaluationService', () => ({
    getActiveStudentsByCourse: vi.fn(),
    getCourseManagementMetrics: vi.fn(),
}));

// Sincronización estricta sin usar tipos "any" explícitos
const mockGetActiveStudents = evaluationService.getActiveStudentsByCourse as unknown as Mock;
const mockGetCourseMetrics = evaluationService.getCourseManagementMetrics as unknown as Mock;

describe('CourseManagementModal - Suite de Pruebas Unitarias', () => {
    const mockOnClose = vi.fn();
    const mockCourseId = 3;

    const mockStudentsData = [
        {
            studentId: 101,
            fullName: 'Juan Pérez Alumno',
            email: 'juan.perez@alumnos.com',
            averageScore: 8.5,
            progressPercentage: 75
        }
    ];

    const mockMetricsData = {
        courseId: 3,
        groupAverageScore: 6.5,
        activeStudentsCount: 1,
        pendingTasksCount: 2
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe renderizar la lista de alumnos activos y sus micro-gráficas comparativas correctamente', async () => {
        // Inyección nativa sin usar vi.mocked()
        mockGetActiveStudents.mockResolvedValue(mockStudentsData);
        mockGetCourseMetrics.mockResolvedValue(mockMetricsData);

        render(
            <CourseManagementModal
                courseId={mockCourseId}
                isOpen={true}
                onClose={mockOnClose}
            />
        );

        expect(screen.getByText(/Hidratando datos mediante Lazy Loading/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Juan Pérez Alumno')).toBeInTheDocument();
            expect(screen.getByText('juan.perez@alumnos.com')).toBeInTheDocument();
        });

        expect(screen.getByText('8.5 / 10')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
    });
    it('debe mostrar el mensaje de ausencia de datos cuando la lista de alumnos llega vacía desde la API', async () => {
        // Asignación nativa de la respuesta vacía sin usar vi.mocked
        mockGetActiveStudents.mockResolvedValue([]);
        mockGetCourseMetrics.mockResolvedValue({
            courseId: 3,
            groupAverageScore: 0,
            activeStudentsCount: 0,
            pendingTasksCount: 0
        });

        render(
            <CourseManagementModal
                courseId={mockCourseId}
                isOpen={true}
                onClose={mockOnClose}
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/No hay alumnos activos registrados en esta asignatura/i)).toBeInTheDocument();
        });
    });

    it('debe activar la validación estricta [ADR-25] y mostrar error si el archivo seleccionado no es un PDF', async () => {
        mockGetActiveStudents.mockResolvedValue([]);
        mockGetCourseMetrics.mockResolvedValue({
            courseId: 3,
            groupAverageScore: 0,
            activeStudentsCount: 0,
            pendingTasksCount: 0
        });

        const { default: userEvent } = await import('@testing-library/user-event');

        render(
            <CourseManagementModal
                courseId={mockCourseId}
                isOpen={true}
                onClose={mockOnClose}
            />
        );

        // Esperamos a que finalice el Lazy Loading de la primera pestaña
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Alumnado y Rendimiento/i })).toBeInTheDocument();
        });

        // Cambiamos a la pestaña de trabajos utilizando user-event
        const tabTrabajos = screen.getByRole('button', { name: /Trabajos y Exámenes/i });
        await userEvent.click(tabTrabajos);

        // 1. Capturamos el input directamente del DOM simulado
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

        // 2. Simulamos el archivo .txt incorrecto para forzar el bloqueo ADR-25
        const fakeTxtFile = new File(['contenido ficticio'], 'guia_docente.txt', { type: 'text/plain' });

        // 3. DISPARO NATIVO: Asignamos el archivo y lanzamos el evento sin pasar por userEvent
        Object.defineProperty(fileInput, 'files', {
            value: [fakeTxtFile],
            writable: true
        });

        fileInput.dispatchEvent(new Event('change', { bubbles: true }));

        // 4. Confirmamos de forma asíncrona el cumplimiento estricto del estándar [ADR-25]
        await waitFor(() => {
            expect(screen.getByText(/Validación Estricta \[ADR-25\]: Solo se admiten archivos en formato .pdf/i)).toBeInTheDocument();
        });
    });

    it('debe navegar a la pestaña de métricas globales y renderizar los indicadores analíticos reales del record de Java', async () => {
        mockGetActiveStudents.mockResolvedValue([]);
        // Sincronizamos el mock con las propiedades reales de tus records de backend
        mockGetCourseMetrics.mockResolvedValue({
            activeStudentsCount: 12,
            groupAverageGrade: 7.45,
            pendingSubmissionsCount: 4
        });

        const { default: userEvent } = await import('@testing-library/user-event');

        render(
            <CourseManagementModal
                courseId={mockCourseId}
                isOpen={true}
                onClose={mockOnClose}
            />
        );

        // Esperamos a que el Lazy Loading inicial de la primera pestaña concluya
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Alumnado y Rendimiento/i })).toBeInTheDocument();
        });

        // Forzamos la navegación interactiva simulando el clic real del docente en la tercera pestaña
        const tabMetricas = screen.getByRole('button', { name: /Métricas Globales/i });
        await userEvent.click(tabMetricas);

        // Evaluamos de forma síncrona que el mapeo e inmutabilidad del componente pinte los datos correctos
        await waitFor(() => {
            expect(screen.getByText('Rendimiento Consolidado del Grupo')).toBeInTheDocument();
            expect(screen.getByText('7.45')).toBeInTheDocument();
            expect(screen.getByText('12')).toBeInTheDocument();
            expect(screen.getByText('4 tareas')).toBeInTheDocument();
        });
    });

    it('debe gestionar de forma segura los límites de las micro-barras de progreso en Tailwind ante calificaciones máximas para evitar desbordamientos visuales', async () => {
        // Simulamos un escenario extremo: un alumno con nota máxima (10) y progreso completo (100)
        mockGetActiveStudents.mockResolvedValue([
            {
                studentId: 202,
                fullName: 'Alumno Brillante',
                email: 'brillante@alumnos.com',
                averageScore: 10.0,
                progressPercentage: 100
            }
        ]);

        mockGetCourseMetrics.mockResolvedValue({
            activeStudentsCount: 1,
            groupAverageGrade: 1.5,
            pendingSubmissionsCount: 0
        });

        render(
            <CourseManagementModal
                courseId={mockCourseId}
                isOpen={true}
                onClose={mockOnClose}
            />
        );

        // Esperamos a que concluya la hidratación diferida inicial
        await waitFor(() => {
            expect(screen.getByText('Alumno Brillante')).toBeInTheDocument();
        });

        // Capturamos las barras de progreso renderizadas en el DOM simulado de la interfaz
        const progressBars = document.querySelectorAll('.bg-blue-600, .bg-emerald-500');

        // Verificamos de forma estricta que los estilos inyectados calculen correctamente las dimensiones relativas (100% y 100% respectivamente)
        progressBars.forEach((bar) => {
            const element = bar as HTMLElement;
            expect(element.style.width).toBe('100%');
        });
    });
});
