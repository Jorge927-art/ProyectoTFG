import { useState, useEffect, useCallback } from 'react';
import { getUserDocuments, uploadStudentDocument, type DocumentMetadata } from '../../../../services/documentService'; // Ajusta las rutas relativas según tu árbol

export const useDocuments = (successTrigger?: string) => {
    const [documentList, setDocumentList] = useState<DocumentMetadata[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [documentError, setDocumentError] = useState<string>('');

    /**
     * Recupera el listado de documentos del usuario autenticado sincronizando con PostgreSQL.
     */
    const fetchUserDocuments = useCallback(async () => {
        setLoadingDocuments(true);
        setDocumentError('');
        try {
            const data = await getUserDocuments();
            setDocumentList(data);
        } catch (err: unknown) {
            console.error("Error crítico al sincronizar documentos con el servidor:", err);
            setDocumentError("No se pudieron sincronizar tus documentos desde el servidor.");
        } finally {
            setLoadingDocuments(false);
        }
    }, []);

    /**
     * Sube un archivo físico al servidor y refresca el listado de forma síncrona.
     */
    const handleUpload = async (file: File): Promise<boolean> => {
        if (!file) return false;
        
        setIsUploading(true);
        setDocumentError('');
        try {
            await uploadStudentDocument(file);
            await fetchUserDocuments(); // Refresca en caliente la lista sin recargar la página
            return true;
        } catch (err: unknown) {
            console.error("Error al procesar la subida del documento:", err);
            // Capturamos el mensaje de error exacto devuelto por la validación perimetral dual de Spring Boot
            const errorConResponse = err as { response?: { data?: { error?: string } } };
            const backendError = errorConResponse.response?.data?.error || "Error crítico al subir el archivo.";
            setDocumentError(backendError);
            return false;
        } finally {
            setIsUploading(false);
        }
    };

    // Reactividad: se ejecuta al montar y si cambia un trigger externo de éxito
    useEffect(() => {
        fetchUserDocuments();
    }, [successTrigger, fetchUserDocuments]);

    return {
        documentList,
        loadingDocuments,
        isUploading,
        documentError,
        setDocumentError,
        refreshDocuments: fetchUserDocuments,
        handleUpload
    };
};
