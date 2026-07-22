import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDocuments } from './useDocuments';
import { 
    getUserDocuments, 
    getSentDocuments, 
    getTeachersDirectory, 
    getClassmatesDirectory, 
    getAdminsDirectory, 
    uploadStudentDocument 
} from '../../../../services/documentService';
import type { DocumentMetadata, UserDirectoryDTO } from '../../../../services/documentService';

// =========================================================================
// 1. AISLAMIENTO CENTRALIZADO DE LAS APIS DE CONSULTA DE ARCHIVOS Y CONTACTOS
// =========================================================================
vi.mock('../../../../services/documentService', () => ({
    getUserDocuments: vi.fn(),
    getSentDocuments: vi.fn(),
    uploadStudentDocument: vi.fn(),
    getTeachersDirectory: vi.fn(),
    getClassmatesDirectory: vi.fn(),
    getAdminsDirectory: vi.fn(),
    downloadDocumentSecure: vi.fn()
}));

describe('useDocuments - Suite de Pruebas Unitarias de Gestión Documental', () => {
    
    const mockReceivedDocs: DocumentMetadata[] = [
        { documentId: 801, fileName: 'enunciado_practica_1.pdf', uploadedAt: '2026-03-15', senderName: 'Prof. Martínez', sizeBytes: 102456 }
    ] as unknown as DocumentMetadata[];

    const mockSentDocs: DocumentMetadata[] = [
        { documentId: 901, fileName: 'entrega_tfg_v1.pdf', uploadedAt: '2026-04-01', senderName: 'Alumno Test', sizeBytes: 204890 }
    ] as unknown as DocumentMetadata[];

    const mockTeachers: UserDirectoryDTO[] = [
        { userId: 1, fullName: 'Carlos Profesor', role: 'PROFESSOR' }
    ] as unknown as UserDirectoryDTO[];

    const mockClassmates: UserDirectoryDTO[] = [
        { userId: 2, fullName: 'Ana Alumna', role: 'STUDENT' },
        { userId: 1, fullName: 'Carlos Profesor', role: 'PROFESSOR' } // Duplicado intencionado para testear merge
    ] as unknown as UserDirectoryDTO[];

    const mockAdmins: UserDirectoryDTO[] = [
        { userId: 3, fullName: 'Elena Admin', role: 'ADMIN' }
    ] as unknown as UserDirectoryDTO[];

    beforeEach(() => {
        vi.clearAllMocks();
        // Resoluciones base por defecto para mitigar bloqueos en el montaje de efectos concurrentes
        vi.mocked(getUserDocuments).mockResolvedValue(mockReceivedDocs);
        vi.mocked(getSentDocuments).mockResolvedValue(mockSentDocs);
        vi.mocked(getTeachersDirectory).mockResolvedValue(mockTeachers);
        vi.mocked(getClassmatesDirectory).mockResolvedValue(mockClassmates);
        vi.mocked(getAdminsDirectory).mockResolvedValue(mockAdmins);
    });

    /* =========================================================================
       1. CONTROL DE SINCRONIZACIÓN INICIAL Y EFECTO FANTASMA [ADR-19]
       ========================================================================= */
    it('Debe consultar los documentos recibidos por defecto al montarse y mantener las listas aisladas', async () => {
        const { result } = renderHook(() => useDocuments());

        expect(result.current.activeTab).toBe('RECEIVED');
        expect(result.current.loadingDocuments).toBe(true);

        await waitFor(() => {
            expect(result.current.loadingDocuments).toBe(false);
            expect(result.current.documentList).toEqual(mockReceivedDocs);
        });

        expect(getUserDocuments).toHaveBeenCalledTimes(1);
    });

    it('Debe conmutar asíncronamente a SENT e hidratar su colección correspondiente bajo demanda', async () => {
        const { result } = renderHook(() => useDocuments());
        await waitFor(() => expect(result.current.loadingDocuments).toBe(false));

        act(() => {
            result.current.setActiveTab('SENT');
        });

        expect(result.current.loadingDocuments).toBe(true);

        await waitFor(() => {
            expect(result.current.loadingDocuments).toBe(false);
            expect(result.current.documentList).toEqual(mockSentDocs);
        });

        expect(getSentDocuments).toHaveBeenCalledTimes(1);
    });

    /* =========================================================================
       2. CONTROL DE CARGA PARALELA Y MEZCLA DE DIRECTORIOS (PROMISE.ALLSETTLED)
       ========================================================================= */
    it('Debe agrupar las peticiones en paralelo mediante Promise.allSettled y purgar registros duplicados', async () => {
        const { result } = renderHook(() => useDocuments());

        expect(result.current.loadingDirectory).toBe(true);

        // Esperamos a que los tres endpoints resuelvan y se aplique el mapa de unicidad
        await waitFor(() => {
            expect(result.current.loadingDirectory).toBe(false);
            // El total consolidado debe ser 3 debido a la purga por ID del duplicado (userId: 1)
            expect(result.current.directory).toHaveLength(3);
        });

        expect(getTeachersDirectory).toHaveBeenCalledTimes(1);
        expect(getClassmatesDirectory).toHaveBeenCalledTimes(1);
        expect(getAdminsDirectory).toHaveBeenCalledTimes(1);

        // Verificar el orden de inserción y propiedades del diccionario saneado
        expect(result.current.directory[0]).toEqual({ userId: 1, fullName: 'Carlos Profesor', role: 'PROFESSOR' });
        expect(result.current.directory[1]).toEqual({ userId: 2, fullName: 'Ana Alumna', role: 'STUDENT' });
        expect(result.current.directory[2]).toEqual({ userId: 3, fullName: 'Elena Admin', role: 'ADMIN' });
    });

    it('Debe tolerar caídas parciales en las promesas del directorio y persistir los nodos exitosos', async () => {
        // Simulamos un fallo crítico 500 en el endpoint de compañeros, pero los demás responden OK
        vi.mocked(getClassmatesDirectory).mockRejectedValue(new Error('Internal Server Error PostgreSQL'));

        const { result } = renderHook(() => useDocuments());

        await waitFor(() => {
            expect(result.current.loadingDirectory).toBe(false);
            // Debe hidratar con éxito los grupos de profesores y administradores (1 + 1 = 2 registros)
            expect(result.current.directory).toHaveLength(2);
            expect(result.current.documentError).toBe('');
        });
    });

    it('Debe inyectar la advertencia de contingencia en el estado si la totalidad de las promesas fallan', async () => {
        vi.mocked(getTeachersDirectory).mockRejectedValue(new Error('Network Error'));
        vi.mocked(getClassmatesDirectory).mockRejectedValue(new Error('Timeout'));
        vi.mocked(getAdminsDirectory).mockRejectedValue(new Error('Forbidden'));

        const { result } = renderHook(() => useDocuments());

        await waitFor(() => {
            expect(result.current.loadingDirectory).toBe(false);
            expect(result.current.directory).toEqual([]);
            expect(result.current.documentError).toBe('Error al cargar la lista de destinatarios válidos.');
        });
    });

    /* =========================================================================
       3. CONTROL DE TRANSMISIÓN, REVENTAS EN CLIENTE Y REFRESCADO EN CALIENTE
       ========================================================================= */
    it('Debe rebotar la subida y retornar false si no se ha inyectado un receptor obligatorio', async () => {
        const { result } = renderHook(() => useDocuments());
        await waitFor(() => expect(result.current.loadingDocuments).toBe(false));

        const mockFile = new File(['datos'], 'tfg_final.pdf', { type: 'application/pdf' });
        
        let uploadResult: boolean | undefined;
        await act(async () => {
            uploadResult = await result.current.handleUpload(mockFile);
        });

        expect(uploadResult).toBe(false);
        expect(result.current.documentError).toBe("Por favor, selecciona un destinatario obligatorio para el documento.");
        expect(uploadStudentDocument).not.toHaveBeenCalled();
    });

            it('Debe alternar isUploading, invocar el servicio de persistencia y limpiar el selector tras un envío exitoso', async () => {
        // [CORRECCIÓN CRÍTICA ts(2345)]: Desenvuelve el tipo interno resuelto por la promesa usando Awaited
        vi.mocked(uploadStudentDocument).mockResolvedValue({} as unknown as Awaited<ReturnType<typeof uploadStudentDocument>>);
        const { result } = renderHook(() => useDocuments());
        await waitFor(() => expect(result.current.loadingDocuments).toBe(false));

        // Inyectamos el ID de destino en el estado reactivo
        act(() => {
            result.current.setSelectedReceiverId(2);
        });

        const mockFile = new File(['datos'], 'tfg_final.pdf', { type: 'application/pdf' });
        
        let uploadResult: boolean | undefined;
        await act(async () => {
            uploadResult = await result.current.handleUpload(mockFile);
        });

        expect(uploadResult).toBe(true);
        expect(uploadStudentDocument).toHaveBeenCalledWith(mockFile, 2);
        expect(result.current.selectedReceiverId).toBe(''); // Limpieza inmediata
        expect(result.current.isUploading).toBe(false);
    });

    it('Debe capturar los errores de Axios del backend e inyectarlos de forma segura en el estado', async () => {
        const mockAxiosError = {
            response: {
                data: { error: 'El tamaño del documento excede el límite ADR-25 fijado por la universidad.' }
            }
        };
        vi.mocked(uploadStudentDocument).mockRejectedValue(mockAxiosError);

        const { result } = renderHook(() => useDocuments());
        await waitFor(() => expect(result.current.loadingDocuments).toBe(false));

        act(() => {
            result.current.setSelectedReceiverId(3);
        });

        const mockFile = new File(['datos'], 'grande.pdf', { type: 'application/pdf' });
        await act(async () => {
            await result.current.handleUpload(mockFile);
        });

        expect(result.current.documentError).toBe('El tamaño del documento excede el límite ADR-25 fijado por la universidad.');
        expect(result.current.isUploading).toBe(false);
    });

    it('Debe gatillar síncronamente un fetch de refresco si el parámetro externo successTrigger muta', async () => {
        // Inicializamos con un trigger vacío
        const { result, rerender } = renderHook(
            ({ trigger }) => useDocuments(trigger),
            { initialProps: { trigger: '' } }
        );
        await waitFor(() => expect(result.current.loadingDocuments).toBe(false));
        expect(getUserDocuments).toHaveBeenCalledTimes(1);

        // Simulamos que el componente padre cambia el trigger tras una acción asíncrona exitosa externa
        rerender({ trigger: 'REFRESH_NATIVO_TFG' });

        expect(result.current.loadingDocuments).toBe(true);
        await waitFor(() => expect(result.current.loadingDocuments).toBe(false));
        expect(getUserDocuments).toHaveBeenCalledTimes(2);
    });
});


