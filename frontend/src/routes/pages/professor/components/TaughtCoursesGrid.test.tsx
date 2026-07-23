import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaughtCoursesGrid } from './TaughtCoursesGrid';
import type { Course } from './TaughtCoursesGrid';

// =========================================================================
// 1. MOCKS DE COMPONENTES CORE TRANSVERSALES SIN EL TIPO PROHIBIDO 'ANY'
// =========================================================================
vi.mock('../../../../components/ui/genericCard/GenericCard', () => ({
    default: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="mock-generic-card">{children}</div>
    )
}));

vi.mock('../../../../components/ui/genericButton/GenericButton', () => ({
    default: ({ label = '', onClick, icon }: { label?: string; onClick?: () => void; icon?: React.ReactNode }) => (
        <button data-testid={`btn-${label.replace(/\s+/g, '-').toLowerCase()}`} onClick={onClick}>
            {label}
            {icon}
        </button>
    )
}));

describe('TaughtCoursesGrid - Suite de Pruebas Unitarias de la Cuadrícula del Profesor', () => {
    const mockOnManageCourse = vi.fn();

    // Colección de asignaturas de prueba inmutables bajo el contrato oficial Course
    const sampleCoursesList: readonly Course[] = [
        {
            id: 101,
            category: 'INGENIERÍA DEL SOFTWARE',
            title: 'Diseño de Arquitecturas Microservicios con Spring Boot',
            studentsCount: 28
        },
        {
            id: 102,
            category: 'BASE DE DATOS',
            title: 'Optimización de Consultas Complejas en PostgreSQL',
            studentsCount: 15
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    /* =========================================================================
       1. CONTROL DE ESTRUCTURA Y RENDERIZADO DE DATOS ACADÉMICOS
       ========================================================================= */
    it('Debe renderizar tantas tarjetas genéricas como asignaturas existan en la colección DTO', () => {
        render(
            <TaughtCoursesGrid
                courses={sampleCoursesList}
                onManageCourse={mockOnManageCourse}
            />
        );

        // Validar el número de tarjetas construidas en el DOM virtual
        const tarjetas = screen.getAllByTestId('mock-generic-card');
        expect(tarjetas).toHaveLength(2);

        // Fila 1: Verificar el mapeo exacto de los atributos de producción de la asignatura 101
        expect(screen.getByText('INGENIERÍA DEL SOFTWARE')).toBeInTheDocument();
        expect(screen.getByText('Diseño de Arquitecturas Microservicios con Spring Boot')).toBeInTheDocument();
        expect(screen.getByText('Total: 28 alumnos matriculados')).toBeInTheDocument();

        // Fila 2: Verificar el mapeo exacto de los atributos de producción de la asignatura 102
        expect(screen.getByText('BASE DE DATOS')).toBeInTheDocument();
        expect(screen.getByText('Optimización de Consultas Complejas en PostgreSQL')).toBeInTheDocument();
        expect(screen.getByText('Total: 15 alumnos matriculados')).toBeInTheDocument();
    });

    it('No debe romper el flujo ni renderizar tarjetas si la lista de asignaturas asignadas viene vacía', () => {
        const { container } = render(
            <TaughtCoursesGrid
                courses={[]}
                onManageCourse={mockOnManageCourse}
            />
        );

        expect(screen.queryByTestId('mock-generic-card')).not.toBeInTheDocument();
        // Verificar que el árbol estructural interno del flex/grid no tiene nodos hijos
        const contenedorGrid = container.querySelector('.grid');
        expect(contenedorGrid?.children).toHaveLength(0);
    });

    /* =========================================================================
       2. CONTROL DE INTERACCIÓN, ICONOS DINÁMICOS Y CALLBACKS OPERATIVOS
       ========================================================================= */
    it('Debe invocar el callback onManageCourse inyectando el ID inmutable exacto de la asignatura al pulsar el botón', () => {
        render(
            <TaughtCoursesGrid
                courses={sampleCoursesList}
                onManageCourse={mockOnManageCourse}
            />
        );

        // Recuperamos los botones de control de eventos renderizados por tarjeta
        const botonesGestionar = screen.getAllByTestId('btn-gestionar-curso');
        expect(botonesGestionar).toHaveLength(2);

        // Disparar clic en el botón de la primera tarjeta (Asignatura ID: 101)
        fireEvent.click(botonesGestionar[0]);
        expect(mockOnManageCourse).toHaveBeenCalledTimes(1);
        expect(mockOnManageCourse).toHaveBeenCalledWith(101);

        // Disparar clic en el botón de la segunda tarjeta (Asignatura ID: 102)
        fireEvent.click(botonesGestionar[1]);
        expect(mockOnManageCourse).toHaveBeenCalledTimes(2);
        expect(mockOnManageCourse).toHaveBeenCalledWith(102);
    });

    it('Debe inyectar y renderizar correctamente el nodo actionIcon transferido desde el componente padre', () => {
        const mockIcon = <span data-testid="mock-arrow-icon">➔</span>;

        render(
            <TaughtCoursesGrid
                courses={sampleCoursesList}
                onManageCourse={mockOnManageCourse}
                actionIcon={mockIcon}
            />
        );

        // Validar que el icono descriptivo inyectado se dibuja dentro de los botones de la cuadrícula
        const iconosRenderizados = screen.getAllByTestId('mock-arrow-icon');
        expect(iconosRenderizados).toHaveLength(2);
        expect(iconosRenderizados[0]).toBeInTheDocument();
    });

    it('Debe mantener la cuadrícula sin scroll cuando hay un máximo de 4 asignaturas', () => {
        const fourCourses: readonly Course[] = [
            ...sampleCoursesList,
            { id: 103, category: 'CLOUD', title: 'Fundamentos de Kubernetes', studentsCount: 22 },
            { id: 104, category: 'DEVOPS', title: 'Pipelines CI/CD con GitHub Actions', studentsCount: 19 }
        ];

        render(
            <TaughtCoursesGrid
                courses={fourCourses}
                onManageCourse={mockOnManageCourse}
            />
        );

        const scrollContainer = screen.getByTestId('taught-courses-scroll-container');
        expect(scrollContainer.className).toContain('overflow-y-visible');
        expect(scrollContainer.className).not.toContain('overflow-y-auto');
    });

    it('Debe activar el scroll vertical cuando se superan 4 asignaturas', () => {
        const fiveCourses: readonly Course[] = [
            ...sampleCoursesList,
            { id: 103, category: 'CLOUD', title: 'Fundamentos de Kubernetes', studentsCount: 22 },
            { id: 104, category: 'DEVOPS', title: 'Pipelines CI/CD con GitHub Actions', studentsCount: 19 },
            { id: 105, category: 'ARQUITECTURA', title: 'Patrones de Microservicios', studentsCount: 31 }
        ];

        render(
            <TaughtCoursesGrid
                courses={fiveCourses}
                onManageCourse={mockOnManageCourse}
            />
        );

        const scrollContainer = screen.getByTestId('taught-courses-scroll-container');
        expect(scrollContainer.className).toContain('overflow-y-auto');
        expect(scrollContainer.className).toContain('max-h-[28rem]');
    });
});

