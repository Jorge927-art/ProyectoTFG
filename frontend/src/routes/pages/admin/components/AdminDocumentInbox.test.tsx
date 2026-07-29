import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminDocumentInbox } from './AdminDocumentInbox';
import * as documentService from '../../../../services/documentService';
import * as notificationsHook from '../../../../components/ui/globalNotificationBell/useNotifications';
import type { DocumentMetadata } from '../../../../services/documentService';

vi.mock('../../../../services/documentService', () => ({
    getUserDocuments: vi.fn(),
    downloadDocumentSecure: vi.fn(),
    markDocumentAsRead: vi.fn(),
}));

vi.mock('../../../../components/ui/globalNotificationBell/useNotifications', () => ({
    useNotifications: vi.fn(),
}));

const docUnread: DocumentMetadata = {
    documentid: 20,
    filename: 'evaluacion.pdf',
    originalname: 'evaluacion.pdf',
    upload_date: '2026-07-28T00:00:00.000Z',
    sender: { userId: 7, username: 'profesor', email: 'prof@tfg.com', role: 'PROFESSOR' },
    receiver: { userId: 1, username: 'admin', email: 'admin@tfg.com', role: 'ADMIN' },
    folder_type: 'RECEIVED',
    isRead: false,
};

describe('AdminDocumentInbox', () => {
    const refreshNotifications = vi.fn();
    const scrollIntoViewSpy = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
            configurable: true,
            value: scrollIntoViewSpy,
        });
        vi.mocked(notificationsHook.useNotifications).mockReturnValue({
            alerts: [],
            documents: [],
            hasAlerts: false,
            hasUnread: false,
            refreshAlerts: vi.fn(),
            refreshNotifications,
            dismissNotifications: vi.fn(),
            loading: false,
        });
    });

    it('muestra los documentos recibidos del admin', async () => {
        vi.mocked(documentService.getUserDocuments).mockResolvedValue([docUnread]);

        render(<AdminDocumentInbox />);

        await waitFor(() => {
            expect(screen.getByText('evaluacion.pdf')).toBeInTheDocument();
            expect(screen.getByText('De: profesor')).toBeInTheDocument();
        });
    });

    it('descarga y marca como leído un documento no leído, refrescando notificaciones', async () => {
        vi.mocked(documentService.getUserDocuments).mockResolvedValue([docUnread]);
        vi.mocked(documentService.downloadDocumentSecure).mockResolvedValue();
        vi.mocked(documentService.markDocumentAsRead).mockResolvedValue({
            message: 'ok',
            documentId: 20,
            isRead: true,
        });

        render(<AdminDocumentInbox />);

        await waitFor(() => {
            expect(screen.getByText('evaluacion.pdf')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Descargar documento 20' }));

        await waitFor(() => {
            expect(documentService.downloadDocumentSecure).toHaveBeenCalledWith(20, 'evaluacion.pdf');
            expect(documentService.markDocumentAsRead).toHaveBeenCalledWith(20);
            expect(refreshNotifications).toHaveBeenCalledTimes(1);
        });
    });

    it('si no hay documentos muestra estado vacío', async () => {
        vi.mocked(documentService.getUserDocuments).mockResolvedValue([]);

        render(<AdminDocumentInbox />);

        await waitFor(() => {
            expect(screen.getByText('No hay documentos pendientes en la bandeja.')).toBeInTheDocument();
        });
    });

    it('en modo autoFocusUnread resalta y centra el primer documento no leído', async () => {
        const readDoc: DocumentMetadata = { ...docUnread, documentid: 10, isRead: true, originalname: 'leido.pdf' };
        const unreadDoc: DocumentMetadata = { ...docUnread, documentid: 33, isRead: false, originalname: 'pendiente.pdf' };

        vi.mocked(documentService.getUserDocuments).mockResolvedValue([readDoc, unreadDoc]);

        render(<AdminDocumentInbox autoFocusUnread={true} />);

        await waitFor(() => {
            expect(screen.getByTestId('admin-doc-row-33').className).toContain('border-amber-300');
            expect(scrollIntoViewSpy).toHaveBeenCalled();
        });
    });
});
