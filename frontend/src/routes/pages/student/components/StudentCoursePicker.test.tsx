import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StudentCoursePicker } from './StudentCoursePicker';
import { useAuth } from '../../../../auth/useAuth';
import { useCourseCatalog } from '../../../../services/useCourseCatalog';
import type { DBModelCourse, EnrollmentInfo } from '../../../../services/courseTypes';

// 1. Aislamiento perimetral de los Hooks de sesión e infraestructura de datos
vi.mock('../../../../auth/useAuth', () => ({
    useAuth: vi.fn()
}));

vi.mock('../../../../services/useCourseCatalog', () => ({
    useCourseCatalog: vi.fn()
}));

// Mock simple de GenericButton que expone de forma directa e invariable su comportamiento nativo
vi.mock('../../../../components/ui/genericButton/GenericButton', () => ({
    default: ({ label, disabled, onClick, icon }: {
        label: string;
        disabled?: boolean;
        onClick?: () => void;
        icon?: React.ReactNode
    }) => (
        <button disabled={disabled} onClick={onClick}>
            {icon}
            <span>{label}</span>
        </button>
    )
}));

describe('StudentCoursePicker - Suite Funcional del Lado del Estudiante', () => {
    const mockOnEnrollSuccess = vi.fn();
    const mockOnSetGlobalError = vi.fn();
    const mockOnSetGlobalSuccess = vi.fn();
    const mockExecuteCourseAction = vi.fn();
    const mockSetSearchKeyword = vi.fn();

    const mockCatalogCourses: DBModelCourse[] = [
        {
            course_id: 10,
            title: 'Introducción a Java 17',
            category: 'Backend',
            instructors: 'Prof. Test'
        },
        {
            course_id: 20,
            title: 'Estructuras de Datos con C++',
            category: 'Core',
            instructors: 'Prof. Algo'
        }
    ];

    const mockEnrolledList: EnrollmentInfo[] = [
        {
            enrollmentid: 1,
            enrolled_at: '2026-01-01T12:00:00Z',
            started_at: null,
            status: 'ENROLLED',
            progress_percentage: 0,
            course: {
                course_id: 20,
                title: 'Estructuras de Datos con C++',
                category: 'Core',
                instructors: 'Prof. Algo'
            }
        }
    ];

    const defaultCatalogHookReturn = {
        searchKeyword: '',
        setSearchKeyword: mockSetSearchKeyword,
        catalogCourses: mockCatalogCourses,
        loadingCatalog: false,
        actionExecutionId: null,
        catalogError: '',
        setCatalogError: vi.fn(),
        executeCourseAction: mockExecuteCourseAction
    };

    beforeEach(() => {
        vi.clearAllMocks();

        const mockAuthValue = {
            user: { username: 'student_test', enrolledCourseIds: [] as number[] }
        };
        vi.mocked(useAuth).mockReturnValue(mockAuthValue as ReturnType<typeof useAuth>);

        const mockCatalogValue = defaultCatalogHookReturn as unknown;
        vi.mocked(useCourseCatalog).mockReturnValue(mockCatalogValue as ReturnType<typeof useCourseCatalog>);
    });

    it('Debe combinar el catálogo global con la lista inscrita mediante useMemo y renderizar las acciones correspondientes', () => {
        render(
            <StudentCoursePicker
                enrolledList={mockEnrolledList}
                onEnrollSuccess={mockOnEnrollSuccess}
                onSetGlobalError={mockOnSetGlobalError}
                onSetGlobalSuccess={mockOnSetGlobalSuccess}
            />
        );

        expect(screen.getByText('Catálogo Global de Cursos')).toBeInTheDocument();

        // Verificar curso libre 10
        expect(screen.getByText('Introducción a Java 17')).toBeInTheDocument();
        const botonesMatricular = screen.getAllByRole('button', { name: /Matricularme/i });
        expect(botonesMatricular.length).toBe(1);
        expect(botonesMatricular[0]).not.toBeDisabled();

        // Verificar curso matriculado 20
        expect(screen.getByText('Estructuras de Datos con C++')).toBeInTheDocument();
        const botonInscrito = screen.getByRole('button', { name: /Inscrito/i });
        expect(botonInscrito).toBeInTheDocument();
        expect(botonInscrito).toBeDisabled();
    });

    it('Debe priorizar la evaluación O(1) de matriculación si el ID del curso está indexado en el token JWT del usuario', () => {
        // [CORRECCIÓN CRÍTICA]: Array de IDs cerrado y formateado correctamente sin errores sintácticos
        const mockAuthValue = {
            user: { username: 'student_test', enrolledCourseIds: [20] }
        };
        vi.mocked(useAuth).mockReturnValue(mockAuthValue as ReturnType<typeof useAuth>);

        render(
            <StudentCoursePicker
                enrolledList={[]}
                onEnrollSuccess={mockOnEnrollSuccess}
                onSetGlobalError={mockOnSetGlobalError}
                onSetGlobalSuccess={mockOnSetGlobalSuccess}
            />
        );

        const botonInscrito = screen.getByRole('button', { name: /Inscrito/i });
        expect(botonInscrito).toBeInTheDocument();
        expect(botonInscrito).toBeDisabled();
    });

    it('Debe invocar executeCourseAction atacando al endpoint post con el formato REST exacto del alumno', async () => {
        render(
            <StudentCoursePicker
                enrolledList={[]}
                onEnrollSuccess={mockOnEnrollSuccess}
                onSetGlobalError={mockOnSetGlobalError}
                onSetGlobalSuccess={mockOnSetGlobalSuccess}
            />
        );

        const botonesMatricular = screen.getAllByRole('button', { name: /Matricularme/i });
        fireEvent.click(botonesMatricular[0]);

        expect(mockExecuteCourseAction).toHaveBeenCalledWith(10, '/api/courses/enroll/10', 'post');
    });

    it('Debe mutar al estado de carga inhabilitando el botón si actionExecutionId coincide con el curso', () => {
        const mockCatalogValue = {
            ...defaultCatalogHookReturn,
            actionExecutionId: 10
        } as unknown;
        vi.mocked(useCourseCatalog).mockReturnValue(mockCatalogValue as ReturnType<typeof useCourseCatalog>);

        render(
            <StudentCoursePicker
                enrolledList={[]}
                onEnrollSuccess={mockOnEnrollSuccess}
                onSetGlobalError={mockOnSetGlobalError}
                onSetGlobalSuccess={mockOnSetGlobalSuccess}
            />
        );

        const tituloCurso = screen.getByText('Introducción a Java 17');
        const tarjetaCurso = tituloCurso.closest('div');
        const botonProcesando = tarjetaCurso?.parentElement?.querySelector('button');

        expect(botonProcesando).toBeDisabled();
    });

    it('Debe disparar la burbuja de error global si el hook del catálogo reporta un fallo de red', () => {
        const mockCatalogValue = {
            ...defaultCatalogHookReturn,
            catalogError: 'Error de red'
        } as unknown;
        vi.mocked(useCourseCatalog).mockReturnValue(mockCatalogValue as ReturnType<typeof useCourseCatalog>);

        render(
            <StudentCoursePicker
                enrolledList={[]}
                onEnrollSuccess={mockOnEnrollSuccess}
                onSetGlobalError={mockOnSetGlobalError}
                onSetGlobalSuccess={mockOnSetGlobalSuccess}
            />
        );

        expect(mockOnSetGlobalError).toHaveBeenCalledWith('Error de red');
    });

    it('Debe ejecutar las callbacks de éxito cuando la función de suscripción del hook devuelve la llamada', async () => {
        let savedCallback: (course: DBModelCourse) => void = () => { };

        vi.mocked(useCourseCatalog).mockImplementation((onActionSuccess) => {
            if (onActionSuccess) {
                savedCallback = onActionSuccess;
            }
            return defaultCatalogHookReturn as ReturnType<typeof useCourseCatalog>;
        });

        render(
            <StudentCoursePicker
                enrolledList={[]}
                onEnrollSuccess={mockOnEnrollSuccess}
                onSetGlobalError={mockOnSetGlobalError}
                onSetGlobalSuccess={mockOnSetGlobalSuccess}
            />
        );

        // [CORRECCIÓN CRÍTICA]: Pasamos un único elemento DBModelCourse en vez del array para resolver el ts(2345)
        const dummyCourse = mockCatalogCourses[0];
        savedCallback(dummyCourse);

        await waitFor(() => {
            expect(mockOnEnrollSuccess).toHaveBeenCalledWith(dummyCourse);
            expect(mockOnSetGlobalSuccess).toHaveBeenCalledWith("¡Te has matriculado en el curso correctamente!");
        });
    });
});
