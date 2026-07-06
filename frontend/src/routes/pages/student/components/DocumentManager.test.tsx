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
    const mockSetDocumentError = vi.fn();
    const mockRefreshDocuments = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Configuración por defecto para un estado inicial limpio
        vi.mocked(useDocuments).mockReturnValue({
            documentList: [],
            loadingDocuments: false,
            isUploading: false,
            documentError: '',
            setDocumentError: mockSetDocumentError,
            refreshDocuments: mockRefreshDocuments,
            handleUpload: mockHandleUpload
        } as ReturnType<typeof useDocuments>);
    });

    it('debe renderizar el estado vacío cuando no existen documentos académicos', () => {
        render(<DocumentManager />);

        expect(screen.getByText('Gestión de Documentos Académicos')).toBeInTheDocument();
        expect(screen.getByText('No has subido ni recibido ningún documento.')).toBeInTheDocument();
    });

    it('debe renderizar la lista de metadatos correctamente cuando existen registros en PostgreSQL', () => {
        const mockDocuments = [
            { documentid: 1, filename: 'doc1.pdf', originalname: 'Tarea_Algebra.pdf', upload_date: '2026-07-06T10:00:00.000Z' },
            { documentid: 2, filename: 'doc2.docx', originalname: 'Ensayo_Final.docx', upload_date: '2026-07-05T10:00:00.000Z' }
        ];

        vi.mocked(useDocuments).mockReturnValue({
            documentList: mockDocuments,
            loadingDocuments: false,
            isUploading: false,
            documentError: '',
            setDocumentError: mockSetDocumentError,
            refreshDocuments: mockRefreshDocuments,
            handleUpload: mockHandleUpload
        } as ReturnType<typeof useDocuments>);

        render(<DocumentManager />);

        expect(screen.getByText('Tarea_Algebra.pdf')).toBeInTheDocument();
        expect(screen.getByText('Ensayo_Final.docx')).toBeInTheDocument();
        // Verifica el contador de la cabecera
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('debe mostrar el indicador de carga asíncrona mientras sincroniza con el backend', () => {
        vi.mocked(useDocuments).mockReturnValue({
            documentList: [],
            loadingDocuments: true,
            isUploading: false,
            documentError: '',
            setDocumentError: mockSetDocumentError,
            refreshDocuments: mockRefreshDocuments,
            handleUpload: mockHandleUpload
        } as ReturnType<typeof useDocuments>);

        render(<DocumentManager />);

        expect(screen.getByText('Sincronizando metadatos con PostgreSQL...')).toBeInTheDocument();
    });

    it('debe desplegar el Alert Box controlado si el backend retorna un error de validación perimetral', () => {
        vi.mocked(useDocuments).mockReturnValue({
            documentList: [],
            loadingDocuments: false,
            isUploading: false,
            documentError: 'Extensión de documento no permitida (.exe). Solo se admite PDF, DOCX o TXT.',
            setDocumentError: mockSetDocumentError,
            refreshDocuments: mockRefreshDocuments,
            handleUpload: mockHandleUpload
        } as ReturnType<typeof useDocuments>);

        render(<DocumentManager />);

        expect(screen.getByText('Extensión de documento no permitida (.exe). Solo se admite PDF, DOCX o TXT.')).toBeInTheDocument();
    });

    it('debe bloquear el input y mostrar el spinner de transmisión de payload durante la subida multipart', () => {
        vi.mocked(useDocuments).mockReturnValue({
            documentList: [],
            loadingDocuments: false,
            isUploading: true,
            documentError: '',
            setDocumentError: mockSetDocumentError,
            refreshDocuments: mockRefreshDocuments,
            handleUpload: mockHandleUpload
        } as ReturnType<typeof useDocuments>);

        render(<DocumentManager />);

        expect(screen.getByText('Transmitiendo payload seguro...')).toBeInTheDocument();
    });

    it('debe interceptar y detener la subida en el cliente si el archivo supera el umbral de 5MB', async () => {
        render(<DocumentManager />);

        const fileInput = document.getElementById('doc-upload-input') as HTMLInputElement;
        // Simular un archivo que excede los 5MB
        const largeFile = new File(['a'.repeat(6 * 1024 * 1024)], 'Video_Pesado.mp4', { type: 'video/mp4' });

        fireEvent.change(fileInput, { target: { files: [largeFile] } });

        await waitFor(() => {
            expect(mockSetDocumentError).toHaveBeenCalledWith(
                "El archivo excede el límite de 5MB configurado por el sistema."
            );
            expect(mockHandleUpload).not.toHaveBeenCalled();
        });
    });
});

