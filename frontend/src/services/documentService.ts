import { apiClient } from './apiClient';

// Interfaz estricta que mapea la entidad DocumentMetadata de PostgreSQL
export interface DocumentMetadata {
    documentid: number;
    filename: string;
    originalname: string;
    upload_date: string;
}

// Interfaz para la respuesta exitosa del servidor tras almacenar el archivo
export interface UploadDocumentResponse {
    message: string;
    filename: string;
    originalname: string;
}

/**
 * [SERVICIO MULTI-ROL]: Recupera el listado ordenado de metadatos de documentos
 * asociados de forma exclusiva a la cuenta del usuario autenticado.
 */
export const getUserDocuments = async (): Promise<DocumentMetadata[]> => {
    const response = await apiClient.get<DocumentMetadata[]>('/api/v1/documents');
    return response.data;
};

/**
 * [SERVICIO MULTI-ROL]: Envía un archivo físico (.pdf, .docx, .txt) encapsulado
 * en un objeto Multipart/Form-Data para su validación perimetral dual en Spring Boot.
 */
export const uploadStudentDocument = async (file: File): Promise<UploadDocumentResponse> => {
    const formData = new FormData();
    formData.append('file', file);

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
