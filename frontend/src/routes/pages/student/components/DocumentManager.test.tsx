import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentManager } from './DocumentManager';
import { useDocuments } from './useDocuments';

// 1. Mockear el hook para aislar el componente visual de las llamadas reales de Axios
vi.mock('./useDocuments', () => ({
    useDocuments: vi.fn()
}));

describe('DocumentManager Component [TFG Test Suite]', () => {
    // Definimos variables de mock que satisfacen estrictamente la interfaz del hook
    const mockHandleUpload = vi.fn();
    const mockHandleSecureDownload = vi.fn();
    const mockSetDocumentError = vi.fn();
    const mockSetActiveTab = vi.fn();
    const mockSetSelectedReceiverId = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // AUDITORÍA DE CONTRATO: Configuración inicial que refleja fielmente las nuevas propiedades del hook
        vi.mocked(useDocuments).mockReturnValue({
            documentList: [],
            activeTab: 'RECEIVED',
            setActiveTab: mockSetActiveTab,
            loadingDocuments: false,
            isUploading: false,
            documentError: '',
            setDocumentError: mockSetDocumentError,
            directory: [
                { userId: 2, username: 'profesor_juan', email: 'juan@tfg.com', role: 'PROFESSOR' },
                { userId: 3, username: 'alumno_pedro', email: 'pedro@tfg.com', role: 'STUDENT' }
            ],
            loadingDirectory: false,
            selectedReceiverId: '',
            setSelectedReceiverId: mockSetSelectedReceiverId,
            handleUpload: mockHandleUpload,
            handleSecureDownload: mockHandleSecureDownload
        });
    });
    it('debe renderizar el estado vacío contextualizado en la bandeja de entrada por defecto', () => {
        render(<DocumentManager />);

        expect(screen.getByText('Gestión de Documentos Académicos')).toBeInTheDocument();
        expect(screen.getByText('Tu bandeja de entrada está vacía.')).toBeInTheDocument();
    });

    it('debe renderizar el estado vacío contextualizado en la bandeja de enviados al conmutar la pestaña', () => {
        // Forzamos al hook a simular que la pestaña activa actual es la de enviados
        vi.mocked(useDocuments).mockReturnValue({
            documentList: [],
            activeTab: 'SENT',
            setActiveTab: mockSetActiveTab,
            loadingDocuments: false,
            isUploading: false,
            documentError: '',
            setDocumentError: mockSetDocumentError,
            directory: [],
            loadingDirectory: false,
            selectedReceiverId: '',
            setSelectedReceiverId: mockSetSelectedReceiverId,
            handleUpload: mockHandleUpload,
            handleSecureDownload: mockHandleSecureDownload
        });

        render(<DocumentManager />);

        expect(screen.getByText('No has enviado ningún documento todavía.')).toBeInTheDocument();
    });

    it('debe renderizar la lista de metadatos reflejando el emisor o receptor según el flujo dirigido', () => {
        const mockDocuments = [
            {
                documentid: 1,
                filename: 'doc1.pdf',
                originalname: 'Tarea_Algebra.pdf',
                upload_date: '2026-07-06T10:00:00.000Z',
                sender: { userId: 2, username: 'profesor_juan', email: 'juan@tfg.com', role: 'PROFESSOR' },
                receiver: { userId: 1, username: 'luis_student', email: 'luis@tfg.com', role: 'STUDENT' },
                folder_type: 'RECEIVED' as const,
                isRead: false
            }
        ];

        vi.mocked(useDocuments).mockReturnValue({
            documentList: mockDocuments,
            activeTab: 'RECEIVED',
            setActiveTab: mockSetActiveTab,
            loadingDocuments: false,
            isUploading: false,
            documentError: '',
            setDocumentError: mockSetDocumentError,
            directory: [],
            loadingDirectory: false,
            selectedReceiverId: '',
            setSelectedReceiverId: mockSetSelectedReceiverId,
            handleUpload: mockHandleUpload,
            handleSecureDownload: mockHandleSecureDownload
        });

        render(<DocumentManager />);

        expect(screen.getByText('Tarea_Algebra.pdf')).toBeInTheDocument();
        expect(screen.getByText('De: profesor_juan')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // Contador de cabecera
    });

    it('debe mostrar el indicador de carga asíncrona mientras sincroniza con el backend', () => {
        vi.mocked(useDocuments).mockReturnValue({
            documentList: [],
            activeTab: 'RECEIVED',
            setActiveTab: mockSetActiveTab,
            loadingDocuments: true,
            isUploading: false,
            documentError: '',
            setDocumentError: mockSetDocumentError,
            directory: [],
            loadingDirectory: false,
            selectedReceiverId: '',
            setSelectedReceiverId: mockSetSelectedReceiverId,
            handleUpload: mockHandleUpload,
            handleSecureDownload: mockHandleSecureDownload
        });

        render(<DocumentManager />);

        expect(screen.getByText('Sincronizando metadatos con PostgreSQL...')).toBeInTheDocument();
    });

    it('debe bloquear el flujo de subida y advertir visualmente si el alumno no ha elegido un destinatario', () => {
        render(<DocumentManager />);

        // El texto informativo debe invitar al usuario a desbloquear la subida seleccionando un destino
        expect(screen.getByText('Elige un destinatario arriba para desbloquear')).toBeInTheDocument();

        const fileInput = document.getElementById('doc-upload-input') as HTMLInputElement;
        expect(fileInput.disabled).toBe(true); // Verificación estricta de inhabilitación perimetral en la interfaz
    });

    it('debe interceptar y detener la subida en el cliente si el archivo supera el umbral de 5MB con destinatario seleccionado', async () => {
        // Forzamos al hook a simular que el alumno SÍ ha seleccionado previamente un destinatario válido (ID 2)
        vi.mocked(useDocuments).mockReturnValue({
            documentList: [],
            activeTab: 'RECEIVED',
            setActiveTab: mockSetActiveTab,
            loadingDocuments: false,
            isUploading: false,
            documentError: '',
            setDocumentError: mockSetDocumentError,
            directory: [{ userId: 2, username: 'profesor_juan', role: 'PROFESSOR', email: 'j@tfg.com' }],
            loadingDirectory: false,
            selectedReceiverId: 2, // Desbloqueado
            setSelectedReceiverId: mockSetSelectedReceiverId,
            handleUpload: mockHandleUpload,
            handleSecureDownload: mockHandleSecureDownload
        });

        render(<DocumentManager />);

        const fileInput = document.getElementById('doc-upload-input') as HTMLInputElement;
        const largeFile = new File(['a'.repeat(6 * 1024 * 1024)], 'Ensayo_Largo.pdf', { type: 'application/pdf' });

        fireEvent.change(fileInput, { target: { files: [largeFile] } });

        await waitFor(() => {
            expect(mockSetDocumentError).toHaveBeenCalledWith(
                "El archivo excede el límite de 5MB configurado por el sistema."
            );
            expect(mockHandleUpload).not.toHaveBeenCalled();
        });
    });
});

