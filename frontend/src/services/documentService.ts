import { apiClient } from './apiClient';

// Interfaz para el mapeo simplificado del emisor/receptor dentro del documento
export interface UserDocumentMinDTO {
    userId: number;
    username: string;
    email: string;
    role: string;
}

type RawUserDocumentMinDTO = Partial<UserDocumentMinDTO> & {
    user_id?: number;
};

// Interfaz estricta que mapea la entidad DocumentMetadata de PostgreSQL [ADR-36]
export interface DocumentMetadata {
    documentid: number;
    filename: string;
    originalname: string;
    upload_date: string;
    sender: UserDocumentMinDTO;
    receiver: UserDocumentMinDTO;
    folder_type: 'SENT' | 'RECEIVED';
    isRead: boolean;
}

type RawDocumentMetadata = Partial<DocumentMetadata> & {
    isread?: boolean;
    read?: boolean;
    sender?: RawUserDocumentMinDTO | null;
    receiver?: RawUserDocumentMinDTO | null;
};

const EMPTY_USER_DOCUMENT: UserDocumentMinDTO = {
    userId: 0,
    username: 'Usuario no disponible',
    email: '',
    role: 'UNKNOWN',
};

const normalizeUserDocument = (value?: RawUserDocumentMinDTO | null): UserDocumentMinDTO => ({
    userId:
        typeof value?.userId === 'number'
            ? value.userId
            : typeof value?.user_id === 'number'
                ? value.user_id
                : 0,
    username: typeof value?.username === 'string' && value.username.trim().length > 0
        ? value.username
        : EMPTY_USER_DOCUMENT.username,
    email: typeof value?.email === 'string' ? value.email : '',
    role: typeof value?.role === 'string' && value.role.trim().length > 0 ? value.role : EMPTY_USER_DOCUMENT.role,
});

const normalizeDocumentMetadata = (value: RawDocumentMetadata): DocumentMetadata => ({
    documentid: typeof value.documentid === 'number' ? value.documentid : 0,
    filename: typeof value.filename === 'string' ? value.filename : '',
    originalname: typeof value.originalname === 'string' ? value.originalname : 'Documento sin nombre',
    upload_date: typeof value.upload_date === 'string' ? value.upload_date : '',
    sender: normalizeUserDocument(value.sender),
    receiver: normalizeUserDocument(value.receiver),
    folder_type: value.folder_type === 'SENT' ? 'SENT' : 'RECEIVED',
    isRead:
        typeof value.isRead === 'boolean'
            ? value.isRead
            : typeof value.isread === 'boolean'
                ? value.isread
                : Boolean(value.read),
});

const normalizeDocumentList = (payload: RawDocumentMetadata[]): DocumentMetadata[] => (
    payload.map(normalizeDocumentMetadata)
);

// Interfaz que mapea las respuestas de los tres directorios dinámicos de la API
export interface UserDirectoryDTO {
    userId: number;
    username: string;
    email: string;
    role: string;
}

export interface UploadDocumentResponse {
    message: string;
    filename: string;
    originalname: string;
}

/**
 * [SERVICIO MULTI-ROL]: Recupera los documentos RECIBIDOS (Bandeja de Entrada)
 * asociados a la cuenta del usuario autenticado.
 */
export const getUserDocuments = async (): Promise<DocumentMetadata[]> => {
    const response = await apiClient.get<RawDocumentMetadata[]>('/api/v1/documents');
    return normalizeDocumentList(response.data);
};

/**
 * [NUEVO SERVICIO]: Recupera los documentos ENVIADOS (Bandeja de Salida)
 * asociados a la cuenta del usuario autenticado.
 */
export const getSentDocuments = async (): Promise<DocumentMetadata[]> => {
    const response = await apiClient.get<RawDocumentMetadata[]>('/api/v1/documents/sent');
    return normalizeDocumentList(response.data);
};
/**
 * [SERVICIO DE CARGA DIRIGIDO]: Envía el archivo físico y asocia el ID del destinatario
 * seleccionado de forma obligatoria para persistir el contrato emisor-receptor.
 */
export const uploadStudentDocument = async (file: File, receiverId: number): Promise<UploadDocumentResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiverId', receiverId.toString()); // Payload dirigido obligatorio

    const response = await apiClient.post<UploadDocumentResponse>(
        '/api/v1/documents/upload',
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }
    );
    return response.data;
};

// =========================================================================
// --- CONSULTAS AL DIRECTORIO DINÁMICO ACADÉMICO ---
// =========================================================================

/**
 * Recupera los profesores de los cursos en los que el alumno está matriculado.
 */
export const getTeachersDirectory = async (): Promise<UserDirectoryDTO[]> => {
    const response = await apiClient.get<UserDirectoryDTO[]>('/api/v1/documents/directory/teachers');
    return response.data;
};

/**
 * Recupera los compañeros de clase que comparten asignaturas con el alumno.
 */
export const getClassmatesDirectory = async (): Promise<UserDirectoryDTO[]> => {
    const response = await apiClient.get<UserDirectoryDTO[]>('/api/v1/documents/directory/classmates');
    return response.data;
};

/**
 * Recupera las cuentas de administración de la plataforma.
 */
export const getAdminsDirectory = async (): Promise<UserDirectoryDTO[]> => {
    const response = await apiClient.get<UserDirectoryDTO[]>('/api/v1/documents/directory/admins');
    return response.data;
};

/**
 * [NUEVO SERVICIO ANTI-IDOR]: Solicita el archivo al backend como un flujo de bytes Blob,
 * garantizando el transporte seguro bajo tokens JWT.
 */
export const downloadDocumentSecure = async (documentId: number, originalName: string): Promise<void> => {
    const response = await apiClient.get(`/api/v1/documents/download/${documentId}`, {
        responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', originalName);
    document.body.appendChild(link);
    link.click();
    
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
};

/**
 * [PANEL ASIGNATURAS]: Recupera los documentos RECIBIDOS (correcciones o enunciados)
 * filtrados estrictamente por el ID de la asignatura seleccionada.
 */
export const getReceivedDocumentsByCourse = async (courseId: number): Promise<DocumentMetadata[]> => {
    const response = await apiClient.get<RawDocumentMetadata[]>(`/api/v1/documents/course/${courseId}/received`);
    return normalizeDocumentList(response.data);
};

/**
 * [PANEL ASIGNATURAS]: Recupera las entregas ENVIADAS por el estudiante (trabajos o exámenes)
 * filtradas estrictamente por el ID de la asignatura seleccionada.
 */
export const getSentDocumentsByCourse = async (courseId: number): Promise<DocumentMetadata[]> => {
    const response = await apiClient.get<RawDocumentMetadata[]>(`/api/v1/documents/course/${courseId}/sent`);
    return normalizeDocumentList(response.data);
};

/**
 * [PANEL ASIGNATURAS]: Transmite el archivo de entrega (Trabajo o Examen) al backend,
 * vinculando obligatoriamente el ID de la asignatura para validar la matrícula.
 */
export const uploadAssignmentDocument = async (file: File, courseId: number, evaluationType: string): Promise<UploadDocumentResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId.toString());
    formData.append('evaluationType', evaluationType); // Envia "TRABAJO" o "EXAMEN"

    // Se eliminan las cabeceras explícitas para permitir que apiClient inyecte el JWT 
    // y el navegador gestione el boundary de multipart/form-data automáticamente
    const response = await apiClient.post<UploadDocumentResponse>(
        '/api/v1/documents/upload/assignment',
        formData
    );
    return response.data;
};

/**
 * [NUEVO SERVICIO]: Notifica al backend que un documento recibido ha sido leído,
 * permitiendo actualizar el estado global de la campana de notificaciones.
 */
export const markDocumentAsRead = async (documentId: number): Promise<{ message: string; documentId: number; isRead: boolean }> => {
    const response = await apiClient.patch<{ message: string; documentId: number; isRead: boolean }>(
        `/api/v1/documents/${documentId}/read`
    );
    return response.data;
};

/**
 * [EXCLUSIVO PROFESOR]: Transmite guías, temarios o exámenes asociando el ID de la asignatura
 * y, de manera opcional, el ID del alumno concreto o toda la clase (receiverId = 0).
 */
export const uploadProfessorDocument = async (
    file: File, 
    courseId: number, 
    receiverId: number
): Promise<UploadDocumentResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId.toString());
    formData.append('receiverId', receiverId.toString());

    const response = await apiClient.post<UploadDocumentResponse>(
        '/api/v1/documents/professor-upload',
        formData
    );
    return response.data;
};

/**
 * [EXCLUSIVO PROFESOR - CENTRO DE CALIFICACIÓN]: Recupera las entregas de documentos 
 * realizadas por un alumno específico filtrando directamente por su ID de matrícula.
 */
export const getDocumentsByEnrollment = async (enrollmentId: number): Promise<DocumentMetadata[]> => {
    const response = await apiClient.get<RawDocumentMetadata[]>(`/api/v1/documents/course/enrollment/${enrollmentId}`);
    return normalizeDocumentList(response.data);
};
