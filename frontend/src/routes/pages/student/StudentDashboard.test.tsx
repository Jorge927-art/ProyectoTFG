import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import StudentDashboard from './StudentDashboard';
import { useEnrolledCourses } from './components/useEnrolledCourses';
import { useActiveEvaluations } from './components/useActiveEvaluations';
import { useSmartRecommendations } from './components/useSmartRecommendations';
import type { EnrollmentInfo, DBModelCourse } from '../../../services/courseTypes';

// =========================================================================
// 1. MOCKS DE HOOKS DE LÓGICA DISTRIBUIDA (DOMINIO DE DATOS)
// =========================================================================
vi.mock('./components/useEnrolledCourses', () => ({
    useEnrolledCourses: vi.fn()
}));

vi.mock('./components/useActiveEvaluations', () => ({
    useActiveEvaluations: vi.fn()
}));

vi.mock('./components/useSmartRecommendations', () => ({
    useSmartRecommendations: vi.fn()
}));

// =========================================================================
// 2. MOCKS DE COMPONENTES DE INTERFAZ ELIMINANDO EL TIPO PROHIBIDO 'ANY'
// =========================================================================
vi.mock('../../layouts/DashboardLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-dashboard-layout">{children}</div>
}));

vi.mock('../../../components/ui/genericHeader/GenericHeader', () => ({
    default: ({ title, description }: { title: string; description: React.ReactNode }) => (
        <div data-testid="mock-generic-header">
            <span>{title}</span>
            <div>{description}</div>
        </div>
    )
}));

vi.mock('../../../components/ui/genericButton/GenericButton', () => ({
    default: ({ label, onClick }: { label: string; onClick?: () => void }) => (
        <button onClick={onClick} data-testid={`btn-${label.replace(/\s+/g, '-').toLowerCase()}`}>{label}</button>
    )
}));

vi.mock('./InterestsModal', () => ({
    InterestsModal: ({ isOpen, onClose, onSave }: { isOpen: boolean; onClose: () => void; onSave: (p: { categories: string[] }) => void }) => (
        isOpen ? (
            <div data-testid="mock-interests-modal">
                <button onClick={onClose} data-testid="btn-close-modal">Cerrar</button>
                <button onClick={() => onSave({ categories: ['Java'] })} data-testid="btn-save-modal">Guardar</button>
            </div>
        ) : null
    )
}));

vi.mock('./components/StudentCoursePicker', () => ({
    StudentCoursePicker: ({ onEnrollSuccess, onSetGlobalError, onSetGlobalSuccess }: {
        onEnrollSuccess: (course: DBModelCourse) => void;
        onSetGlobalError: (message: string) => void;
        onSetGlobalSuccess: (message: string) => void;
    }) => (
        <div data-testid="mock-course-picker">
            <button data-testid="btn-trigger-enroll-success" onClick={() => onEnrollSuccess({ course_id: 99, title: 'Curso de Testing', category: 'General' })} />
            <button data-testid="btn-trigger-enroll-error" onClick={() => onSetGlobalError('Error de red simulado')} />
            <button data-testid="btn-trigger-enroll-success-msg" onClick={() => onSetGlobalSuccess('Matrícula manual OK')} />
        </div>
    )
}));

vi.mock('./components/EnrolledCourses', () => ({
    EnrolledCourses: ({ loadingEnrollments, onRefresh }: { loadingEnrollments: boolean; onRefresh: () => void }) => (
        <div data-testid="mock-enrolled-courses">
            <span>{loadingEnrollments ? 'Cargando asignaturas...' : 'Panel Asignaturas'}</span>
            <button data-testid="btn-refresh-enrollments" onClick={onRefresh} />
        </div>
    )
}));

vi.mock('./components/SmartRecommendations', () => ({
    SmartRecommendations: ({ recommendations }: { recommendations: DBModelCourse[] }) => (
        <div data-testid="mock-smart-recommendations">
            <span>Recomendaciones: {recommendations.length}</span>
        </div>
    )
}));

vi.mock('./components/DocumentManager', () => ({
    DocumentManager: () => <div data-testid="mock-document-manager" />
}));

vi.mock('./components/CourseAssignmentPanel', () => ({
    CourseAssignmentPanel: ({ activeCourseId }: { activeCourseId: number | null }) => (
        <div data-testid="mock-assignment-panel">ID Activo: {activeCourseId ?? 'null'}</div>
    )
}));

vi.mock('./components/StudentStatsPanel', () => ({
    StudentStatsPanel: ({ activeCourseId }: { activeCourseId: number | null }) => (
        <div data-testid="mock-stats-panel">Stats ID: {activeCourseId ?? 'null'}</div>
    )
}));

vi.mock('./components/EvaluationPanel', () => ({
    EvaluationPanel: () => <div data-testid="mock-evaluation-panel" />
}));

describe('StudentDashboard - Suite de Pruebas Unitarias del Panel del Estudiante', () => {
    const mockFetchStudentEnrollments = vi.fn();
    const mockRefreshPending = vi.fn();

    const mockEnrollmentList: EnrollmentInfo[] = [
        {
            enrollmentid: 501,
            enrolled_at: '2026-01-01',
            started_at: null,
            status: 'ACTIVE',
            progress_percentage: 70,
            course: {
                course_id: 42,
                title: 'Desarrollo Cloud con AWS',
                category: 'Cloud',
                instructors: 'Prof. Wilson'
            }
        }
    ];

    const mockRecommendationList: DBModelCourse[] = [
        {
            course_id: 88,
            title: 'Sistemas Distribuidos y Docker',
            category: 'DevOps',
            instructors: 'Prof. Kube'
        }
    ];

    const defaultEnrolledReturn = {
        enrolledList: mockEnrollmentList,
        loadingEnrollments: false,
        enrollmentError: '',
        fetchStudentEnrollments: mockFetchStudentEnrollments
    };

    const defaultRecsReturn = {
        recommendations: mockRecommendationList,
        loadingRecommendations: false,
        recommendationsError: ''
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // [CORRECCIÓN CRÍTICA ts(2345)]: Uso de unknown as ReturnType para evitar incompatibilidad de objetos funcionales
        vi.mocked(useEnrolledCourses).mockReturnValue(defaultEnrolledReturn as unknown as ReturnType<typeof useEnrolledCourses>);
        vi.mocked(useActiveEvaluations).mockReturnValue({ refreshPending: mockRefreshPending } as unknown as ReturnType<typeof useActiveEvaluations>);
        vi.mocked(useSmartRecommendations).mockReturnValue(defaultRecsReturn as unknown as ReturnType<typeof useSmartRecommendations>);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    /* =========================================================================
       1. VERIFICACIÓN DE MAQUETACIÓN CORE Y FOCO ANALÍTICO (activeCourseId)
       ========================================================================= */
    it('Debe renderizar todos los subcomponentes del layout e inyectar el ID de curso prioritario', () => {
        render(<StudentDashboard />);

        // Verificar el enmarcado de la interfaz gráfica y cabeceras
        expect(screen.getByTestId('mock-dashboard-layout')).toBeInTheDocument();
        expect(screen.getByTestId('mock-generic-header')).toBeInTheDocument();
        expect(screen.getByText('Intereses del Estudiante')).toBeInTheDocument();
        expect(screen.getByText('Recomendaciones para ti')).toBeInTheDocument();

        // Control estructural de paneles subordinados
        expect(screen.getByTestId('mock-course-picker')).toBeInTheDocument();
        expect(screen.getByTestId('mock-enrolled-courses')).toBeInTheDocument();
        expect(screen.getByTestId('mock-document-manager')).toBeInTheDocument();
        expect(screen.getByTestId('mock-evaluation-panel')).toBeInTheDocument();

        // Validación analítica [ADR-41]: Debe extraer el ID del primer curso matriculado (42) y propagarlo
        expect(screen.getByText('ID Activo: 42')).toBeInTheDocument();
        expect(screen.getByText('Stats ID: 42')).toBeInTheDocument();
    });

    it('Debe propagar un valor nulo en el activeCourseId si la lista de asignaturas matriculadas está vacía', () => {
        const emptyEnrolledReturn = {
            ...defaultEnrolledReturn,
            enrolledList: []
        };
        vi.mocked(useEnrolledCourses).mockReturnValue(emptyEnrolledReturn as unknown as ReturnType<typeof useEnrolledCourses>);

        render(<StudentDashboard />);

        expect(screen.getByText('ID Activo: null')).toBeInTheDocument();
        expect(screen.getByText('Stats ID: null')).toBeInTheDocument();
    });

    /* =========================================================================
       2. CONTROL COMPORTAMENTAL DEL MODAL DE INTERESES Y SUS CALLBACKS
       ========================================================================= */
    it('Debe abrir el modal de configuración de intereses, cerrarlo y pintar la alerta de éxito con temporizador', () => {
        render(<StudentDashboard />);

        // El modal debe arrancar cerrado
        expect(screen.queryByTestId('mock-interests-modal')).not.toBeInTheDocument();

        // Disparar apertura mediante el botón accesible mapeado
        const botonAbrir = screen.getByTestId('btn-configurar-intereses');
        fireEvent.click(botonAbrir);
        expect(screen.getByTestId('mock-interests-modal')).toBeInTheDocument();

        // Probar el botón de cierre interno del modal
        const botonCerrar = screen.getByTestId('btn-close-modal');
        fireEvent.click(botonCerrar);
        expect(screen.queryByTestId('mock-interests-modal')).not.toBeInTheDocument();

        // Reabrir para simular la persistencia de preferencias
        fireEvent.click(screen.getByTestId('btn-configurar-intereses'));
        const botonGuardar = screen.getByTestId('btn-save-modal');
        fireEvent.click(botonGuardar);

        // El modal debe auto-cerrarse y pintar el feedback verde en pantalla con rol alert
        expect(screen.queryByTestId('mock-interests-modal')).not.toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('¡Intereses guardados y actualizados correctamente!');

        // Avanzar el reloj virtual 5 segundos para comprobar el borrado de traza diferido de la UI
        act(() => {
            vi.advanceTimersByTime(5000);
        });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    /* =========================================================================
       3. REACCIONES DE MATRÍCULA Y REFRESCADO ASÍNCRONO DE LA CAPA OPERATIVA
       ========================================================================= */
    it('Debe desencadenar las alertas de éxito y refrescar las asignaturas tras matricularse con éxito', () => {
        render(<StudentDashboard />);

        // Provocar el callback simulando que el subcomponente picker se matricula con éxito
        const triggerEnroll = screen.getByTestId('btn-trigger-enroll-success');
        fireEvent.click(triggerEnroll);

        // La UI debe reflejar el banner de éxito unificado capturando el título del curso inyectado
        const bannerSuccess = screen.getByRole('alert');
        expect(bannerSuccess).toHaveTextContent('¡Éxito! Te has matriculado en: Curso de Testing');

        // Se debe invocar síncronamente el refresco analítico hacia la base de datos de PostgreSQL
        expect(mockFetchStudentEnrollments).toHaveBeenCalledTimes(1);

        // Validar la desaparición del aviso de feedback tras los 5 segundos reglamentarios
        act(() => {
            vi.advanceTimersByTime(5000);
        });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('Debe invocar el refresco de matrícula y pintar un mensaje específico si el usuario inicia un curso desde el panel', () => {
        render(<StudentDashboard />);

        const botonRefresh = screen.getByTestId('btn-refresh-enrollments');
        fireEvent.click(botonRefresh);

        expect(mockFetchStudentEnrollments).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('alert')).toHaveTextContent('¡Curso iniciado con éxito! Sincronizando cronómetro...');
    });

    /* =========================================================================
       4. CONTROL DE CONTINGENCIAS DE RED Y SPINNERS ASÍNCRONOS
       ========================================================================= */
    it('Debe consolidar y priorizar cualquier burbuja de error arrojada por los hooks e inyectarla en un único banner', () => {
        // Simulamos errores concurrentes en cascada en las dos fuentes de datos distribuidas
        const errorEnrolledReturn = {
            ...defaultEnrolledReturn,
            enrollmentError: 'Error 503: Servicio de matrículas saturado temporalmente.'
        };
        const errorRecsReturn = {
            ...defaultRecsReturn,
            recommendationsError: 'Error de conexión con el motor de Inteligencia Artificial.'
        };

        // [CORRECCIÓN CRÍTICA ts(2345)]: Doble casteo seguro para inyección limpia libre de errores estructurales
        vi.mocked(useEnrolledCourses).mockReturnValue(errorEnrolledReturn as unknown as ReturnType<typeof useEnrolledCourses>);
        vi.mocked(useSmartRecommendations).mockReturnValue(errorRecsReturn as unknown as ReturnType<typeof useSmartRecommendations>);

        render(<StudentDashboard />);

        // Al renderizarse, el dashboard debe absorber y pintar la excepción de forma legible
        const bannerError = screen.getByRole('alert');
        expect(bannerError).toBeInTheDocument();
        expect(bannerError).toHaveTextContent(/Servicio de matrículas saturado/i);
    });

    it('Debe renderizar de forma síncrona el spinner animada Loader2 si loadingRecommendations está activo', () => {
        const loadingRecsReturn = {
            ...defaultRecsReturn,
            loadingRecommendations: true
        };

        // [CORRECCIÓN CRÍTICA ts(2345)]: Aplicación del casteo seguro para la rama asíncrona del spinner
        vi.mocked(useSmartRecommendations).mockReturnValue(loadingRecsReturn as unknown as ReturnType<typeof useSmartRecommendations>);

        const { container } = render(<StudentDashboard />);

        // Verificamos que la clase de animación de Tailwind CSS para el spiner se dibuja correctamente en pantalla
        const loader = container.querySelector('.animate-spin');
        expect(loader).toBeInTheDocument();
        expect(screen.queryByTestId('mock-smart-recommendations')).not.toBeInTheDocument();
    });
});
