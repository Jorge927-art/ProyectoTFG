import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { StudentCoursePicker } from './StudentCoursePicker';
import { useAuth } from '../../../../auth/useAuth';
import { useCourseCatalog } from '../../../../services/useCourseCatalog';
import type { DBModelCourse, EnrollmentInfo } from '../../../../services/courseTypes';
import type { ReactNode } from 'react';

// --- AISLAMIENTO PERIMETRAL: MOCK DE INFRAESTRUCTURA CORE ---
vi.mock('../../../../auth/useAuth', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../../../../services/useCourseCatalog', () => ({
    useCourseCatalog: vi.fn(),
}));

// --- CORRECCIÓN QUIRÚRGICA: MOCK DE COMPONENTES COMPILATORIOS ---
vi.mock('../Input', () => ({
    default: ({ value, onChange, placeholder, className }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; className?: string }) => (
        <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
            data-testid="search-input"
        />
    ),
}));

vi.mock('../genericCard/GenericCard', () => ({
    default: ({ children, className }: { children: ReactNode; className?: string }) => (
        <div className={className} data-testid="generic-card">{children}</div>
    ),
}));

// Eliminada la constante muerta 'mockedApi' para limpiar el linter de raíz
const mockedUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;
const mockedUseCourseCatalog = useCourseCatalog as unknown as ReturnType<typeof vi.fn>;
describe('StudentSearchFlow - Test de Integración del Buscador de Cursos', () => {

    const mockOnEnrollSuccess = vi.fn();
    const mockOnSetGlobalError = vi.fn();
    const mockOnSetGlobalSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // --- ACCESORIOS DE SIMULACIÓN DE DATOS (FIXTURES) CON TIPADO COMPLETO ---
    const mockCatalogCourses: DBModelCourse[] = [
        {
            course_id: 301,
            title: 'Desarrollo Web Fullstack con TS',
            category: 'Programación',
            instructors: 'Prof. Código',
            rating: 4.8
        },
        {
            course_id: 302,
            title: 'Sistemas Cloud Avanzados',
            category: 'Cloud',
            instructors: 'Dra. Nube',
            rating: 4.5
        }
    ];

    // CORRECCIÓN QUIRÚRGICA COMPILATORIA (Línea 86): Añadidas las propiedades faltantes exigidas por la interfaz estricta EnrollmentInfo
    const mockEnrolledList: EnrollmentInfo[] = [
        {
            enrollmentid: 901,
            enrolled_at: '2026-01-01T00:00:00Z',
            started_at: null,
            status: 'ACTIVE',
            progress_percentage: 100,
            course: {
                course_id: 302,
                title: 'Sistemas Cloud Avanzados',
                category: 'Cloud',
                instructors: 'Dra. Nube',
                duration: 40
            }
        }
    ];

    // --- BLOQUE 1: INICIALIZACIÓN, RENDERIZADO CONTEXTUAL Y FLUJO DE BUSQUEDA ---
    it('debe orquestar el flujo completo desde la búsqueda predictiva hasta el filtrado e interacción en el DOM', async () => {
        mockedUseAuth.mockReturnValue({
            user: {
                username: 'estudiante_tfg',
                role: 'STUDENT',
                enrolledCourseIds: [302]
            }
        });

        let currentKeyword = '';
        const mockSetSearchKeyword = vi.fn().mockImplementation((newKeyword: string) => {
            currentKeyword = newKeyword;
        });

        mockedUseCourseCatalog.mockReturnValue({
            searchKeyword: currentKeyword,
            setSearchKeyword: mockSetSearchKeyword,
            catalogCourses: mockCatalogCourses,
            loadingCatalog: false,
            actionExecutionId: null,
            catalogError: '',
            executeCourseAction: vi.fn()
        });

        const { rerender } = render(
            <StudentCoursePicker
                enrolledList={mockEnrolledList}
                onEnrollSuccess={mockOnEnrollSuccess}
                onSetGlobalError={mockOnSetGlobalError}
                onSetGlobalSuccess={mockOnSetGlobalSuccess}
            />
        );

        const enrollButton = screen.getByRole('button', { name: /Matricularme/i });
        expect(enrollButton).toBeInTheDocument();
        expect(enrollButton).not.toBeDisabled();

        const searchInput = screen.getByPlaceholderText('Buscar cursos...');
        fireEvent.change(searchInput, { target: { value: 'Fullstack' } });

        expect(mockSetSearchKeyword).toHaveBeenCalledWith('Fullstack');

        mockedUseCourseCatalog.mockReturnValue({
            searchKeyword: 'Fullstack',
            setSearchKeyword: mockSetSearchKeyword,
            catalogCourses: [mockCatalogCourses[0]],
            loadingCatalog: false,
            actionExecutionId: null,
            catalogError: '',
            executeCourseAction: vi.fn()
        });

        rerender(
            <StudentCoursePicker
                enrolledList={[]}
                onEnrollSuccess={mockOnEnrollSuccess}
                onSetGlobalError={mockOnSetGlobalError}
                onSetGlobalSuccess={mockOnSetGlobalSuccess}
            />
        );

        expect(screen.queryByText('Sistemas Cloud Avanzados')).not.toBeInTheDocument();
        expect(screen.getByText('Desarrollo Web Fullstack con TS')).toBeInTheDocument();
    });
    // --- BLOQUE 2: ACCIÓN DE MATRICULACIÓN, CARGA TRANSMUTACIONAL Y ACCIÓN DE RED ---
    it('debe disparar la acción de matrícula, inyectar el estado de carga y validar la petición REST final', async () => {
        // CORRECCIÓN QUIRÚRGICA COMPILATORIA (Línea 182): Anteposición de guion bajo para indicar parámetros no-leídos válidos
        const mockExecuteCourseAction = vi.fn().mockImplementation(async () => {
            return Promise.resolve();
        });

        mockedUseAuth.mockReturnValue({
            user: { username: 'estudiante_tfg', role: 'STUDENT', enrolledCourseIds: [] }
        });

        mockedUseCourseCatalog.mockReturnValue({
            searchKeyword: '',
            setSearchKeyword: vi.fn(),
            catalogCourses: mockCatalogCourses,
            loadingCatalog: false,
            actionExecutionId: null,
            catalogError: '',
            executeCourseAction: mockExecuteCourseAction
        });

        const { rerender } = render(
            <StudentCoursePicker
                enrolledList={[]}
                onEnrollSuccess={mockOnEnrollSuccess}
                onSetGlobalError={mockOnSetGlobalError}
                onSetGlobalSuccess={mockOnSetGlobalSuccess}
            />
        );

        const targetEnrollButtons = screen.getAllByRole('button', { name: /Matricularme/i });
        const firstEnrollButton = targetEnrollButtons[0];
        expect(firstEnrollButton).toBeInTheDocument();
        expect(firstEnrollButton).not.toBeDisabled();

        await act(async () => {
            fireEvent.click(firstEnrollButton);
        });

        expect(mockExecuteCourseAction).toHaveBeenCalledTimes(1);
        expect(mockExecuteCourseAction).toHaveBeenCalledWith(
            301,
            '/api/courses/enroll/301',
            'post'
        );

        mockedUseCourseCatalog.mockReturnValue({
            searchKeyword: '',
            setSearchKeyword: vi.fn(),
            catalogCourses: mockCatalogCourses,
            loadingCatalog: false,
            actionExecutionId: 301,
            catalogError: '',
            executeCourseAction: mockExecuteCourseAction
        });

        rerender(
            <StudentCoursePicker
                enrolledList={[]}
                onEnrollSuccess={mockOnEnrollSuccess}
                onSetGlobalError={mockOnSetGlobalError}
                onSetGlobalSuccess={mockOnSetGlobalSuccess}
            />
        );

        const processingButtons = screen.getAllByRole('button', { name: /Matricularme/i });
        const firstProcessingButton = processingButtons[0];
        expect(firstProcessingButton).toBeDisabled();

        const successCallback = mockedUseCourseCatalog.mock.calls[0][0] as (course: DBModelCourse) => void;

        act(() => {
            successCallback(mockCatalogCourses[0]);
        });

        expect(mockOnEnrollSuccess).toHaveBeenCalledWith(mockCatalogCourses[0]);
        expect(mockOnSetGlobalSuccess).toHaveBeenCalledWith("¡Te has matriculado en el curso correctamente!");
    });
});
