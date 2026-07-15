import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationBell from './NotificationBell';
import { DocumentManager } from './DocumentManager';
import * as useDocumentsHook from './useDocuments';
import { apiClient } from '../../../../services/apiClient';
import * as documentService from '../../../../services/documentService';
import type { DocumentMetadata } from '../../../../services/documentService';

const unreadDocument: DocumentMetadata = {
    documentid: 11,
    filename: 'feedback.pdf',
    originalname: 'Feedback_Algebra.pdf',
    upload_date: '2026-07-15T10:00:00.000Z',
    sender: { userId: 2, username: 'profesor_juan', email: 'juan@tfg.com', role: 'PROFESSOR' },
    receiver: { userId: 1, username: 'luis_student', email: 'luis@tfg.com', role: 'STUDENT' },
    folder_type: 'RECEIVED',
    isRead: false,
};

describe('Integracion campana + gestor de documentos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('pasa de rojo a gris tras descargar y marcar como leido', async () => {
        let currentDocs: DocumentMetadata[] = [{ ...unreadDocument }];

        vi.spyOn(apiClient, 'get').mockResolvedValue({
            data: [
                {
                    type: 'DOCUMENT_INBOX',
                    title: 'Bandeja',
                    message: '1 documento pendiente',
                    redirectUrl: '/student/docs',
                },
            ],
        } as never);

        vi.spyOn(documentService, 'getUserDocuments').mockImplementation(async () => currentDocs);

        const markAsReadSpy = vi.spyOn(documentService, 'markDocumentAsRead').mockImplementation(async (documentId: number) => {
            currentDocs = currentDocs.map((doc) =>
                doc.documentid === documentId ? { ...doc, isRead: true } : doc
            );

            return {
                message: 'Documento marcado como leido',
                documentId,
                isRead: true,
            };
        });

        const mockHandleSecureDownload = vi.fn().mockResolvedValue(undefined);

        vi.spyOn(useDocumentsHook, 'useDocuments').mockReturnValue({
            documentList: [{ ...unreadDocument }],
            activeTab: 'RECEIVED',
            setActiveTab: vi.fn(),
            loadingDocuments: false,
            isUploading: false,
            documentError: '',
            setDocumentError: vi.fn(),
            directory: [],
            loadingDirectory: false,
            selectedReceiverId: '',
            setSelectedReceiverId: vi.fn(),
            handleUpload: vi.fn(),
            handleSecureDownload: mockHandleSecureDownload,
        });

        render(
            <>
                <NotificationBell />
                <DocumentManager />
            </>
        );

        const bellButton = screen.getByRole('button', { name: /campana de notificaciones/i });

        await waitFor(() => {
            expect(bellButton.className).toContain('bg-red-50!');
        });

        const documentLabel = await screen.findByText(/Feedback_Algebra\.pdf/i, { selector: 'p' });
        const rowContainer = documentLabel.closest('div.flex.justify-between.items-center');
        const downloadButton = rowContainer?.querySelector('button');

        expect(downloadButton).toBeDefined();
        fireEvent.click(downloadButton as HTMLButtonElement);

        await waitFor(() => {
            expect(markAsReadSpy).toHaveBeenCalledWith(11);
            expect(bellButton.className).toContain('bg-white');
            expect(bellButton.className).not.toContain('bg-red-50!');
        });
    });
});
