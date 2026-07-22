import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCourseManagement } from './useCourseManagement';
import { getActiveStudentsByCourse, getCourseManagementMetrics } from '../../../../services/evaluationService';
import type { StudentPerformanceDTO, CourseMetricsDTO } from '../../../../services/evaluationService';
import type { ChangeEvent } from 'react';

// =========================================================================
// 1. AISLAMIENTO CENTRALIZADO DE LAS APIS DE CONSULTA ACADÉMICA
// =========================================================================
vi.mock('../../../../services/evaluationService', () => ({
    getActiveStudentsByCourse: vi.fn(),
    getCourseManagementMetrics: vi.fn()
}));

// Mock del servicio de subida que se consume mediante importación dinámica
const mockUploadProfessorDocument = vi.fn();
vi.mock('../../../../services/documentService', () => ({
    uploadProfessorDocument: (...args: unknown[]) => mockUploadProfessorDocument(...args)
}));

describe('useCourseManagement - Suite de Pruebas Unitarias de Gestión del Curso', () => {
    const mockOnSyncCount = vi.fn();

    const mockStudentsData: StudentPerformanceDTO[] = [
        {
            userId: 201,
            username: 'Estudiante Test',
            email: 'test@universidad.edu',
            individualGrade: 8.5,
            groupAverage: 7.5
        }
    ] as unknown as StudentPerformanceDTO[];

    const mockMetricsData: CourseMetricsDTO = {
        groupAverageGrade: 8.1,
        activeStudentsCount: 1,
        pendingSubmissionsCount: 3
    } as unknown as CourseMetricsDTO;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    /* =========================================================================
       1. CONTROL DE LA HIDRATACIÓN DIFERIDA (LAZY LOADING POR PESTAÑA)
       ========================================================================= */
    it('Debe consultar alumnos e invocar onSyncCount al arrancar en "alumnado", pero congelar las métricas', async () => {
        vi.mocked(getActiveStudentsByCourse).mockResolvedValue(mockStudentsData);

        const { result } = renderHook(() => useCourseManagement(42, true, mockOnSyncCount));

        expect(result.current.activeTab).toBe('alumnado');
        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(result.current.students).toEqual(mockStudentsData);
            expect(result.current.metrics).toBeNull();
        });

        expect(getActiveStudentsByCourse).toHaveBeenCalledWith(42);
        expect(mockOnSyncCount).toHaveBeenCalledWith(42, 1);
        expect(getCourseManagementMetrics).not.toHaveBeenCalled();
    });

    it('Debe activar la consulta de métricas globales de forma Lazy al conmutar a la pestaña correspondente', async () => {
        vi.mocked(getActiveStudentsByCourse).mockResolvedValue(mockStudentsData);
        vi.mocked(getCourseManagementMetrics).mockResolvedValue(mockMetricsData);

        const { result } = renderHook(() => useCourseManagement(42, true, mockOnSyncCount));
        await waitFor(() => expect(result.current.loading).toBe(false));

        // Conmutamos síncronamente a la pestaña analítica de métricas
        act(() => {
            result.current.setActiveTab('metricas');
        });

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(result.current.metrics).toEqual(mockMetricsData);
        });

        expect(getCourseManagementMetrics).toHaveBeenCalledWith(42);
    });

    /* =========================================================================
       2. RECIPIENTE DE PURGA: EFECTO DE LIMPIEZA AL CERRAR EL MODAL
       ========================================================================= */
    it('Debe restaurar todos los estados operacionales al valor nulo de contingencia si isOpen muta a false', async () => {
        vi.mocked(getActiveStudentsByCourse).mockResolvedValue(mockStudentsData);

        const { result, rerender } = renderHook(
            ({ isOpen, id }) => useCourseManagement(id, isOpen, mockOnSyncCount),
            { initialProps: { isOpen: true, id: 42 as number | null } }
        );

        await waitFor(() => expect(result.current.loading).toBe(false));

        // Simulamos la hidratación manual de errores y archivos en memoria
        act(() => {
            result.current.setActiveTab('metricas');
            result.current.setSelectedStudentId("201");
        });

        // Mutamos las propiedades simulando el cierre del modal por el profesor
        rerender({ isOpen: false, id: null });

        expect(result.current.activeTab).toBe('alumnado');
        expect(result.current.students).toEqual([]);
        expect(result.current.metrics).toBeNull();
        expect(result.current.selectedFile).toBeNull();
        expect(result.current.fileError).toBeNull();
        expect(result.current.uploadSuccessMessage).toBeNull();
        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.selectedStudentId).toBe("0");
    });

    /* =========================================================================
       3. DIRECTIVA DE SEGURIDAD [ADR-25]: VALIDACIÓN DE EXTENSIÓN DE ARCHIVOS
       ========================================================================= */
    it('Debe retener el archivo en memoria si supera la validación estricta y posee extensión .pdf', () => {
        const { result } = renderHook(() => useCourseManagement(42, true, mockOnSyncCount));

        const mockFilePdf = new File(['binario'], 'tfg_entregable.pdf', { type: 'application/pdf' });
        const dummyEvent = {
            target: {
                files: [mockFilePdf],
                value: 'tfg_entregable.pdf'
            }
        } as unknown as ChangeEvent<HTMLInputElement>;

        act(() => {
            result.current.handleFileChange(dummyEvent);
        });

        expect(result.current.selectedFile).toEqual(mockFilePdf);
        expect(result.current.fileError).toBeNull();
    });

    it('Debe rechazar la subida, purgar la memoria e inyectar la advertencia [ADR-25] si la extensión es inválida', () => {
        const { result } = renderHook(() => useCourseManagement(42, true, mockOnSyncCount));

        const mockFileTxt = new File(['texto'], 'machete_notas.txt', { type: 'text/plain' });
        const dummyEvent = {
            target: {
                files: [mockFileTxt],
                value: 'machete_notas.txt'
            }
        } as unknown as ChangeEvent<HTMLInputElement>;

        act(() => {
            result.current.handleFileChange(dummyEvent);
        });

        expect(result.current.selectedFile).toBeNull();
        expect(result.current.fileError).toContain('Validación Estricta [ADR-25]: Solo se admiten archivos en formato .pdf');
        // Control operativo: Verifica el reseteo inmediato del input nativo
        expect(dummyEvent.target.value).toBe('');
    });

    /* =========================================================================
       4. CONTROL DE FLUJO DE TRANSMISIÓN ASÍNCRONA (SUBIDA Y RESPUESTA AXIOS)
       ========================================================================= */
    it('Debe abortar la transmisión e inyectar un aviso si no se detecta un archivo cargado en la memoria', async () => {
        const { result } = renderHook(() => useCourseManagement(42, true, mockOnSyncCount));

        // Intentamos subir sin haber invocado antes handleFileChange
        await act(async () => {
            await result.current.handleUploadDocument();
        });

        expect(result.current.fileError).toBe('Por favor, selecciona un archivo válido antes de transmitir.');
        expect(result.current.isSubmitting).toBe(false);
    });

    it('Debe alternar isSubmitting, invocar el servicio dinámico y resetear el archivo tras un envío exitoso', async () => {
        vi.mocked(getActiveStudentsByCourse).mockResolvedValue(mockStudentsData);
        mockUploadProfessorDocument.mockResolvedValue({ message: 'Documento oficial publicado con éxito' });

        const { result } = renderHook(() => useCourseManagement(42, true, mockOnSyncCount));
        await waitFor(() => expect(result.current.loading).toBe(false));

        // Cargamos previamente un archivo válido en el estado
        const mockFile = new File(['payload'], 'examen_firmado.pdf', { type: 'application/pdf' });
        act(() => {
            result.current.handleFileChange({
                target: { files: [mockFile], value: 'examen_firmado.pdf' }
            } as unknown as ChangeEvent<HTMLInputElement>);
            result.current.setSelectedStudentId("201");
        });

        // Disparamos la subida asíncrona
        await act(async () => {
            await result.current.handleUploadDocument();
        });

        // Verificaciones de ingeniería tras el éxito
        expect(mockUploadProfessorDocument).toHaveBeenCalledWith(mockFile, 42, 201);
        expect(result.current.uploadSuccessMessage).toBe('Documento oficial publicado con éxito');
        expect(result.current.selectedFile).toBeNull(); // Reseteo inmediato de seguridad
        expect(result.current.isSubmitting).toBe(false);
        });

    it('Debe atrapar el error devuelto por la API e inyectar el mensaje de contingencia en el estado', async () => {
        vi.mocked(getActiveStudentsByCourse).mockResolvedValue(mockStudentsData);
        
        // Simulamos un error estructurado de Axios proveniente de la base de datos o el backend
        const mockAxiosError = {
            response: {
                data: { error: 'El alumno destino no se encuentra matriculado en este bloque académico.' }
            }
        };
        mockUploadProfessorDocument.mockRejectedValue(mockAxiosError);

        const { result } = renderHook(() => useCourseManagement(42, true, mockOnSyncCount));
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.handleFileChange({
                target: { files: [new File([''], 'doc.pdf')], value: 'doc.pdf' }
            } as unknown as ChangeEvent<HTMLInputElement>);
        });

        await act(async () => {
            await result.current.handleUploadDocument();
        });

        // La UI debe procesar el error de forma controlada sin tumbar la aplicación
        expect(result.current.fileError).toBe('El alumno destino no se encuentra matriculado en este bloque académico.');
        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.uploadSuccessMessage).toBeNull();
    });
});


