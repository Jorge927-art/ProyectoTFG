import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseManagementModal } from './CourseManagementModal';
import * as courseManagementModule from './useCourseManagement';

describe('CourseManagementModal - Suite de Pruebas de Alta Fidelidad Funcional', () => {
    const mockOnClose = vi.fn();
    const mockOnSyncCount = vi.fn();
    let useCourseManagementSpy: ReturnType<typeof vi.spyOn>;

    const mockStudentsData = [
        {
            userId: 101, studentId: 101, username: 'Juan Pérez', fullName: 'Juan Pérez',
            email: 'juan.perez@universidad.edu', individualGrade: 8.5, groupAverage: 7.2
        }
    ];

    const mockMetricsData = { groupAverageGrade: 8.0, activeStudentsCount: 1, pendingSubmissionsCount: 2 };

    const defaultHookReturn = {
        activeTab: 'alumnado',
        setActiveTab: vi.fn(),
        students: mockStudentsData,
        metrics: mockMetricsData,
        loading: false,
        fileError: null,
        handleFileChange: vi.fn(),
        selectedStudentId: '0',
        setSelectedStudentId: vi.fn(),
        selectedFile: null,
        isSubmitting: false,
        uploadSuccessMessage: null,
        handleUploadDocument: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useCourseManagementSpy = vi.spyOn(courseManagementModule, 'useCourseManagement');
        const mockReturn = defaultHookReturn as unknown;
        useCourseManagementSpy.mockReturnValue(mockReturn as ReturnType<typeof courseManagementModule.useCourseManagement>);
    });

    /* =========================================================================
       1. CONTROL DE ESTRUCTURA Y VARIABLES REALES
       ========================================================================= */
    it('Debe renderizar la tabla de 3 columnas con los datos nativos del DTO', () => {
        render(<CourseManagementModal courseId={1} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);
        expect(screen.getByText('Estudiante')).toBeInTheDocument();
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
        expect(screen.getByText('✉ juan.perez@universidad.edu')).toBeInTheDocument();
        expect(screen.getAllByText('70%').length).toBeGreaterThan(0);
    });

    /* =========================================================================
       2. CONTROL DE INTERACCIÓN: NAVEGACIÓN ENTRE PESTAÑAS (¡NUEVO!)
       ========================================================================= */
    it('Debe invocar setActiveTab con el ID correcto al hacer clic en los botones de navegación', () => {
        const mockSetActiveTab = vi.fn();
        const mockReturn = { ...defaultHookReturn, setActiveTab: mockSetActiveTab } as unknown;
        useCourseManagementSpy.mockReturnValue(mockReturn as ReturnType<typeof courseManagementModule.useCourseManagement>);

        render(<CourseManagementModal courseId={1} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        // El usuario hace clic real en el botón de la pestaña de Trabajos
        const botonTrabajos = screen.getByRole('button', { name: /Trabajos y Exámenes/i });
        fireEvent.click(botonTrabajos);

        // Control funcional: Asegurar que la UI notifica al hook el cambio pretendido
        expect(mockSetActiveTab).toHaveBeenCalledWith('trabajos');
    });

    /* =========================================================================
       3. CONTROL DE SEGURIDAD: COMPORTAMIENTO Y BLOQUEO DE BOTONES (¡NUEVO!)
       ========================================================================= */
    it('Debe bloquear el botón de transmisión si no hay un archivo seleccionado o si existe un error de validación', () => {
        const mockHandleUpload = vi.fn();
        const customHookReturn = {
            ...defaultHookReturn,
            activeTab: 'trabajos',
            selectedFile: null, // Sin archivo cargado todavía
            fileError: 'El archivo excede el tamaño máximo ADR-25',
            handleUploadDocument: mockHandleUpload
        };

        const mockReturn = customHookReturn as unknown;
        useCourseManagementSpy.mockReturnValue(mockReturn as ReturnType<typeof courseManagementModule.useCourseManagement>);

        render(<CourseManagementModal courseId={1} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        // Validar que el mensaje de error de validación se pinte en pantalla
        expect(screen.getByText(/El archivo excede el tamaño máximo ADR-25/i)).toBeInTheDocument();

        // Localizar el botón de acción por su rol accesible o etiqueta
        const botonEnviar = screen.getByRole('button', { name: /Transmitir y Publicar Documento/i });

        // Control funcional: Verificar el estado inhabilitado nativo de la UI
        expect(botonEnviar).toBeDisabled();

        // Intentar forzar el clic no debería disparar la transmisión del backend
        fireEvent.click(botonEnviar);
        expect(mockHandleUpload).not.toHaveBeenCalled();
    });

    /* =========================================================================
       4. CONTROL DE FLUJO: TRANSMISIÓN EXITOSA (¡NUEVO!)
       ========================================================================= */
    it('Debe permitir la transmisión y mostrar el mensaje de éxito en color verde si los datos son válidos', () => {
        const mockHandleUpload = vi.fn();
        const customHookReturn = {
            ...defaultHookReturn,
            activeTab: 'trabajos',
            selectedFile: new File(['contenido'], 'enunciado.pdf', { type: 'application/pdf' }),
            fileError: null,
            uploadSuccessMessage: 'Documento publicado con éxito en el tablón oficial',
            handleUploadDocument: mockHandleUpload
        };

        const mockReturn = customHookReturn as unknown;
        useCourseManagementSpy.mockReturnValue(mockReturn as ReturnType<typeof courseManagementModule.useCourseManagement>);

        render(<CourseManagementModal courseId={1} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        // Comprobar que el banner verde de éxito se renderiza con el prefijo "✓ "
        expect(screen.getByText(/✓ Documento publicado con éxito/i)).toBeInTheDocument();

        const botonEnviar = screen.getByRole('button', { name: /Transmitir y Publicar Documento/i });
        expect(botonEnviar).not.toBeDisabled();

        fireEvent.click(botonEnviar);
        expect(mockHandleUpload).toHaveBeenCalledTimes(1);
    });

    /* =========================================================================
       5. CONTROL DEL CICLO DE VIDA: INYECCIÓN DE PARÁMETROS Y CIERRE
       ========================================================================= */
    it('Debe invocar onClose cuando el usuario pulsa el botón X de la cabecera', () => {
        render(<CourseManagementModal courseId={1} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        const botonCerrar = screen.getByRole('button', { name: /Cerrar gestión del curso/i });
        fireEvent.click(botonCerrar);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
});
