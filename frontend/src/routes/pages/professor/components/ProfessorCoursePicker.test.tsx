import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfessorCoursePicker } from './ProfessorCoursePicker';
import { useCourseCatalog } from '../../../../services/useCourseCatalog';

// 1. Simular el hook de catálogo genérico
vi.mock('../../../../services/useCourseCatalog', () => ({
    useCourseCatalog: vi.fn()
}));

describe('ProfessorCoursePicker - Suite de Cobertura Funcional y Regresividad Visual', () => {
    const mockOnSelectionSuccess = vi.fn();

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
    const defaultHookReturn = {
        searchKeyword: 'Data',
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
        // Conversión segura mediante unknown para satisfacer la regla no-explicit-any de ESLint
        const mockReturn = defaultHookReturn as unknown;
        vi.mocked(useCourseCatalog).mockReturnValue(mockReturn as ReturnType<typeof useCourseCatalog>);
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
    it('Debe notificar al hook el cambio de palabra clave al escribir en la barra de búsqueda', () => {
        const mockSetSearchKeyword = vi.fn();
        const customHookReturn = { ...defaultHookReturn, setSearchKeyword: mockSetSearchKeyword };

        vi.mocked(useCourseCatalog).mockReturnValue(customHookReturn as unknown as ReturnType<typeof useCourseCatalog>);

        render(<ProfessorCoursePicker onSelectionSuccess={mockOnSelectionSuccess} />);

        const inputElement = screen.getByPlaceholderText('Buscar cursos...');
        fireEvent.change(inputElement, { target: { value: 'Spring Boot' } });

        // Certifica que el input core delega limpiamente la interactividad al hook
        expect(mockSetSearchKeyword).toHaveBeenCalledWith('Spring Boot');
    });

    /* =========================================================================
       3. PRUEBAS DE CONTROL DE CONTROL DE CARGA (ANTI-DUPLICADOS)
       ========================================================================= */
    it('Debe deshabilitar el botón y mostrar el estado de carga al procesar la asignación del backend', () => {
        const mockExecuteAction = vi.fn();
        const customHookReturn = {
            ...defaultHookReturn,
            actionExecutionId: 502, // Simulamos que el curso 502 está en pleno proceso de persistencia
            executeCourseAction: mockExecuteAction
        };

        vi.mocked(useCourseCatalog).mockReturnValue(customHookReturn as unknown as ReturnType<typeof useCourseCatalog>);

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
        // Solución a variables no usadas: eliminamos los nombres de los parámetros que no leemos
        const mockExecuteAction = vi.fn().mockImplementation(() => {
            // Buscamos el callback de éxito mediante la función capturada de inicialización
            if (useCourseCatalogMockCallback) {
                // Forzamos el tipado seguro con un objeto plano moldeado a unknown para cumplir con ESLint
                const mockCourseData = {
                    course_id: 502,
                    title: 'Data Analysis and Fundamental Statistics',
                    category: 'General',
                    instructors: 'profesor_autenticado'
                } as unknown;

                // CORRECCIÓN: Casting limpio y directo que satisface a TypeScript y ESLint
                const callbackFn = useCourseCatalogMockCallback as (course: unknown) => void;
                callbackFn(mockCourseData);
            }
            return Promise.resolve();
        });

        // Removido todo uso de 'any' para satisfacer al linter
        let useCourseCatalogMockCallback: unknown = undefined;

        // CORRECCIÓN: Invocamos correctamente a useCourseCatalog (el hook real que estamos simulando)
        vi.mocked(useCourseCatalog).mockImplementation((onActionSuccess) => {
            useCourseCatalogMockCallback = onActionSuccess;
            return {
                ...defaultHookReturn,
                executeCourseAction: mockExecuteAction
            } as unknown as ReturnType<typeof useCourseCatalog>;
        });

        render(<ProfessorCoursePicker onSelectionSuccess={mockOnSelectionSuccess} />);

        // Buscamos los botones "Impartir Curso" correspondientes al bloque vacante
        const botonesImpartir = screen.getAllByRole('button', { name: /Impartir Curso/i });

        // Ejecutamos el clic en el botón del curso vacante
        fireEvent.click(botonesImpartir[0]);

        // CORRECCIÓN LÍNEA 156: Eliminadas las expresiones rotas y unificado el expect correcto
        expect(mockExecuteAction).toHaveBeenCalledWith(
            502,
            '/api/courses/502/assign-teacher',
            'post'
        );

        // Validar el renderizado en caliente del banner verde de éxito en la UI
        await waitFor(() => {
            expect(screen.getByText(/¡Te has asignado correctamente como profesor del curso/i)).toBeInTheDocument();
        });
    });
}); // <-- IMPORTANTE: Esta llave cierra el "describe" principal de la línea 9 y corrige el Parsing Error
