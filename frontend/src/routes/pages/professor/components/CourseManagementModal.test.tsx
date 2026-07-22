import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseManagementModal } from './CourseManagementModal';
import { useCourseManagement } from './useCourseManagement';

vi.mock('./useCourseManagement', () => ({
    useCourseManagement: vi.fn()
}));

describe('CourseManagementModal - Suite de Pruebas de Alta Fidelidad Funcional', () => {
    const mockOnClose = vi.fn();
    const mockOnSyncCount = vi.fn();

    const mockStudentsData = [
        {
            userId: 101,
            username: 'Juan Pérez',
            email: 'juan.perez@universidad.edu',
            individualGrade: 8.5,
            groupAverage: 7.2
        }
    ];

    const mockMetricsData = {
        groupAverageGrade: 8.35,
        activeStudentsCount: 12,
        pendingSubmissionsCount: 4
    };

    const defaultHookReturn = {
        activeTab: 'alumnado',
        setActiveTab: vi.fn(),
        students: mockStudentsData,
        metrics: mockMetricsData,
        loading: false,
        fileError: null,
        handleFileChange: vi.fn(),
        selectedStudentId: '101',
        setSelectedStudentId: vi.fn(),
        selectedFile: null,
        isSubmitting: false,
        uploadSuccessMessage: null,
        handleUploadDocument: vi.fn()
    };

    beforeEach(() => {
        vi.restoreAllMocks();
        vi.resetAllMocks();
    });

    /* =========================================================================
       1. CONTROL DE ESTRUCTURA, TABLAS Y FALLBACKS DE VARIABLES (PESTAÑA ALUMNADO)
       ========================================================================= */
    it('Debe renderizar la tabla de 3 columnas con las cabeceras canónicas y datos nativos del DTO', () => {
        const mockReturn = defaultHookReturn as unknown;
        vi.mocked(useCourseManagement).mockReturnValue(
            mockReturn as ReturnType<typeof useCourseManagement>
        );

        render(<CourseManagementModal courseId={42} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        expect(screen.getByText('Estudiante')).toBeInTheDocument();
        expect(screen.getByText('Contacto / Email')).toBeInTheDocument();
        expect(screen.getByText('Progreso en Plataforma y Rendimiento Académico')).toBeInTheDocument();

        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
        expect(screen.getByText('✉juan.perez@universidad.edu')).toBeInTheDocument();

        expect(screen.getByText('8.5 / 10')).toBeInTheDocument();
        expect(screen.getAllByText('70%').length).toBeGreaterThan(0);
        expect(screen.getByText('Control operativo y seguimiento del Curso ID: 42')).toBeInTheDocument();
    });

    // --- FIN DE LA PRIMERA PARTE DEL ARCHIVO DE PRUEBAS ---
    it('Debe aplicar el string de contingencia "Sin correo registrado" cuando el email del alumno sea nulo o vacío', () => {
        const studentNoEmail = [
            { userId: 102, username: 'Ana Gómez', email: '  ', individualGrade: 9.0, groupAverage: 8.0 }
        ];
        const customHookReturn = { ...defaultHookReturn, students: studentNoEmail };
        const mockReturn = customHookReturn as unknown;
        vi.mocked(useCourseManagement).mockReturnValue(
            mockReturn as ReturnType<typeof useCourseManagement>
        );

        render(<CourseManagementModal courseId={42} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        expect(screen.getByText('Ana Gómez')).toBeInTheDocument();
        expect(screen.getByText('Sin correo registrado')).toBeInTheDocument();
    });

    it('Debe mostrar un mensaje amigable centralizado si la colección de estudiantes activos viene vacía', () => {
        const customHookReturn = { ...defaultHookReturn, students: [] };
        const mockReturn = customHookReturn as unknown;
        vi.mocked(useCourseManagement).mockReturnValue(
            mockReturn as ReturnType<typeof useCourseManagement>
        );

        render(<CourseManagementModal courseId={42} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        expect(screen.getByText('No hay alumnos activos registrados en esta asignatura.')).toBeInTheDocument();
    });

    /* =========================================================================
       2. CONTROL DE INTERACCIÓN AND ENRUTAMIENTO: NAVEGACIÓN ENTRE PESTAÑAS
       ========================================================================= */
    it('Debe invocar setActiveTab con "trabajos" al hacer clic en el botón de Trabajos y Exámenes', () => {
        const mockSetActiveTab = vi.fn();
        const mockReturn = { ...defaultHookReturn, setActiveTab: mockSetActiveTab } as unknown;
        vi.mocked(useCourseManagement).mockReturnValue(
            mockReturn as ReturnType<typeof useCourseManagement>
        );

        render(<CourseManagementModal courseId={42} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        const botonTrabajos = screen.getByRole('button', { name: /Trabajos y Exámenes/i });
        fireEvent.click(botonTrabajos);

        expect(mockSetActiveTab).toHaveBeenCalledWith('trabajos');
    });

    it('Debe invocar setActiveTab con "metricas" al hacer clic en el botón de Métricas Globales', () => {
        const mockSetActiveTab = vi.fn();
        const mockReturn = { ...defaultHookReturn, setActiveTab: mockSetActiveTab } as unknown;
        vi.mocked(useCourseManagement).mockReturnValue(
            mockReturn as ReturnType<typeof useCourseManagement>
        );

        render(<CourseManagementModal courseId={42} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        const botonMetricas = screen.getByRole('button', { name: /Métricas Globales/i });
        fireEvent.click(botonMetricas);

        expect(mockSetActiveTab).toHaveBeenCalledWith('metricas');
    });

    /* =========================================================================
       3. CONTROL DE SEGURIDAD Y FORMULARIOS (PESTAÑA TRABAJOS Y EXÁMENES)
       ========================================================================= */
    it('Debe bloquear el botón de transmisión e inhabilitar la acción si no hay archivo o si viola las directivas de tamaño', () => {
        const mockHandleUpload = vi.fn();
        const customHookReturn = {
            ...defaultHookReturn,
            activeTab: 'trabajos',
            selectedFile: null,
            fileError: 'El archivo excede el tamaño máximo ADR-25',
            handleUploadDocument: mockHandleUpload
        };

        const mockReturn = customHookReturn as unknown;
        vi.mocked(useCourseManagement).mockReturnValue(
            mockReturn as ReturnType<typeof useCourseManagement>
        );

        render(<CourseManagementModal courseId={42} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        expect(screen.getByText('⚠ El archivo excede el tamaño máximo ADR-25')).toBeInTheDocument();

        const botonEnviar = screen.getByRole('button', { name: /Transmitir y Publicar Documento/i }) as HTMLButtonElement;
        expect(botonEnviar).toBeDisabled();

        fireEvent.click(botonEnviar);
        expect(mockHandleUpload).not.toHaveBeenCalled();
    });

    // --- FIN DE LA SEGUNDA PARTE DEL ARCHIVO DE PRUEBAS ---
    it('Debe mutar el texto de la etiqueta a "Transmitiendo Documento..." y congelar el botón durante la sumisión asíncrona', () => {
        const customHookReturn = {
            ...defaultHookReturn,
            activeTab: 'trabajos',
            selectedFile: new File(['payload'], 'tfg_outline.pdf', { type: 'application/pdf' }),
            isSubmitting: true
        };

        const mockReturn = customHookReturn as unknown;
        vi.mocked(useCourseManagement).mockReturnValue(
            mockReturn as ReturnType<typeof useCourseManagement>
        );

        render(<CourseManagementModal courseId={42} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        const botonEnviar = screen.getByRole('button', { name: /Transmitiendo Documento\.\.\./i }) as HTMLButtonElement;
        expect(botonEnviar).toBeInTheDocument();
        expect(botonEnviar).toBeDisabled();
    });

    /* =========================================================================
       4. CONTROL DE FLUJO: TRANSMISIÓN EXITOSA
       ========================================================================= */
    it('Debe habilitar el botón si los datos son correctos y pintar el banner verde con prefijo "✓" tras una publicación exitosa', () => {
        const mockHandleUpload = vi.fn();
        const mockHandleFileChange = vi.fn();

        const customHookReturn = {
            ...defaultHookReturn,
            activeTab: 'trabajos',
            selectedFile: new File(['contenido-binario'], 'enunciado_examen.pdf', { type: 'application/pdf' }),
            fileError: null,
            uploadSuccessMessage: 'Documento publicado con éxito en el tablón oficial',
            handleFileChange: mockHandleFileChange,
            handleUploadDocument: mockHandleUpload
        };

        const mockReturn = customHookReturn as unknown;
        vi.mocked(useCourseManagement).mockReturnValue(
            mockReturn as ReturnType<typeof useCourseManagement>
        );

        render(<CourseManagementModal courseId={42} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        const inputArchivo = screen.getByLabelText(/Seleccionar Documento Académico Oficial/i);
        fireEvent.change(inputArchivo, { target: { files: [customHookReturn.selectedFile] } });
        expect(mockHandleFileChange).toHaveBeenCalled();

        expect(screen.getByText('✓ Documento publicado con éxito en el tablón oficial')).toBeInTheDocument();

        const botonEnviar = screen.getByRole('button', { name: /Transmitir y Publicar Documento/i }) as HTMLButtonElement;
        expect(botonEnviar).not.toBeDisabled();

        fireEvent.click(botonEnviar);
        expect(mockHandleUpload).toHaveBeenCalledTimes(1);
    });

    /* =========================================================================
       5. CONTROL DE RENDERIZADO ANALÍTICO (PESTAÑA MÉTRICAS GLOBALES)
       ========================================================================= */
    it('Debe renderizar los paneles consolidados de métricas y formatear el promedio de PostgreSQL a dos decimales', () => {
        const customHookReturn = { ...defaultHookReturn, activeTab: 'metricas' };
        const mockReturn = customHookReturn as unknown;
        vi.mocked(useCourseManagement).mockReturnValue(
            mockReturn as ReturnType<typeof useCourseManagement>
        );

        render(<CourseManagementModal courseId={42} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        expect(screen.getByText('Rendimiento Consolidado del Grupo')).toBeInTheDocument();
        expect(screen.getByText('MEDIA GENERAL')).toBeInTheDocument();
        expect(screen.getByText('8.35')).toBeInTheDocument();
        expect(screen.getByText('ALUMNOS ACTIVOS')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('4 tareas')).toBeInTheDocument();
    });

    it('Debe renderizar la pantalla de contingencia si las métricas globales devuelven un valor nulo', () => {
        const customHookReturn = { ...defaultHookReturn, activeTab: 'metricas', metrics: null };
        const mockReturn = customHookReturn as unknown;
        vi.mocked(useCourseManagement).mockReturnValue(
            mockReturn as ReturnType<typeof useCourseManagement>
        );

        render(<CourseManagementModal courseId={42} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        expect(screen.getByText('No se pudieron recuperar las métricas globales del curso.')).toBeInTheDocument();
    });

    /* =========================================================================
       6. CONTROL DEL CICLO DE VIDA DE LA CONSOLA (MONTAJE, CIERRES Y LAZY LOADING)
       ========================================================================= */
    it('Debe pintar la pantalla de carga animada y congelar la interfaz si loading es true (Lazy Loading)', () => {
        const customHookReturn = { ...defaultHookReturn, loading: true };
        const mockReturn = customHookReturn as unknown;
        vi.mocked(useCourseManagement).mockReturnValue(
            mockReturn as ReturnType<typeof useCourseManagement>
        );

        render(<CourseManagementModal courseId={42} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        expect(screen.getByText('Hidratando datos mediante Lazy Loading por pestaña...')).toBeInTheDocument();
        expect(screen.queryByText('Estudiante')).not.toBeInTheDocument();
    });

    it('Debe invocar onClose cuando el usuario pulsa el botón X de la cabecera', () => {
        const mockReturn = defaultHookReturn as unknown;
        vi.mocked(useCourseManagement).mockReturnValue(
            mockReturn as ReturnType<typeof useCourseManagement>
        );

        render(<CourseManagementModal courseId={42} isOpen={true} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />);

        const botonCerrar = screen.getByRole('button', { name: /Cerrar gestión del curso/i });
        fireEvent.click(botonCerrar);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('Debe retornar null y no montar nada en el DOM si isOpen es false o si courseId es nulo', () => {
        const mockReturn = defaultHookReturn as unknown;
        vi.mocked(useCourseManagement).mockReturnValue(
            mockReturn as ReturnType<typeof useCourseManagement>
        );

        const { container } = render(
            <CourseManagementModal courseId={null} isOpen={false} onClose={mockOnClose} onSyncCount={mockOnSyncCount} />
        );

        expect(container.firstChild).toBeNull();
    });
});
