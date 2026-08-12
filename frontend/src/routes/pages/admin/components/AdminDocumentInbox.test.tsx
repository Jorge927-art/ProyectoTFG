import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AdminDocumentInbox } from './AdminDocumentInbox';
import * as documentService from '../../../../services/documentService';
import type { DocumentMetadata } from '../../../../services/documentService';

const mockEmitNotificationsRefresh = vi.fn();

vi.mock('../../../../services/documentService', () => ({
    getAdminDocumentRecipients: vi.fn(),
    getAdminDocumentCourses: vi.fn(),
    getSentDocuments: vi.fn(),
    getUserDocuments: vi.fn(),
    hideAllReceivedGeneralDocuments: vi.fn(),
    hideAllSentGeneralDocuments: vi.fn(),
    downloadDocumentSecure: vi.fn(),
    markDocumentAsRead: vi.fn(),
    uploadStudentDocument: vi.fn(),
    uploadAdminDocumentToCourse: vi.fn(),
}));

vi.mock('../../../../components/ui/globalNotificationBell/useNotifications', () => ({
    emitNotificationsRefresh: () => mockEmitNotificationsRefresh(),
}));

const docUnread: DocumentMetadata = {
    documentid: 20,
    filename: 'evaluacion.pdf',
    originalname: 'evaluacion.pdf',
    upload_date: '2026-07-28T00:00:00.000Z',
    sender: { userId: 7, username: 'profesor', email: 'prof@tfg.com', role: 'PROFESSOR' },
    receiver: { userId: 1, username: 'admin', email: 'admin@tfg.com', role: 'ADMIN' },
    course: null,
    folder_type: 'RECEIVED',
    isRead: false,
};

describe('AdminDocumentInbox', () => {
    const scrollIntoViewSpy = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
            configurable: true,
            value: scrollIntoViewSpy,
        });
        vi.mocked(documentService.getAdminDocumentRecipients).mockResolvedValue([]);
        vi.mocked(documentService.getAdminDocumentCourses).mockResolvedValue([]);
        vi.mocked(documentService.getSentDocuments).mockResolvedValue([]);
    });

    it('muestra los documentos recibidos del admin', async () => {
        vi.mocked(documentService.getUserDocuments).mockResolvedValue([docUnread]);

        render(<AdminDocumentInbox />);

        await waitFor(() => {
            expect(screen.getByText('evaluacion.pdf')).toBeInTheDocument();
            expect(screen.getByText('De: profesor')).toBeInTheDocument();
        });
    });

    it('muestra el historial de enviados en un bloque separado con su destinatario', async () => {
        const sentDoc: DocumentMetadata = {
            ...docUnread,
            documentid: 99,
            originalname: 'circular.pdf',
            course: { courseId: 101, title: 'Álgebra', category: 'Matemáticas' },
            folder_type: 'SENT',
            isRead: true,
            receiver: { userId: 12, username: 'laura_student', email: 'laura@tfg.com', role: 'STUDENT' },
        };

        vi.mocked(documentService.getUserDocuments).mockResolvedValue([docUnread]);
        vi.mocked(documentService.getSentDocuments).mockResolvedValue([sentDoc]);

        render(<AdminDocumentInbox />);

        await waitFor(() => {
            expect(screen.getByText('circular.pdf')).toBeInTheDocument();
            expect(screen.getByText('Para: laura_student')).toBeInTheDocument();
        });
    });

    it('filtra la pestaña de enviados por destinatario y por curso', async () => {
        const sentDocA: DocumentMetadata = {
            ...docUnread,
            documentid: 90,
            originalname: 'circular-algebra.pdf',
            folder_type: 'SENT',
            isRead: true,
            course: { courseId: 101, title: 'Álgebra', category: 'Matemáticas' },
            receiver: { userId: 12, username: 'laura_student', email: 'laura@tfg.com', role: 'STUDENT' },
        };

        const sentDocB: DocumentMetadata = {
            ...docUnread,
            documentid: 91,
            originalname: 'circular-historia.pdf',
            folder_type: 'SENT',
            isRead: true,
            course: { courseId: 202, title: 'Historia', category: 'Humanidades' },
            receiver: { userId: 15, username: 'mario_student', email: 'mario@tfg.com', role: 'STUDENT' },
        };

        vi.mocked(documentService.getUserDocuments).mockResolvedValue([]);
        vi.mocked(documentService.getSentDocuments).mockResolvedValue([sentDocA, sentDocB]);
        vi.mocked(documentService.getAdminDocumentRecipients).mockResolvedValue([
            { userId: 12, username: 'laura_student', role: 'STUDENT', enabled: true },
            { userId: 15, username: 'mario_student', role: 'STUDENT', enabled: true },
        ]);
        vi.mocked(documentService.getAdminDocumentCourses).mockResolvedValue([
            { courseId: 101, title: 'Álgebra', category: 'Matemáticas' },
            { courseId: 202, title: 'Historia', category: 'Humanidades' },
        ]);

        render(<AdminDocumentInbox />);

        await waitFor(() => {
            expect(screen.getByText('circular-algebra.pdf')).toBeInTheDocument();
            expect(screen.getByText('circular-historia.pdf')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Filtrar enviados por destinatario'), {
            target: { value: '12' },
        });

        await waitFor(() => {
            expect(screen.getByText('circular-algebra.pdf')).toBeInTheDocument();
            expect(screen.queryByText('circular-historia.pdf')).not.toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Filtrar enviados por destinatario'), {
            target: { value: '' },
        });
        fireEvent.change(screen.getByLabelText('Filtrar enviados por curso'), {
            target: { value: '202' },
        });

        await waitFor(() => {
            expect(screen.queryByText('circular-algebra.pdf')).not.toBeInTheDocument();
            expect(screen.getByText('circular-historia.pdf')).toBeInTheDocument();
        });
    });

    it('descarga y marca como leído un documento no leído, emitiendo refresco de notificaciones', async () => {
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
            expect(mockEmitNotificationsRefresh).toHaveBeenCalledTimes(1);
        });
    });

    it('limpia lógicamente la bandeja de entrada del admin', async () => {
        vi.mocked(documentService.getUserDocuments).mockResolvedValue([docUnread]);
        vi.mocked(documentService.getSentDocuments).mockResolvedValue([]);
        vi.mocked(documentService.hideAllReceivedGeneralDocuments).mockResolvedValue({
            message: 'ok',
            hiddenCount: 1,
        });

        render(<AdminDocumentInbox />);

        await waitFor(() => {
            expect(screen.getByText('evaluacion.pdf')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Limpiar bandeja de entrada' }));

        await waitFor(() => {
            expect(documentService.hideAllReceivedGeneralDocuments).toHaveBeenCalledTimes(1);
            expect(mockEmitNotificationsRefresh).toHaveBeenCalledTimes(1);
            expect(screen.getByText(/Bandeja de entrada limpiada/i)).toBeInTheDocument();
        });
    });

    it('limpia lógicamente la bandeja de salida del admin', async () => {
        const sentDoc: DocumentMetadata = {
            ...docUnread,
            documentid: 120,
            originalname: 'circular.pdf',
            folder_type: 'SENT',
            isRead: true,
            receiver: { userId: 12, username: 'laura_student', email: 'laura@tfg.com', role: 'STUDENT' },
        };

        vi.mocked(documentService.getUserDocuments).mockResolvedValue([]);
        vi.mocked(documentService.getSentDocuments).mockResolvedValue([sentDoc]);
        vi.mocked(documentService.hideAllSentGeneralDocuments).mockResolvedValue({
            message: 'ok',
            hiddenCount: 1,
        });

        render(<AdminDocumentInbox />);

        await waitFor(() => {
            expect(screen.getByText('circular.pdf')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Limpiar bandeja de salida' }));

        await waitFor(() => {
            expect(documentService.hideAllSentGeneralDocuments).toHaveBeenCalledTimes(1);
            expect(screen.getByText(/Bandeja de salida limpiada/i)).toBeInTheDocument();
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

    it('envía un documento a un usuario concreto desde el panel admin', async () => {
        const sentFile = new File(['contenido'], 'aviso.pdf', { type: 'application/pdf' });
        vi.mocked(documentService.getUserDocuments).mockResolvedValue([]);
        vi.mocked(documentService.getAdminDocumentRecipients).mockResolvedValue([
            { userId: 9, username: 'laura', role: 'STUDENT', enabled: true },
        ]);
        vi.mocked(documentService.uploadStudentDocument).mockResolvedValue({
            message: 'Documento enviado con éxito al destinatario',
            filename: 'documents/uuid.pdf',
            originalname: 'aviso.pdf',
        });

        render(<AdminDocumentInbox />);

        await waitFor(() => {
            expect(screen.getByLabelText('Seleccionar usuario destinatario')).toBeInTheDocument();
            const recipientSelect = screen.getByLabelText('Seleccionar usuario destinatario');
            expect(within(recipientSelect).getByRole('option', { name: 'laura (STUDENT)' })).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Seleccionar usuario destinatario'), {
            target: { value: '9' },
        });
        fireEvent.change(screen.getByLabelText('Archivo para envío individual'), {
            target: { files: [sentFile] },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Enviar a usuario' }));

        await waitFor(() => {
            expect(documentService.uploadStudentDocument).toHaveBeenCalledWith(sentFile, 9);
            expect(screen.getByText('Documento enviado con éxito al destinatario')).toBeInTheDocument();
        });
    });

    it('envía un documento a todos los alumnos de un curso desde el panel admin', async () => {
        const sentFile = new File(['contenido'], 'guia.pdf', { type: 'application/pdf' });
        vi.mocked(documentService.getUserDocuments).mockResolvedValue([]);
        vi.mocked(documentService.getAdminDocumentCourses).mockResolvedValue([
            { courseId: 101, title: 'Álgebra', category: 'Matemáticas' },
        ]);
        vi.mocked(documentService.uploadAdminDocumentToCourse).mockResolvedValue({
            message: 'Documento transmitido con éxito al grupo de alumnos de la asignatura',
            filename: 'documents/uuid-guia.pdf',
            originalname: 'guia.pdf',
        });

        render(<AdminDocumentInbox />);

        await waitFor(() => {
            expect(screen.getByLabelText('Seleccionar curso destinatario')).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Álgebra (Matemáticas)' })).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Seleccionar curso destinatario'), {
            target: { value: '101' },
        });
        fireEvent.change(screen.getByLabelText('Archivo para envío colectivo'), {
            target: { files: [sentFile] },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Enviar a curso' }));

        await waitFor(() => {
            expect(documentService.uploadAdminDocumentToCourse).toHaveBeenCalledWith(sentFile, 101);
            expect(screen.getByText('Documento transmitido con éxito al grupo de alumnos de la asignatura')).toBeInTheDocument();
        });
    });

    it('ordena destinatarios por rol y dentro del rol por orden alfabético en español', async () => {
        vi.mocked(documentService.getUserDocuments).mockResolvedValue([]);
        vi.mocked(documentService.getAdminDocumentRecipients).mockResolvedValue([
            { userId: 31, username: 'zoe_admin', role: 'ADMIN', enabled: true },
            { userId: 32, username: 'Álvaro_admin', role: 'ADMIN', enabled: true },
            { userId: 11, username: 'zeta_prof', role: 'PROFESSOR', enabled: true },
            { userId: 12, username: 'andres_prof', role: 'PROFESSOR', enabled: true },
            { userId: 21, username: 'Óscar_student', role: 'STUDENT', enabled: true },
            { userId: 22, username: 'beatriz_student', role: 'STUDENT', enabled: true },
        ]);

        render(<AdminDocumentInbox />);

        const expectedOrder = [
            'Álvaro_admin (ADMIN)',
            'zoe_admin (ADMIN)',
            'andres_prof (PROFESSOR)',
            'zeta_prof (PROFESSOR)',
            'beatriz_student (STUDENT)',
            'Óscar_student (STUDENT)',
        ];

        await waitFor(() => {
            const userSendSelectOptions = screen
                .getByLabelText('Seleccionar usuario destinatario')
                .querySelectorAll('option');
            const sentFilterSelectOptions = screen
                .getByLabelText('Filtrar enviados por destinatario')
                .querySelectorAll('option');

            const userSendOptionLabels = Array.from(userSendSelectOptions)
                .map((option) => option.textContent?.trim() ?? '')
                .slice(1);
            const sentFilterOptionLabels = Array.from(sentFilterSelectOptions)
                .map((option) => option.textContent?.trim() ?? '')
                .slice(1);

            expect(userSendOptionLabels).toEqual(expectedOrder);
            expect(sentFilterOptionLabels).toEqual(expectedOrder);
        });
    });
});
