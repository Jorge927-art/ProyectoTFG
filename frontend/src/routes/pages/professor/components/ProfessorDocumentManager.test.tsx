import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProfessorDocumentManager } from './ProfessorDocumentManager';
import type { TaughtCourse } from '../../../../services/userDomains';
import type { DocumentMetadata } from '../../../../services/documentService';
import * as documentService from '../../../../services/documentService';
import { emitNotificationsRefresh } from '../../../../components/ui/globalNotificationBell/useNotifications';

vi.mock('../../../../services/documentService', () => ({
    downloadDocumentSecure: vi.fn(),
    getProfessorRecipientsByCourse: vi.fn(),
    hideAllReceivedGeneralDocuments: vi.fn(),
    getUserDocuments: vi.fn(),
    getSentDocumentsByCourse: vi.fn(),
    markDocumentAsRead: vi.fn(),
    uploadProfessorDocument: vi.fn(),
}));

vi.mock('../../../../components/ui/globalNotificationBell/useNotifications', () => ({
    emitNotificationsRefresh: vi.fn(),
}));

const courses: TaughtCourse[] = [
    {
        id: 101,
        title: 'Álgebra',
        category: 'Matemáticas',
        studentsCount: 24,
        averageProgress: 0,
    },
    {
        id: 202,
        title: 'Historia',
        category: 'Humanidades',
        studentsCount: 17,
        averageProgress: 0,
    },
];

const receivedUnreadDoc: DocumentMetadata = {
    documentid: 11,
    filename: 'feedback-algebra.pdf',
    originalname: 'feedback-algebra.pdf',
    upload_date: '2026-08-06T10:00:00.000Z',
    sender: { userId: 50, username: 'alumno_marta', email: 'marta@tfg.com', role: 'STUDENT' },
    receiver: { userId: 2, username: 'profesor_juan', email: 'juan@tfg.com', role: 'PROFESSOR' },
    folder_type: 'RECEIVED',
    isRead: false,
};

const sentDoc: DocumentMetadata = {
    documentid: 22,
    filename: 'rubrica.pdf',
    originalname: 'rubrica.pdf',
    upload_date: '2026-08-06T10:00:00.000Z',
    sender: { userId: 2, username: 'profesor_juan', email: 'juan@tfg.com', role: 'PROFESSOR' },
    receiver: { userId: 3, username: 'laura_student', email: 'laura@tfg.com', role: 'STUDENT' },
    folder_type: 'SENT',
    isRead: true,
};

const receivedUnreadVideoDoc: DocumentMetadata = {
    documentid: 33,
    filename: 'feedback-video.mp4',
    originalname: 'feedback-video.mp4',
    upload_date: '2026-08-06T10:00:00.000Z',
    sender: { userId: 71, username: 'alumno_video', email: 'video@tfg.com', role: 'STUDENT' },
    receiver: { userId: 2, username: 'profesor_juan', email: 'juan@tfg.com', role: 'PROFESSOR' },
    folder_type: 'RECEIVED',
    isRead: false,
};

describe('ProfessorDocumentManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        vi.mocked(documentService.getProfessorRecipientsByCourse).mockResolvedValue([
            { userId: 3, username: 'laura_student', email: 'laura@tfg.com', role: 'STUDENT' },
            { userId: 9, username: 'root_admin', email: 'admin@tfg.com', role: 'ADMIN' },
        ]);
        vi.mocked(documentService.getUserDocuments).mockResolvedValue([receivedUnreadDoc]);
        vi.mocked(documentService.getSentDocumentsByCourse).mockResolvedValue([sentDoc]);
        vi.mocked(documentService.uploadProfessorDocument).mockResolvedValue({
            message: 'ok',
            filename: 'documents/rubrica.pdf',
            originalname: 'rubrica.pdf',
        });
        vi.mocked(documentService.downloadDocumentSecure).mockResolvedValue();
        vi.mocked(documentService.markDocumentAsRead).mockResolvedValue({
            message: 'ok',
            documentId: 11,
            isRead: true,
        });
    });

    it('carga destinatarios y documentos recibidos al inicializar con la primera asignatura', async () => {
        render(<ProfessorDocumentManager availableCourses={courses} />);

        await waitFor(() => {
            expect(documentService.getProfessorRecipientsByCourse).toHaveBeenCalledWith(101);
            expect(documentService.getUserDocuments).toHaveBeenCalled();
            expect(screen.getByText('feedback-algebra.pdf')).toBeInTheDocument();
            expect(screen.getByText('De: alumno_marta')).toBeInTheDocument();
        });
    });

    it('filtra en Recibidos los trabajos/exámenes asociados a asignatura para no mezclar bandejas', async () => {
        const assignmentDoc: DocumentMetadata = {
            documentid: 44,
            filename: 'entrega-t1.pdf',
            originalname: 'entrega-t1.pdf',
            upload_date: '2026-08-06T10:00:00.000Z',
            sender: { userId: 3, username: 'laura_student', email: 'laura@tfg.com', role: 'STUDENT' },
            receiver: { userId: 2, username: 'profesor_juan', email: 'juan@tfg.com', role: 'PROFESSOR' },
            folder_type: 'RECEIVED',
            isRead: false,
            course: { courseId: 101, title: 'Álgebra', category: 'Matemáticas' },
        };

        vi.mocked(documentService.getUserDocuments).mockResolvedValueOnce([receivedUnreadDoc, assignmentDoc]);

        render(<ProfessorDocumentManager availableCourses={courses} />);

        await waitFor(() => {
            expect(screen.getByText('feedback-algebra.pdf')).toBeInTheDocument();
        });

        expect(screen.queryByText('entrega-t1.pdf')).not.toBeInTheDocument();
    });

    it('no muestra documentos de examen en la bandeja de documentación académica', async () => {
        const examDoc: DocumentMetadata = {
            documentid: 99,
            filename: 'examen-final.pdf',
            originalname: 'examen-final.pdf',
            upload_date: '2026-08-06T10:00:00.000Z',
            evaluation_type: 'EXAMEN',
            sender: { userId: 2, username: 'profesor_juan', email: 'juan@tfg.com', role: 'PROFESSOR' },
            receiver: { userId: 3, username: 'laura_student', email: 'laura@tfg.com', role: 'STUDENT' },
            folder_type: 'RECEIVED',
            isRead: false,
        };

        vi.mocked(documentService.getUserDocuments).mockResolvedValueOnce([receivedUnreadDoc, examDoc]);

        render(<ProfessorDocumentManager availableCourses={courses} />);

        await waitFor(() => {
            expect(screen.getByText('feedback-algebra.pdf')).toBeInTheDocument();
        });

        expect(screen.queryByText('examen-final.pdf')).not.toBeInTheDocument();
    });

    it('al cambiar a Enviados consulta documentos enviados y renderiza el destinatario', async () => {
        render(<ProfessorDocumentManager availableCourses={courses} />);

        fireEvent.click(screen.getByRole('button', { name: /Enviados/i }));

        await waitFor(() => {
            expect(documentService.getSentDocumentsByCourse).toHaveBeenCalledWith(101);
            expect(screen.getByText('rubrica.pdf')).toBeInTheDocument();
            expect(screen.getByText('Para: laura_student')).toBeInTheDocument();
        });
    });

    it('envia documento en pestaña Enviados con curso + destinatario seleccionados', async () => {
        render(<ProfessorDocumentManager availableCourses={courses} />);

        fireEvent.click(screen.getByRole('button', { name: /Enviados/i }));

        await waitFor(() => {
            expect(screen.getByRole('option', { name: 'laura_student (STUDENT)' })).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Seleccionar destinatario académico'), {
            target: { value: '3' },
        });

        const fileInput = document.getElementById('prof-doc-upload-input') as HTMLInputElement;
        const file = new File(['contenido-video'], 'rubrica.mp4', { type: 'video/mp4' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        fireEvent.click(screen.getByRole('button', { name: 'Enviar documentación o trabajo' }));

        await waitFor(() => {
            expect(documentService.uploadProfessorDocument).toHaveBeenCalledWith(file, 101, 3, 'DOCUMENTO');
            expect(documentService.getSentDocumentsByCourse).toHaveBeenCalledWith(101);
            expect(screen.getByText('Documento enviado correctamente: rubrica.mp4.')).toBeInTheDocument();
        });
    });

    it('descarga un recibido no leído, lo marca como leído y emite refresh de notificaciones', async () => {
        render(<ProfessorDocumentManager availableCourses={courses} />);

        await waitFor(() => {
            expect(screen.getByText('feedback-algebra.pdf')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Descargar documento 11' }));

        await waitFor(() => {
            expect(documentService.downloadDocumentSecure).toHaveBeenCalledWith(11, 'feedback-algebra.pdf');
            expect(documentService.markDocumentAsRead).toHaveBeenCalledWith(11);
            expect(emitNotificationsRefresh).toHaveBeenCalledTimes(1);
        });
    });

    it('limpia lógicamente la bandeja recibida general del profesor', async () => {
        vi.mocked(documentService.hideAllReceivedGeneralDocuments).mockResolvedValue({
            message: 'ok',
            hiddenCount: 1,
        });

        render(<ProfessorDocumentManager availableCourses={courses} />);

        await waitFor(() => {
            expect(screen.getByText('feedback-algebra.pdf')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Limpiar bandeja de entrada' }));

        await waitFor(() => {
            expect(documentService.hideAllReceivedGeneralDocuments).toHaveBeenCalledTimes(1);
            expect(emitNotificationsRefresh).toHaveBeenCalledTimes(1);
            expect(vi.mocked(documentService.getUserDocuments).mock.calls.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('bloquea archivo >5MB mostrando error de validación en cliente', async () => {
        render(<ProfessorDocumentManager availableCourses={courses} />);

        fireEvent.click(screen.getByRole('button', { name: /Enviados/i }));

        await waitFor(() => {
            expect(screen.getByLabelText('Seleccionar destinatario académico')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Seleccionar destinatario académico'), {
            target: { value: '3' },
        });

        const fileInput = document.getElementById('prof-doc-upload-input') as HTMLInputElement;
        const hugeFile = new File(['x'], 'muy-grande.mp4', { type: 'video/mp4' });
        Object.defineProperty(hugeFile, 'size', { value: 101 * 1024 * 1024 });
        fireEvent.change(fileInput, { target: { files: [hugeFile] } });

        await waitFor(() => {
            expect(screen.getByText('El archivo excede el límite de 100MB configurado por el sistema.')).toBeInTheDocument();
            expect(documentService.uploadProfessorDocument).not.toHaveBeenCalled();
        });
    });

    it('debe activar campana al descargar un MP4 recibido no leído (mismo flujo que documentos)', async () => {
        vi.mocked(documentService.getUserDocuments).mockResolvedValue([receivedUnreadVideoDoc]);
        vi.mocked(documentService.markDocumentAsRead).mockResolvedValueOnce({
            message: 'ok',
            documentId: 33,
            isRead: true,
        });

        render(<ProfessorDocumentManager availableCourses={courses} />);

        await waitFor(() => {
            expect(screen.getByText('feedback-video.mp4')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Descargar documento 33' }));

        await waitFor(() => {
            expect(documentService.downloadDocumentSecure).toHaveBeenCalledWith(33, 'feedback-video.mp4');
            expect(documentService.markDocumentAsRead).toHaveBeenCalledWith(33);
            expect(emitNotificationsRefresh).toHaveBeenCalledTimes(1);
        });
    });
});
