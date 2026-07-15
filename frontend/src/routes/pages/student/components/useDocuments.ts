import { useState, useEffect, useCallback } from 'react';
import { 
    getUserDocuments, 
    getSentDocuments, 
    uploadStudentDocument, 
    getTeachersDirectory, 
    getClassmatesDirectory, 
    getAdminsDirectory, 
    downloadDocumentSecure,
    type DocumentMetadata, 
    type UserDirectoryDTO 
} from '../../../../services/documentService';

const mergeDirectoryEntries = (groups: UserDirectoryDTO[][]): UserDirectoryDTO[] => {
    const uniqueUsers = new Map<number, UserDirectoryDTO>();

    for (const group of groups) {
        for (const user of group) {
            uniqueUsers.set(user.userId, user);
        }
    }

    return Array.from(uniqueUsers.values());
};

export const useDocuments = (successTrigger?: string) => {
    // Listas independientes para evitar el "efecto fantasma" visual [ADR-19]
    const [receivedList, setReceivedList] = useState<DocumentMetadata[]>([]);
    const [sentList, setSentList] = useState<DocumentMetadata[]>([]);
    const [activeTab, setActiveTab] = useState<'RECEIVED' | 'SENT'>('RECEIVED');
    
    // Estados de carga e interfaz
    const [loadingDocuments, setLoadingDocuments] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [documentError, setDocumentError] = useState<string>('');

    // Estados del directorio dinámico dirigido
    const [directory, setDirectory] = useState<UserDirectoryDTO[]>([]);
    const [loadingDirectory, setLoadingDirectory] = useState<boolean>(false);
    const [selectedReceiverId, setSelectedReceiverId] = useState<number | ''>('');

    /**
     * Sincroniza la lista de documentos de la pestaña que se encuentre activa.
     */
    const fetchTabDocuments = useCallback(async () => {
        setLoadingDocuments(true);
        setDocumentError('');
        try {
            if (activeTab === 'RECEIVED') {
                const data = await getUserDocuments();
                setReceivedList(data);
            } else {
                const data = await getSentDocuments();
                setSentList(data);
            }
        } catch (err: unknown) {
            console.error("Error al sincronizar documentos con el servidor:", err);
            setDocumentError("No se pudieron sincronizar tus documentos desde el servidor.");
        } finally {
            setLoadingDocuments(false);
        }
    }, [activeTab]);

    /**
     * Agrupa y descarga de forma paralela los tres subgrupos del directorio académico legítimo.
     */
    const fetchDirectory = useCallback(async () => {
        setLoadingDirectory(true);
        try {
            const [teachersResult, classmatesResult, adminsResult] = await Promise.allSettled([
                getTeachersDirectory(),
                getClassmatesDirectory(),
                getAdminsDirectory()
            ]);

            const successfulGroups = [teachersResult, classmatesResult, adminsResult]
                .filter((result): result is PromiseFulfilledResult<UserDirectoryDTO[]> => result.status === 'fulfilled')
                .map((result) => result.value);

            if (successfulGroups.length === 0) {
                throw new Error('No se pudo recuperar ningún destinatario válido.');
            }

            setDirectory(mergeDirectoryEntries(successfulGroups));
            setDocumentError('');
        } catch (err: unknown) {
            console.error("Error al recuperar el directorio de contactos:", err);
            setDocumentError("Error al cargar la lista de destinatarios válidos.");
            setDirectory([]);
        } finally {
            setLoadingDirectory(false);
        }
    }, []);
    /**
     * Sube un archivo físico vinculándolo al destinatario seleccionado.
     */
    const handleUpload = async (file: File): Promise<boolean> => {
        if (!file) return false;
        
        // Validación perimetral en cliente: Obligatorio haber seleccionado un destino
        if (!selectedReceiverId) {
            setDocumentError("Por favor, selecciona un destinatario obligatorio para el documento.");
            return false;
        }
        
        setIsUploading(true);
        setDocumentError('');
        try {
            await uploadStudentDocument(file, Number(selectedReceiverId));
            
            // Limpiamos el selector de destinatario tras el éxito
            setSelectedReceiverId('');
            
            // Refrescamos la lista de la pestaña activa en caliente
            await fetchTabDocuments(); 
            return true;
        } catch (err: unknown) {
            console.error("Error al procesar la subida del documento:", err);
            const errorConResponse = err as { response?: { data?: { error?: string } } };
            const backendError = errorConResponse.response?.data?.error || "Error crítico al subir el archivo.";
            setDocumentError(backendError);
            return false;
        } finally {
            setIsUploading(false);
        }
    };

    // Efecto 1: Reacciona al cambio de pestaña o trigger externo para sincronizar documentos
    useEffect(() => {
        fetchTabDocuments();
    }, [successTrigger, fetchTabDocuments, activeTab]);

    // Efecto 2: Carga el directorio dinámico legítimo una sola vez al montar el componente
    useEffect(() => {
        fetchDirectory();
    }, [fetchDirectory]);

    return {
        // Retornamos la lista adecuada según la pestaña activa para simplificar el componente visual
        documentList: activeTab === 'RECEIVED' ? receivedList : sentList,
        activeTab,
        setActiveTab,
        loadingDocuments,
        isUploading,
        documentError,
        setDocumentError,
        directory,
        loadingDirectory,
        selectedReceiverId,
        setSelectedReceiverId,
        handleUpload,
        handleSecureDownload: downloadDocumentSecure
    };

};

