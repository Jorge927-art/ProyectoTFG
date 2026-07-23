import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    getUserDocuments, 
    getSentDocuments, 
    uploadStudentDocument, 
    getTeachersDirectory, 
    getClassmatesDirectory, 
    getAdminsDirectory, 
    downloadDocumentSecure, 
    getReceivedDocumentsByCourse, 
    getSentDocumentsByCourse, 
    uploadAssignmentDocument, 
    markDocumentAsRead, 
    uploadProfessorDocument 
} from './documentService';
import { apiClient } from './apiClient';
import type { UserDirectoryDTO, UploadDocumentResponse } from './documentService';

// --- AISLAMIENTO PERIMETRAL ESTRICTO: MOCK TIPADO DE API_CLIENT ---
vi.mock('./apiClient', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
    },
}));

type MockedApiClient = {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
};

const mockedApi = apiClient as unknown as MockedApiClient;

describe('documentService - Suite de Pruebas Unitarias de Alta Fidelidad', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    const mockRawDocumentsValid = [
        {
            documentid: 501,
            filename: 'tfg_draft_v1.pdf',
            originalname: 'Memoria_TFG_Final.pdf',
            upload_date: '2026-03-01T10:00:00Z',
            sender: { userId: 10, username: 'Juan Docente', email: 'juan@uni.es', role: 'TEACHER' },
            receiver: { userId: 20, username: 'Ana Alumno', email: 'ana@uni.es', role: 'STUDENT' },
            folder_type: 'SENT' as const,
            isRead: true
        }
    ];

    const mockRawDocumentsCorruptos = [
        {
            documentid: undefined,
            filename: null,
            originalname: undefined,
            upload_date: 12345,
            sender: { user_id: 99, username: '  ', email: null, role: '' },
            receiver: null,
            isread: true,
            folder_type: 'INVALID_FOLDER' as unknown as 'SENT'
        },
        {
            documentid: 502,
            read: true,
            sender: null,
            receiver: { userId: null, username: null, email: undefined, role: undefined }
        }
    ];
    // --- BLOQUE 1: CASOS DE PRUEBA DE NORMALIZACIÓN DE DATOS (DATA RESILIENCE) ---
    it('debe mapear y normalizar de forma limpia payloads válidos de la API', async () => {
        mockedApi.get.mockResolvedValueOnce({ data: mockRawDocumentsValid });

        const result = await getUserDocuments();

        expect(result[0].documentid).toBe(501);
        expect(result[0].isRead).toBe(true);
        expect(result[0].sender.userId).toBe(10);
    });

    it('debe aplicar fallbacks defensivos ante payloads corruptos, nulos o con snake_case', async () => {
        mockedApi.get.mockResolvedValueOnce({ data: mockRawDocumentsCorruptos });

        const result = await getSentDocuments();

        expect(result[0].documentid).toBe(0);
        expect(result[0].filename).toBe('');
        expect(result[0].originalname).toBe('Documento sin nombre');
        expect(result[0].folder_type).toBe('RECEIVED');
        expect(result[0].isRead).toBe(true);
        expect(result[0].sender.userId).toBe(99);
        expect(result[0].sender.username).toBe('Usuario no disponible');
        expect(result[0].receiver.username).toBe('Usuario no disponible');

        expect(result[1].documentid).toBe(502);
        expect(result[1].isRead).toBe(true);
        expect(result[1].receiver.userId).toBe(0);
    });

    // --- BLOQUE 2: CONSULTAS AL DIRECTORIO DINÁMICO ACADÉMICO ---
    it.each([
        ['getTeachersDirectory', getTeachersDirectory, '/api/v1/documents/directory/teachers'],
        ['getClassmatesDirectory', getClassmatesDirectory, '/api/v1/documents/directory/classmates'],
        ['getAdminsDirectory', getAdminsDirectory, '/api/v1/documents/directory/admins']
    ])('debe invocar de forma exacta el endpoint de directorio %s', async (_, serviceMethod, expectedUrl) => {
        const mockDirectory: UserDirectoryDTO[] = [{ userId: 1, username: 'Test', email: 't@u.es', role: 'ROLE' }];
        mockedApi.get.mockResolvedValueOnce({ data: mockDirectory });

        const result = await serviceMethod();

        expect(result).toEqual(mockDirectory);
        expect(mockedApi.get).toHaveBeenCalledWith(expectedUrl);
    });

    // --- BLOQUE 3: VALIDACIÓN DE SUBIDA MULTIPART/FORM-DATA (UPLOADS) ---
    it('debe inyectar receiverId y headers explícitos en uploadStudentDocument', async () => {
        const mockResponse: UploadDocumentResponse = { message: 'Ok', filename: 'f.pdf', originalname: 'o.pdf' };
        mockedApi.post.mockResolvedValueOnce({ data: mockResponse });
        const dummyFile = new File([new Uint8Array()], 'doc.pdf', { type: 'application/pdf' });

        const result = await uploadStudentDocument(dummyFile, 42);

        expect(result).toEqual(mockResponse);
        // CORRECCIÓN QUIRÚRGICA: Acceso al índice [0] gracias al aislamiento del beforeEach
        const [url, formData, config] = mockedApi.post.mock.calls[0] as [string, FormData, { headers: Record<string, string> }];
        expect(url).toBe('/api/v1/documents/upload');
        expect(formData.get('file')).toBe(dummyFile);
        expect(formData.get('receiverId')).toBe('42');
        expect(config.headers['Content-Type']).toBe('multipart/form-data');
    });

    it('debe omitir cabeceras explícitas para delegar el boundary del navegador en uploadAssignmentDocument', async () => {
        const mockResponse: UploadDocumentResponse = { message: 'Ok', filename: 'a.pdf', originalname: 'o.pdf' };
        mockedApi.post.mockResolvedValueOnce({ data: mockResponse });
        const dummyFile = new File([new Uint8Array()], 'tfg.zip', { type: 'application/zip' });

        await uploadAssignmentDocument(dummyFile, 101, 'TRABAJO');

        // CORRECCIÓN QUIRÚRGICA: Solución al fallo de la línea 146 de tu captura de pantalla utilizando el índice [0]
        const [url, formData, config] = mockedApi.post.mock.calls[0] as [string, FormData, undefined];
        expect(url).toBe('/api/v1/documents/upload/assignment');
        expect(formData.get('courseId')).toBe('101');
        expect(formData.get('evaluationType')).toBe('TRABAJO');
        expect(config).toBeUndefined();
    });

    it('debe procesar correctamente la subida polimórfica del rol docente', async () => {
        const mockResponse: UploadDocumentResponse = { message: 'Ok', filename: 'p.pdf', originalname: 'p.pdf' };
        mockedApi.post.mockResolvedValueOnce({ data: mockResponse });
        const dummyFile = new File([new Uint8Array()], 'guia.pdf', { type: 'application/pdf' });

        await uploadProfessorDocument(dummyFile, 202, 0);

        // CORRECCIÓN QUIRÚRGICA: Solución al fallo de la línea 160 de tu captura de pantalla utilizando el índice [0]
        const [url, formData] = mockedApi.post.mock.calls[0] as [string, FormData];
        expect(url).toBe('/api/v1/documents/professor-upload');
        expect(formData.get('courseId')).toBe('202');
        expect(formData.get('receiverId')).toBe('0');
    });
    // --- BLOQUE 4: DESCARGAS SEGURAS DE FLUJO DE BYTES (DOM SIMULATION) ---
    it('debe orquestar la descarga simulando los elementos nativos y revocación de URL en downloadDocumentSecure', async () => {
        const dummyBlobContent = 'bytes_simulados_tfg';
        const mockHeaders = { 'content-type': 'application/pdf' };
        
        mockedApi.get.mockResolvedValueOnce({
            data: dummyBlobContent,
            headers: mockHeaders,
        });

        const createObjectURLSpy = vi.fn().mockReturnValue('blob:http://localhost/unique-hash');
        const revokeObjectURLSpy = vi.fn();
        vi.stubGlobal('URL', { createObjectURL: createObjectURLSpy, revokeObjectURL: revokeObjectURLSpy });

        const appendChildSpy = vi.spyOn(document.body, 'appendChild');
        const clickSpy = vi.fn();
        
        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            if (tagName === 'a') {
                const dummyAnchor = originalCreateElement('a');
                dummyAnchor.click = clickSpy;
                return dummyAnchor;
            }
            return originalCreateElement(tagName);
        });

        await downloadDocumentSecure(88, 'Memoria_Final.pdf');

        expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/documents/download/88', { responseType: 'blob' });
        expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(appendChildSpy).toHaveBeenCalledTimes(1);
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:http://localhost/unique-hash');

        vi.unstubAllGlobals();
    });

    // --- BLOQUE 5: FILTROS DINÁMICOS POR ASIGNATURA Y PATCH ---
    it('debe obtener y normalizar documentos recibidos y enviados filtrados por asignatura', async () => {
        mockedApi.get.mockResolvedValue({ data: mockRawDocumentsValid });

        const receivedResult = await getReceivedDocumentsByCourse(10);
        expect(receivedResult).toHaveLength(1);
        expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/documents/course/10/received');

        const sentResult = await getSentDocumentsByCourse(10);
        expect(sentResult).toHaveLength(1);
        expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/documents/course/10/sent');
    });

    it('debe llamar al endpoint PATCH para marcar un documento como leído', async () => {
        const patchResponse = { message: 'Leído', documentId: 501, isRead: true };
        mockedApi.patch.mockResolvedValueOnce({ data: patchResponse });

        const result = await markDocumentAsRead(501);

        expect(result).toEqual(patchResponse);
        expect(mockedApi.patch).toHaveBeenCalledWith('/api/v1/documents/501/read');
    });

    // --- BLOQUE 6: RESILIENCIA ANTE EXCEPCIONES ---
    it('debe propagar limpiamente excepciones de red en operaciones críticas de ficheros', async () => {
        const ioError = new Error('Error 413: El archivo excede el tamaño máximo configurado en la pasarela');
        mockedApi.post.mockRejectedValueOnce(ioError);
        const dummyFile = new File([new Uint8Array()], 'huge.zip', { type: 'application/zip' });

        await expect(uploadStudentDocument(dummyFile, 1)).rejects.toThrow(
            'Error 413: El archivo excede el tamaño máximo configurado en la pasarela'
        );
    });
});
