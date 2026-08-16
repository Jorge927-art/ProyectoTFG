import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CourseAssignmentPanel } from './CourseAssignmentPanel';
import type { EnrollmentInfo } from '../../../../services/courseTypes';
import {
    getReceivedDocumentsByCourse,
    getSentDocumentsByCourse,
    downloadDocumentSecure
} from '../../../../services/documentService';
import { apiClient } from '../../../../services/apiClient';

vi.mock('../../../../services/documentService', () => ({
    getReceivedDocumentsByCourse: vi.fn(),
    getSentDocumentsByCourse: vi.fn(),
    downloadDocumentSecure: vi.fn()
}));

vi.mock('../../../../services/apiClient', () => ({
    apiClient: {
        post: vi.fn(),
        patch: vi.fn()
    }
}));

describe('CourseAssignmentPanel - Suite de Pruebas Unitarias [ADR-47]', () => {

    const mockEnrolledList: EnrollmentInfo[] = [
        {
            enrollmentid: 1,
            enrolled_at: '2026-01-01T10:00:00',
            started_at: '2026-01-02T10:00:00',
            status: 'EN_PROGRESO',
            progress_percentage: 50,
            course: {
                course_id: 101,
                title: 'Desarrollo de Aplicaciones Cloud',
                category: 'Ingenieria',
                instructors: 'Prof. Martín'
            }
        },
        {
            enrollmentid: 2,
            enrolled_at: '2026-01-05T10:00:00',
            started_at: null,
            status: 'EN_PROGRESO',
            progress_percentage: 20,
            course: {
                course_id: 102,
                title: 'Inteligencia Artificial Avanzada',
                category: 'Ingenieria',
                instructors: 'Prof. Gomez'
            }
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getSentDocumentsByCourse).mockResolvedValue([]);
        vi.mocked(getReceivedDocumentsByCourse).mockResolvedValue([]);
        vi.mocked(downloadDocumentSecure).mockResolvedValue();
        vi.mocked(apiClient.post).mockResolvedValue({ status: 200 } as never);
        vi.mocked(apiClient.patch).mockResolvedValue({ status: 200 } as never);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('debe renderizar el estado inicial vacío si no hay ninguna asignatura seleccionada', () => {
        render(<CourseAssignmentPanel activeCourseId={null} enrolledList={[]} />);

        expect(screen.getByText(/EXAMENES/i)).toBeInTheDocument();
        expect(screen.getByText(/Selecciona una asignatura activa/i)).toBeInTheDocument();
    });

    it('debe cargar documentos enviados al montar con la asignatura activa', async () => {
        render(<CourseAssignmentPanel activeCourseId={101} enrolledList={mockEnrolledList} />);

        expect(screen.getByText(/Desarrollo de Aplicaciones Cloud/i)).toBeInTheDocument();
        await waitFor(() => expect(getSentDocumentsByCourse).toHaveBeenCalledWith(101));
        expect(getReceivedDocumentsByCourse).not.toHaveBeenCalled();
    });

    it('debe mostrar la bandeja de enviados con documentos reales del curso', async () => {
        vi.mocked(getSentDocumentsByCourse).mockResolvedValueOnce([
            {
                documentid: 801,
                filename: 'entrega-801.pdf',
                originalname: 'Entrega_Final.pdf',
                upload_date: '2026-08-11',
                sender: { username: 'luis_student' },
                receiver: { username: 'profesor_juan' },
                course: { courseId: 101, title: 'Desarrollo de Aplicaciones Cloud', category: 'Ingenieria' },
                folder_type: 'SENT',
                isRead: false
            } as never
        ]);

        render(<CourseAssignmentPanel activeCourseId={101} enrolledList={mockEnrolledList} />);

        await waitFor(() => expect(screen.getByText('Entrega_Final.pdf')).toBeInTheDocument());
        expect(screen.getByText(/Para: profesor_juan/i)).toBeInTheDocument();
        expect(screen.getByText(/Tus envíos/i)).toBeInTheDocument();
    });

    it('debe mostrar el flujo de entrega y permitir cambiar de asignatura', async () => {
        render(<CourseAssignmentPanel activeCourseId={101} enrolledList={mockEnrolledList} />);

        expect(screen.getByRole('button', { name: /Enviar examen/i })).toBeInTheDocument();
        expect(screen.queryByText(/CALIFICACIONES/i)).not.toBeInTheDocument();

        const selectElement = screen.getByDisplayValue('Desarrollo de Aplicaciones Cloud');
        fireEvent.change(selectElement, { target: { value: '102' } });

        expect(screen.getByText(/Inteligencia Artificial Avanzada/i)).toBeInTheDocument();
        await waitFor(() => expect(getSentDocumentsByCourse).toHaveBeenCalledWith(102));
    });

    it('debe conmutar a RECIBIDOS y mostrar loading seguido de bandeja vacía', async () => {
        let resolveDocs: (value: unknown) => void = () => { };
        const deferred = new Promise((resolve) => {
            resolveDocs = resolve;
        });
        vi.mocked(getReceivedDocumentsByCourse).mockReturnValueOnce(deferred as Promise<never>);

        render(<CourseAssignmentPanel activeCourseId={101} enrolledList={mockEnrolledList} />);

        fireEvent.click(screen.getByRole('button', { name: /Recibidos/i }));

        expect(screen.getByText(/Recuperando expedientes del curso/i)).toBeInTheDocument();
        await waitFor(() => expect(getReceivedDocumentsByCourse).toHaveBeenCalledWith(101));

        resolveDocs([]);
        await waitFor(() => {
            expect(screen.getByText(/bandeja de recibidos está vacía/i)).toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: /Enviados/i })).toBeInTheDocument();
    });

    it('debe descargar documento recibido y marcarlo como leído', async () => {
        vi.mocked(getReceivedDocumentsByCourse).mockResolvedValueOnce([
            {
                documentid: 900,
                filename: 'f1.pdf',
                originalname: 'feedback.pdf',
                upload_date: '2026-08-03',
                sender: undefined,
                receiver: undefined,
                folder_type: 'RECEIVED',
                isRead: false
            } as never
        ]);

        render(<CourseAssignmentPanel activeCourseId={101} enrolledList={mockEnrolledList} />);

        fireEvent.click(screen.getByRole('button', { name: /Recibidos/i }));

        await waitFor(() => expect(screen.getByText('feedback.pdf')).toBeInTheDocument());
        expect(screen.getByText(/De: Profesor/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Descargar documento seguro/i }));

        await waitFor(() => {
            expect(downloadDocumentSecure).toHaveBeenCalledWith(900, 'feedback.pdf');
            expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/documents/900/read');
        });
    });

    it('debe mostrar error si falla la descarga segura', async () => {
        vi.mocked(getReceivedDocumentsByCourse).mockResolvedValueOnce([
            {
                documentid: 901,
                filename: 'f2.pdf',
                originalname: 'enunciado.pdf',
                upload_date: '2026-08-03',
                sender: { username: 'Profesor A' },
                receiver: undefined,
                folder_type: 'RECEIVED',
                isRead: false
            } as never
        ]);
        vi.mocked(downloadDocumentSecure).mockRejectedValueOnce(new Error('denied'));

        render(<CourseAssignmentPanel activeCourseId={101} enrolledList={mockEnrolledList} />);
        fireEvent.click(screen.getByRole('button', { name: /Recibidos/i }));

        await waitFor(() => expect(screen.getByText('enunciado.pdf')).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: /Descargar documento seguro/i }));

        await waitFor(() => {
            expect(screen.getByText(/No dispones de una matrícula o autorización legítima/i)).toBeInTheDocument();
        });
    });

    it('debe subir un archivo con tipo fijo TRABAJO y courseId activo', async () => {
        const { container } = render(<CourseAssignmentPanel activeCourseId={101} enrolledList={mockEnrolledList} />);
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        const file = new File(['payload'], 'trabajo.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        fireEvent.change(input, { target: { files: [file] } });
        fireEvent.click(screen.getByRole('button', { name: /Enviar examen/i }));

        await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));

        const [url, formData] = vi.mocked(apiClient.post).mock.calls[0] as [string, FormData];
        expect(url).toBe('/api/v1/documents/upload/assignment');
        expect(formData.get('courseId')).toBe('101');
        expect(formData.get('evaluationType')).toBe('EXAMEN');
        expect(formData.get('file')).toBe(file);
        expect(await screen.findByText('Documento enviado correctamente: trabajo.docx.')).toBeInTheDocument();
    });

    it('debe limpiar error tras timeout cuando falla la subida', async () => {
        vi.useFakeTimers();
        vi.mocked(apiClient.post).mockRejectedValueOnce({
            response: { data: { error: 'Archivo no permitido por política' } }
        } as never);

        const { container } = render(<CourseAssignmentPanel activeCourseId={101} enrolledList={mockEnrolledList} />);

        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['payload'], 'examen.pdf', { type: 'application/pdf' });
        fireEvent.change(input, { target: { files: [file] } });
        fireEvent.click(screen.getByRole('button', { name: /Enviar examen/i }));

        await act(async () => {
            await Promise.resolve();
        });

        expect(apiClient.post).toHaveBeenCalledTimes(1);

        const [, formData] = vi.mocked(apiClient.post).mock.calls[0] as [string, FormData];
        expect(formData.get('evaluationType')).toBe('EXAMEN');
        expect(screen.getByText('Archivo no permitido por política')).toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(5000);
            await Promise.resolve();
        });

        expect(screen.queryByText('Archivo no permitido por política')).not.toBeInTheDocument();
    });

    it('no debe enviar automáticamente al seleccionar archivo; solo al pulsar Enviar examen', async () => {
        const { container } = render(<CourseAssignmentPanel activeCourseId={101} enrolledList={mockEnrolledList} />);
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;

        const file = new File(['payload'], 'trabajo-auto.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        fireEvent.change(input, { target: { files: [file] } });

        expect(apiClient.post).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /Enviar examen/i }));

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledTimes(1);
        });
    });
});
