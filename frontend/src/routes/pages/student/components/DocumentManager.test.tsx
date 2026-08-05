import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentManager } from './DocumentManager';
import * as useDocumentsHook from './useDocuments';

const mockEmitNotificationsRefresh = vi.fn();
const mockMarkDocumentAsRead = vi.fn();

vi.mock('../../../../components/ui/globalNotificationBell/useNotifications', () => ({
    emitNotificationsRefresh: () => mockEmitNotificationsRefresh(),
}));

vi.mock('../../../../services/documentService', () => ({
    markDocumentAsRead: (...args: unknown[]) => mockMarkDocumentAsRead(...args),
}));

describe('DocumentManager Component [TFG Test Suite]', () => {
    // Definimos variables de mock que satisfacen estrictamente la interfaz del hook
    const mockHandleUpload = vi.fn();
    const mockHandleSecureDownload = vi.fn();
    const mockSetDocumentError = vi.fn();
    const mockSetActiveTab = vi.fn();
    const mockSetSelectedReceiverId = vi.fn();
    let useDocumentsSpy: ReturnType<typeof vi.spyOn>;
    const scrollIntoViewSpy = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
            configurable: true,
            value: scrollIntoViewSpy,
        });
        useDocumentsSpy = vi.spyOn(useDocumentsHook, 'useDocuments');

        // AUDITORÍA DE CONTRATO: Configuración inicial que refleja fielmente las nuevas propiedades del hook
        useDocumentsSpy.mockReturnValue({
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

    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('debe renderizar el estado vacío contextualizado en la bandeja de entrada por defecto', () => {
        render(<DocumentManager />);

        expect(screen.getByText('Gestión de Documentos Académicos')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Recibidos/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Enviados/i })).toBeInTheDocument();
        expect(screen.getByText('Tu bandeja de entrada está vacía.')).toBeInTheDocument();
    });

    it('debe activar el cambio de pestañas a Recibidos/Enviados', () => {
        render(<DocumentManager />);

        fireEvent.click(screen.getByRole('button', { name: /Enviados/i }));
        expect(mockSetActiveTab).toHaveBeenCalledWith('SENT');

        fireEvent.click(screen.getByRole('button', { name: /Recibidos/i }));
        expect(mockSetActiveTab).toHaveBeenCalledWith('RECEIVED');
    });

    it('debe renderizar el estado vacío contextualizado en la bandeja de enviados al conmutar la pestaña', () => {
        // Forzamos al hook a simular que la pestaña activa actual es la de enviados
        useDocumentsSpy.mockReturnValue({
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

        useDocumentsSpy.mockReturnValue({
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

    it('debe mostrar todos los documentos enviados con el mismo gris claro sin depender de isRead', () => {
        const mockDocuments = [
            {
                documentid: 11,
                filename: 'sent-1.pdf',
                originalname: 'sent-1.pdf',
                upload_date: '2026-07-06T10:00:00.000Z',
                sender: { userId: 1, username: 'luis_student', email: 'luis@tfg.com', role: 'STUDENT' },
                receiver: { userId: 2, username: 'profesor_juan', email: 'juan@tfg.com', role: 'PROFESSOR' },
                folder_type: 'SENT' as const,
                isRead: false
            },
            {
                documentid: 12,
                filename: 'sent-2.pdf',
                originalname: 'sent-2.pdf',
                upload_date: '2026-07-06T10:00:00.000Z',
                sender: { userId: 1, username: 'luis_student', email: 'luis@tfg.com', role: 'STUDENT' },
                receiver: { userId: 3, username: 'alumno_pedro', email: 'pedro@tfg.com', role: 'STUDENT' },
                folder_type: 'SENT' as const,
                isRead: true
            }
        ];

        useDocumentsSpy.mockReturnValue({
            documentList: mockDocuments,
            activeTab: 'SENT',
            setActiveTab: mockSetActiveTab,
            loadingDocuments: false,
            isUploading: false,
            documentError: '',
            setDocumentError: mockSetDocumentError,
            directory: [],
            loadingDirectory: false,
            selectedReceiverId: 2,
            setSelectedReceiverId: mockSetSelectedReceiverId,
            handleUpload: mockHandleUpload,
            handleSecureDownload: mockHandleSecureDownload
        });

        render(<DocumentManager />);

        expect(screen.getByText('sent-1.pdf').className).toContain('text-slate-500');
        expect(screen.getByText('sent-2.pdf').className).toContain('text-slate-500');
    });

    it('debe mostrar el indicador de carga asíncrona mientras sincroniza con el backend', () => {
        useDocumentsSpy.mockReturnValue({
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
        useDocumentsSpy.mockReturnValue({
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

        // El texto informativo debe invitar al usuario a desbloquear la subida seleccionando un destino
        expect(screen.getByText('Elige un destinatario arriba para desbloquear')).toBeInTheDocument();

        const fileInput = document.getElementById('doc-upload-input') as HTMLInputElement;
        expect(fileInput.disabled).toBe(true); // Verificación estricta de inhabilitación perimetral en la interfaz
    });

    it('debe interceptar y detener la subida en el cliente si el archivo supera el umbral de 5MB con destinatario seleccionado', async () => {
        // Forzamos al hook a simular que el alumno SÍ ha seleccionado previamente un destinatario válido (ID 2)
        useDocumentsSpy.mockReturnValue({
            documentList: [],
            activeTab: 'SENT',
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

    it('en modo autoFocusDocuments resalta y centra el primer documento no leído', async () => {
        const docs = [
            {
                documentid: 9,
                filename: 'old.pdf',
                originalname: 'old.pdf',
                upload_date: '2026-07-06T10:00:00.000Z',
                sender: { userId: 2, username: 'profesor_juan', email: 'juan@tfg.com', role: 'PROFESSOR' },
                receiver: { userId: 1, username: 'luis_student', email: 'luis@tfg.com', role: 'STUDENT' },
                folder_type: 'RECEIVED' as const,
                isRead: true
            },
            {
                documentid: 10,
                filename: 'new.pdf',
                originalname: 'new.pdf',
                upload_date: '2026-07-06T10:00:00.000Z',
                sender: { userId: 2, username: 'profesor_juan', email: 'juan@tfg.com', role: 'PROFESSOR' },
                receiver: { userId: 1, username: 'luis_student', email: 'luis@tfg.com', role: 'STUDENT' },
                folder_type: 'RECEIVED' as const,
                isRead: false
            }
        ];

        useDocumentsSpy.mockReturnValue({
            documentList: docs,
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

        render(<DocumentManager autoFocusDocuments={true} />);

        await waitFor(() => {
            expect(screen.getByTestId('document-row-10').className).toContain('border-amber-300');
            expect(scrollIntoViewSpy).toHaveBeenCalled();
        });
    });

    it('debe mostrar error de subida cuando handleUpload lanza excepción', async () => {
        mockHandleUpload.mockRejectedValueOnce(new Error('upload-failed'));

        useDocumentsSpy.mockReturnValue({
            documentList: [],
            activeTab: 'SENT',
            setActiveTab: mockSetActiveTab,
            loadingDocuments: false,
            isUploading: false,
            documentError: '',
            setDocumentError: mockSetDocumentError,
            directory: [{ userId: 2, username: 'profesor_juan', role: 'PROFESSOR', email: 'j@tfg.com' }],
            loadingDirectory: false,
            selectedReceiverId: 2,
            setSelectedReceiverId: mockSetSelectedReceiverId,
            handleUpload: mockHandleUpload,
            handleSecureDownload: mockHandleSecureDownload
        });

        render(<DocumentManager />);

        const fileInput = document.getElementById('doc-upload-input') as HTMLInputElement;
        const validFile = new File(['contenido'], 'Entrega.txt', { type: 'text/plain' });

        fireEvent.change(fileInput, { target: { files: [validFile] } });
        fireEvent.click(screen.getByRole('button', { name: /Enviar documento/i }));

        await waitFor(() => {
            expect(mockHandleUpload).toHaveBeenCalledTimes(1);
            expect(mockSetDocumentError).toHaveBeenCalledWith('No se pudo subir el documento. Inténtalo de nuevo.');
        });
    });

    it('no debe subir automáticamente al seleccionar archivo; debe esperar al botón Enviar documento', async () => {
        useDocumentsSpy.mockReturnValue({
            documentList: [],
            activeTab: 'SENT',
            setActiveTab: mockSetActiveTab,
            loadingDocuments: false,
            isUploading: false,
            documentError: '',
            setDocumentError: mockSetDocumentError,
            directory: [{ userId: 2, username: 'profesor_juan', role: 'PROFESSOR', email: 'j@tfg.com' }],
            loadingDirectory: false,
            selectedReceiverId: 2,
            setSelectedReceiverId: mockSetSelectedReceiverId,
            handleUpload: mockHandleUpload,
            handleSecureDownload: mockHandleSecureDownload
        });

        render(<DocumentManager />);

        const fileInput = document.getElementById('doc-upload-input') as HTMLInputElement;
        const validFile = new File(['contenido'], 'Entrega.txt', { type: 'text/plain' });

        fireEvent.change(fileInput, { target: { files: [validFile] } });

        expect(mockHandleUpload).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /Enviar documento/i }));

        await waitFor(() => {
            expect(mockHandleUpload).toHaveBeenCalledTimes(1);
            expect(mockHandleUpload).toHaveBeenCalledWith(validFile);
        });
    });

    it('debe capturar fallo de descarga segura y mostrar mensaje de autorización', async () => {
        mockHandleSecureDownload.mockRejectedValueOnce(new Error('download-failed'));

        const mockDocuments = [
            {
                documentid: 21,
                filename: 'doc-21.pdf',
                originalname: 'Entrega_Final.pdf',
                upload_date: '2026-07-06T10:00:00.000Z',
                sender: { userId: 2, username: 'profesor_juan', email: 'juan@tfg.com', role: 'PROFESSOR' },
                receiver: { userId: 1, username: 'luis_student', email: 'luis@tfg.com', role: 'STUDENT' },
                folder_type: 'RECEIVED' as const,
                isRead: false
            }
        ];

        useDocumentsSpy.mockReturnValue({
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

        fireEvent.click(screen.getByRole('button', { name: /Descargar documento 21/i }));

        await waitFor(() => {
            expect(mockHandleSecureDownload).toHaveBeenCalledWith(21, 'Entrega_Final.pdf');
            expect(mockSetDocumentError).toHaveBeenCalledWith('No tienes autorización legítima para procesar este documento.');
        });

        expect(mockMarkDocumentAsRead).not.toHaveBeenCalled();
        expect(mockEmitNotificationsRefresh).not.toHaveBeenCalled();
    });
});

