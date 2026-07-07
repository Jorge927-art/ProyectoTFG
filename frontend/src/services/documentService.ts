import { apiClient } from './apiClient';

// Interfaz para el mapeo simplificado del emisor/receptor dentro del documento
export interface UserDocumentMinDTO {
    user_id: number;
    username: string;
    email: string;
    role: string;
}

// Interfaz estricta que mapea la entidad DocumentMetadata de PostgreSQL [ADR-36]
export interface DocumentMetadata {
    documentid: number;
    filename: string;
    originalname: string;
    upload_date: string;
    sender: UserDocumentMinDTO;
    receiver: UserDocumentMinDTO;
    folder_type: 'SENT' | 'RECEIVED';
}

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
    const response = await apiClient.get<DocumentMetadata[]>('/api/v1/documents');
    return response.data;
};

/**
 * [NUEVO SERVICIO]: Recupera los documentos ENVIADOS (Bandeja de Salida)
 * asociados a la cuenta del usuario autenticado.
 */
export const getSentDocuments = async (): Promise<DocumentMetadata[]> => {
    const response = await apiClient.get<DocumentMetadata[]>('/api/v1/documents/sent');
    return response.data;
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
