import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { CourseCatalog } from './CourseCatalog';
import type { DBModelCourse } from '../../../../services/courseTypes';

// =========================================================================
// MOCKS DE INFRAESTRUCTURA DE CONTEXTOS Y HOOKS INTERNOS
// =========================================================================

// Mock de useAuth para simular la sesión del usuario matriculado
const mockAuthUser = {
    user: {
        enrolledCourseIds: Array.of(101) // Inicializamos con el id 101 para la prueba
    }
};
vi.mock('../../../../auth/useAuth', () => ({
    useAuth: () => mockAuthUser
}));

// Interfaz para controlar el mock extendido con la referencia de callback
interface MockUseCourseCatalog extends Record<string, unknown> {
    searchKeyword: string;
    setSearchKeyword: (keyword: string) => void;
    catalogCourses: DBModelCourse[];
    loadingCatalog: boolean;
    enrollingId: number | null;
    catalogError: string | null;
    handleEnrollCourse: (courseId: number) => void;
    _triggerEnrollSuccess?: (course: DBModelCourse) => void;
}

// Mock mutable de useCourseCatalog para inyectar estados de carga o datos corruptos bajo demanda
const mockUseCourseCatalogValues: MockUseCourseCatalog = {
    searchKeyword: '',
    setSearchKeyword: vi.fn(),
    catalogCourses: [],
    loadingCatalog: false,
    enrollingId: null,
    catalogError: null,
    handleEnrollCourse: vi.fn()
};

vi.mock('./useCourseCatalog', () => ({
    useCourseCatalog: (callback: (course: DBModelCourse) => void) => {
        mockUseCourseCatalogValues._triggerEnrollSuccess = callback;
        return mockUseCourseCatalogValues;
    }
}));

// Interfaces estrictas para los componentes simulados (Mocks de UI) [ADR-13]
interface MockComponentProps {
    children?: React.ReactNode;
    className?: string;
}

interface MockButtonProps {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    icon?: React.ReactNode;
}

vi.mock('../../../../components/ui/genericCard/GenericCard', () => ({
    default: ({ children, className }: MockComponentProps) => (
        <div data-testid="generic-card" className={className}>{children}</div>
    )
}));

vi.mock('../../../../components/ui/genericButton/GenericButton', () => ({
    default: ({ label, onClick, disabled, icon }: MockButtonProps) => (
        <button onClick={onClick} disabled={disabled}>{icon}{label}</button>
    )
}));

// =========================================================================
// BATERÍA DE PRUEBAS UNITARIAS Y DE LÍMITES
// =========================================================================
describe('CourseCatalog Component - Pruebas Mixtas (Positivas y Negativas)', () => {

    const mockOnEnrollSuccess = vi.fn();
    const mockOnSetGlobalError = vi.fn();
    const mockOnSetGlobalSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Resetear valores por defecto del catálogo de forma segura
        mockUseCourseCatalogValues.catalogCourses = [];
        mockUseCourseCatalogValues.loadingCatalog = false;
        mockUseCourseCatalogValues.enrollingId = null;
        mockUseCourseCatalogValues.catalogError = null;
        mockAuthUser.user.enrolledCourseIds = [];
    });

    // ---------------------------------------------------------------------
    // CASOS POSITIVOS (Flujos de Éxito)
    // ---------------------------------------------------------------------
    test('CASO POSITIVO: Debe renderizar la lista de asignaturas y conmutar a "✓ Inscrito" si el curso coincide con los IDs del JWT', () => {
        mockUseCourseCatalogValues.catalogCourses = [
            { course_id: 101, title: 'Spring Boot Inicial', category: 'BACKEND', instructors: 'Prof. Carlos' },
            { course_id: 102, title: 'React Avanzado', category: 'FRONTEND', instructors: 'Prof. Ana' }
        ];
        mockAuthUser.user.enrolledCourseIds = [101]; // Simulamos que el usuario ya está inscrito en el curso 101

        render(
            <CourseCatalog
                enrolledList={[]}
                onEnrollSuccess={mockOnEnrollSuccess}
                onSetGlobalError={mockOnSetGlobalError}
                onSetGlobalSuccess={mockOnSetGlobalSuccess}
            />
        );

        expect(screen.getByText('Spring Boot Inicial')).toBeInTheDocument();
        expect(screen.getByText('✓ Inscrito')).toBeInTheDocument();

        expect(screen.getByText('React Avanzado')).toBeInTheDocument();
        expect(screen.getByText('Matricularme')).toBeInTheDocument();
    });

    test('CASO POSITIVO: Debe propagar la acción de búsqueda al interactuar con el componente unificado Input', () => {
        render(
            <CourseCatalog
                enrolledList={[]}
                onEnrollSuccess={mockOnEnrollSuccess}
                onSetGlobalError={mockOnSetGlobalError}
                onSetGlobalSuccess={mockOnSetGlobalSuccess}
            />
        );

        const inputSearch = screen.getByPlaceholderText('Buscar cursos...');
        fireEvent.change(inputSearch, { target: { value: 'Docker' } });

        expect(mockUseCourseCatalogValues.setSearchKeyword).toHaveBeenCalledWith('Docker');
    });

    // ---------------------------------------------------------------------
    // CASOS NEGATIVOS Y ESCENARIOS LÍMITE (Auditoría NotebookLM / Robustez de Datos)
    // ---------------------------------------------------------------------
    test('CASO NEGATIVO (LÍMITE): Debe tolerar valores nulos de Rating e Instructores inyectando los fallbacks "5.0" y "Por asignar"', () => {
        // Casteamos temporalmente a unknown para saltar la validación estricta inyectando nulos de prueba
        mockUseCourseCatalogValues.catalogCourses = [
            {
                course_id: 205,
                title: 'Curso Huérfano con Datos Nulos',
                category: undefined,
                instructors: undefined,
                rating: undefined
            } as unknown as DBModelCourse
        ];

        render(
            <CourseCatalog
                enrolledList={[]}
                onEnrollSuccess={mockOnEnrollSuccess}
                onSetGlobalError={mockOnSetGlobalError}
                onSetGlobalSuccess={mockOnSetGlobalSuccess}
            />
        );

        expect(screen.getByText('General')).toBeInTheDocument();
        expect(screen.getByText('Instructores: Por asignar')).toBeInTheDocument();
        expect(screen.getByText('5.0')).toBeInTheDocument();
    });

    test('CASO NEGATIVO: Debe propagar los errores atrapados en el catálogo hacia la alerta global del padre', () => {
        mockUseCourseCatalogValues.catalogError = 'Error 500: Conexión rechazada por PostgreSQL';

        render(
            <CourseCatalog
                enrolledList={[]}
                onEnrollSuccess={mockOnEnrollSuccess}
                onSetGlobalError={mockOnSetGlobalError}
                onSetGlobalSuccess={mockOnSetGlobalSuccess}
            />
        );

        expect(mockOnSetGlobalError).toHaveBeenCalledWith('Error 500: Conexión rechazada por PostgreSQL');
    });

    test('CASO LÍMITE: Debe mostrar el texto de fallback cuando el catálogo y las matrículas están vacías sin romper la UI', () => {
        mockUseCourseCatalogValues.catalogCourses = [];
        mockUseCourseCatalogValues.loadingCatalog = false;

        render(
            <CourseCatalog
                enrolledList={[]}
                onEnrollSuccess={mockOnEnrollSuccess}
                onSetGlobalError={mockOnSetGlobalError}
                onSetGlobalSuccess={mockOnSetGlobalSuccess}
            />
        );

        const emptyMessage = screen.getByText('No se encontraron cursos que coincidan con el criterio introducido.');
        expect(emptyMessage).toBeInTheDocument();
    });
});
