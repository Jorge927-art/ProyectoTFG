import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ProfessorCoursePicker } from './ProfessorCoursePicker';
import * as courseCatalogModule from '../../../../services/useCourseCatalog';

describe('ProfessorCoursePicker - Suite de Cobertura Funcional y Regresividad Visual', () => {
    const mockOnSelectionSuccess = vi.fn();
    let useCourseCatalogSpy: ReturnType<typeof vi.spyOn>;

    // DTOs reales y canónicos compatibles con DBModelCourse de PostgreSQL
    const mockCatalogCourses = [
        {
            course_id: 501,
            title: 'Data Analysis Using Python',
            category: 'Data Science',
            instructors: 'Brandon Krakowsky',
            rating: 4.6
        },
        {
            course_id: 502,
            title: 'Data Analysis and Fundamental Statistics',
            category: 'General',
            instructors: 'Por asignar', // Simula el estado Vacante real de producción
            rating: 5.0
        }
    ];

    // Configuración base del retorno simulado por defecto del hook compartido
    // CORRECCIÓN: Dejamos searchKeyword vacío para que el motor no filtre los cursos de entrada
    const defaultHookReturn = {
        searchKeyword: '',
        setSearchKeyword: vi.fn(),
        catalogCourses: mockCatalogCourses,
        loadingCatalog: false,
        actionExecutionId: null,
        catalogError: '',
        setCatalogError: vi.fn(),
        executeCourseAction: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useCourseCatalogSpy = vi.spyOn(courseCatalogModule, 'useCourseCatalog');
        // Conversión segura mediante unknown para satisfacer la regla no-explicit-any de ESLint
        const mockReturn = defaultHookReturn as unknown;
        useCourseCatalogSpy.mockReturnValue(mockReturn as ReturnType<typeof courseCatalogModule.useCourseCatalog>);
    });

    /* =========================================================================
       1. PRUEBAS DE ESTRUCTURA VISUAL Y COMPOSICIÓN DE BADGES
       ========================================================================= */
    it('Debe renderizar la cabecera del panel y evaluar de forma determinista si los cursos están vacantes', () => {
        render(<ProfessorCoursePicker onSelectionSuccess={mockOnSelectionSuccess} />);

        // Verificar títulos operativos e inputs cores de búsqueda
        expect(screen.getByText('Panel de Selección de Asignaturas Docentes')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Buscar cursos...')).toBeInTheDocument();

        // Validar títulos de los cursos renderizados por el motor compartido
        expect(screen.getByText('Data Analysis Using Python')).toBeInTheDocument();
        expect(screen.getByText('Data Analysis and Fundamental Statistics')).toBeInTheDocument();

        // Verificar el comportamiento del Paso 2 (Badges de Tutoría):
        // El primer curso tiene un profesor real asignado
        expect(screen.getByText('👤 Brandon Krakowsky')).toBeInTheDocument();
        // El segundo curso cumple la precondición 'Por asignar' y debe lucir el distintivo Vacante
        expect(screen.getByText('🪹 Vacante')).toBeInTheDocument();
    });
    /* =========================================================================
   2. PRUEBAS DE INTERACCIÓN DE BÚSQUEDA PREDICTIVA
   ========================================================================= */
    it('Debe notificar al hook el cambio de palabra clave al escribir en la barra de búsqueda', async () => {
        // Creamos una variable local para simular la reactividad del estado del hook
        let textoSimulado = '';
        const mockSetSearchKeyword = vi.fn().mockImplementation((val: string) => {
            textoSimulado = val;
        });

        // Forzamos un mock específico para este test que responda dinámicamente al escribir
        useCourseCatalogSpy.mockImplementation(() => {
            return {
                ...defaultHookReturn,
                searchKeyword: textoSimulado,
                setSearchKeyword: mockSetSearchKeyword
            } as unknown as ReturnType<typeof courseCatalogModule.useCourseCatalog>;
        });

        render(<ProfessorCoursePicker onSelectionSuccess={mockOnSelectionSuccess} />);

        // Localizar el elemento en el DOM fresco
        const inputElement = screen.getByPlaceholderText('Buscar cursos...');

        // Ejecutar el evento de escritura
        fireEvent.change(inputElement, { target: { value: 'Python' } });

        // Verificar de forma segura que la interactividad y los estados se mantienen acoplados
        await waitFor(() => {
            expect(mockSetSearchKeyword).toHaveBeenCalledWith('Python');
        });
    });
    /* =========================================================================
      3. PRUEBAS DE CONTROL DE CONTROL DE CARGA (ANTI-DUPLICADOS)
      ========================================================================= */
    it('Debe deshabilitar el botón y mostrar el estado de carga al procesar la asignación del backend', () => {
        // CORRECCIÓN: Aseguramos el retorno base limpio para este test
        useCourseCatalogSpy.mockReturnValue(defaultHookReturn as unknown as ReturnType<typeof courseCatalogModule.useCourseCatalog>);

        const mockExecuteAction = vi.fn();
        const customHookReturn = {
            ...defaultHookReturn,
            actionExecutionId: 502, // Simulamos que el curso 502 está en pleno proceso de persistencia
            executeCourseAction: mockExecuteAction
        };

        useCourseCatalogSpy.mockReturnValue(customHookReturn as unknown as ReturnType<typeof courseCatalogModule.useCourseCatalog>);

        render(<ProfessorCoursePicker onSelectionSuccess={mockOnSelectionSuccess} />);

        // Localizar el botón del curso que se está procesando
        // El componente ajusta el label a "Asignando..." de forma dinámica
        const botonAsignando = screen.getByRole('button', { name: /Asignando.../i });

        // El botón debe estar estrictamente bloqueado para mitigar doble pulsación o peticiones en ráfaga
        expect(botonAsignando).toBeDisabled();

        // Intentar forzar un evento de clic no debe propagar segundas llamadas hacia el servicio
        fireEvent.click(botonAsignando);
        expect(mockExecuteAction).not.toHaveBeenCalled();
    });

    /* =========================================================================
       4. PRUEBAS DE FLUJO TRANSACCIONAL SEGURO (MOCK EXTENDIDO)
       ========================================================================= */
    it('4. Debe invocar el endpoint relacional con el ID correcto y disparar el mensaje de éxito en verde', async () => {
        // Removido todo uso de 'any' para satisfacer al linter
        let useCourseCatalogMockCallback: unknown = undefined;

        const mockExecuteAction = vi.fn().mockImplementation(() => {
            // Buscamos el callback de éxito mediante la función capturada de inicialización
            if (useCourseCatalogMockCallback) {
                // Sincronizado con el ID 501 que el componente realmente dispara al hacer click
                const mockCourseData = {
                    course_id: 501,
                    title: 'Data Analysis Using Python',
                    category: 'Data Science',
                    instructors: 'profesor_autenticado'
                } as unknown;

                // Casting limpio y directo que satisface a TypeScript y ESLint
                const callbackFn = useCourseCatalogMockCallback as (course: unknown) => void;
                callbackFn(mockCourseData);
            }
            return Promise.resolve();
        });

        // CORRECCIÓN: Forzamos la implementación para que devuelva tanto el callback como el 'catalogCourses' original
        useCourseCatalogSpy.mockImplementation((onActionSuccess: Parameters<typeof courseCatalogModule.useCourseCatalog>[0]) => {
            useCourseCatalogMockCallback = onActionSuccess;
            return {
                ...defaultHookReturn, // Trae de vuelta la lista mockCatalogCourses
                executeCourseAction: mockExecuteAction
            } as unknown as ReturnType<typeof courseCatalogModule.useCourseCatalog>;
        });

        render(<ProfessorCoursePicker onSelectionSuccess={mockOnSelectionSuccess} />);

        // Vinculamos el botón de acción al curso objetivo para no depender del label exacto
        const courseTitle = screen.getByText('Data Analysis Using Python');
        const courseCard = courseTitle.closest('div.flex.flex-col.h-full.justify-between');

        expect(courseCard).not.toBeNull();

        const courseActionButton = within(courseCard as HTMLElement).getByRole('button');

        // Ejecutamos el clic en el botón del primer curso de la lista
        fireEvent.click(courseActionButton);

        // Sincronizado exactamente con lo que recibe el componente en la primera posición (501)
        expect(mockExecuteAction).toHaveBeenCalledWith(
            501,
            '/api/courses/501/assign-teacher',
            'post'
        );

        // Validar el renderizado en caliente del banner verde de éxito en la UI
        await waitFor(() => {
            expect(screen.getByText(/¡Te has asignado correctamente como profesor del curso/i)).toBeInTheDocument();
        });
    });
});

