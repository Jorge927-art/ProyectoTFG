import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGradingCenter } from './useGradingCenter';
import {
    getActiveStudentsByCourse,
    getTeacherEnrollmentGrades,
    submitStudentGrade
} from '../../../../services/evaluationService';
import {
    getDocumentsByEnrollment,
    getSentDocumentsByEnrollment,
    uploadProfessorDocument
} from '../../../../services/documentService';
import type { DocumentMetadata } from '../../../../services/documentService';

const mockRefreshNotifications = vi.fn();

vi.mock('../../../../services/evaluationService', () => ({
    getActiveStudentsByCourse: vi.fn(),
    getTeacherEnrollmentGrades: vi.fn(),
    submitStudentGrade: vi.fn()
}));

vi.mock('../../../../services/documentService', () => ({
    getDocumentsByEnrollment: vi.fn(),
    getSentDocumentsByEnrollment: vi.fn(),
    uploadProfessorDocument: vi.fn()
}));

vi.mock('../../../../components/ui/globalNotificationBell/useNotifications', () => ({
    NOTIFICATIONS_REFRESH_EVENT: 'global-notifications:refresh',
    useNotifications: () => ({
        refreshNotifications: mockRefreshNotifications
    })
}));

describe('useGradingCenter', () => {
    const mockStudents = [
        {
            userId: 11,
            username: 'ana',
            email: 'ana@uni.es',
            individualGrade: 7.2,
            groupAverage: 6.8,
            enrollmentId: 301
        },
        {
            userId: 12,
            username: 'luis',
            email: 'luis@uni.es',
            individualGrade: 8.5,
            groupAverage: 7.1
        }
    ];

    const mockDocuments: DocumentMetadata[] = [
        {
            documentid: 1001,
            filename: 'doc_1001.pdf',
            originalname: 'actividad-1.pdf',
            upload_date: '2026-07-24T10:00:00Z',
            sender: { userId: 1, username: 'alumno', email: 'alumno@uni.es', role: 'STUDENT' },
            receiver: { userId: 2, username: 'profesor', email: 'profe@uni.es', role: 'PROFESSOR' },
            folder_type: 'RECEIVED',
            isRead: false
        }
    ];
    const mockSentExamDocuments: DocumentMetadata[] = [
        {
            ...mockDocuments[0],
            documentid: 1002,
            originalname: 'examen-final.pdf',
            evaluation_type: 'EXAMEN',
            sender: { userId: 2, username: 'profesor', email: 'profe@uni.es', role: 'PROFESSOR' },
            receiver: { userId: 11, username: 'ana', email: 'ana@uni.es', role: 'STUDENT' },
            folder_type: 'SENT',
            isRead: true,
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getActiveStudentsByCourse).mockResolvedValue(mockStudents);
        vi.mocked(getTeacherEnrollmentGrades).mockResolvedValue([
            { gradeId: 1, title: 'Trabajo 1', score: '7.0' },
            { gradeId: 2, title: 'Trabajo 2', score: '9.0' },
            { gradeId: 3, title: 'Examen Final', score: '8.0' }
        ]);
        vi.mocked(getDocumentsByEnrollment).mockResolvedValue(mockDocuments);
        vi.mocked(getSentDocumentsByEnrollment).mockResolvedValue(mockSentExamDocuments);
        vi.mocked(uploadProfessorDocument).mockResolvedValue({
            message: 'ok',
            filename: 'doc.pdf',
            originalname: 'doc.pdf'
        });
        vi.mocked(submitStudentGrade).mockResolvedValue({ success: true, message: 'ok' });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('carga alumnado al recibir un courseId válido', async () => {
        const { result } = renderHook(() => useGradingCenter(10));

        await waitFor(() => {
            expect(result.current.loadingData).toBe(false);
            expect(result.current.students).toEqual(mockStudents);
        });

        expect(getActiveStudentsByCourse).toHaveBeenCalledWith(10);
    });

    it('limpia estado principal cuando courseId es nulo', async () => {
        const { result } = renderHook(() => useGradingCenter(null));

        await waitFor(() => {
            expect(result.current.students).toEqual([]);
            expect(result.current.selectedStudent).toBeNull();
            expect(result.current.studentDocuments).toEqual([]);
        });

        expect(getActiveStudentsByCourse).not.toHaveBeenCalled();
    });

    it('selecciona alumno por id y carga documentos con enrollmentId cuando existe', async () => {
        const { result } = renderHook(() => useGradingCenter(10));

        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        expect(result.current.selectedStudent?.userId).toBe(11);
        expect(getDocumentsByEnrollment).toHaveBeenCalledWith(301);
        expect(getSentDocumentsByEnrollment).toHaveBeenCalledWith(301);
        expect(getTeacherEnrollmentGrades).toHaveBeenCalledWith(301);
        expect(result.current.studentDocuments).toEqual(mockDocuments);
        expect(result.current.sentExamDocuments).toEqual(mockSentExamDocuments);
        expect(result.current.studentGrades).toHaveLength(3);
    });

    it('conserva las entregas recibidas si falla temporalmente la consulta de enviados', async () => {
        vi.mocked(getSentDocumentsByEnrollment).mockRejectedValueOnce(new Error('sent endpoint unavailable'));
        const { result } = renderHook(() => useGradingCenter(10));

        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        expect(result.current.studentDocuments).toEqual(mockDocuments);
        expect(result.current.sentExamDocuments).toEqual([]);
        expect(result.current.errorMessage).toBe('');
    });

    it('refresca las entregas recibidas al recibir el evento global de notificaciones', async () => {
        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });
        vi.mocked(getDocumentsByEnrollment).mockClear();

        await act(async () => {
            window.dispatchEvent(new Event('global-notifications:refresh'));
        });

        await waitFor(() => {
            expect(getDocumentsByEnrollment).toHaveBeenCalledWith(301);
        });
    });

    it('vacia seleccion y documentos si el id de alumno no existe', async () => {
        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(999);
        });

        expect(result.current.selectedStudent).toBeNull();
        expect(result.current.studentDocuments).toEqual([]);
    });

    it('valida extension del archivo en handleFileSelection', () => {
        const { result } = renderHook(() => useGradingCenter(10));

        act(() => {
            result.current.handleFileSelection(new File(['x'], 'notas.txt', { type: 'text/plain' }));
        });

        expect(result.current.selectedFile).toBeNull();
        expect(result.current.errorMessage).toBe('Solo se admiten archivos PDF para trabajos y exámenes.');

        const pdf = new File(['pdf'], 'entrega.pdf', { type: 'application/pdf' });
        act(() => {
            result.current.handleFileSelection(pdf);
        });

        expect(result.current.selectedFile).toEqual(pdf);
    });

    it('bloquea envio de documento cuando faltan datos requeridos', async () => {
        const { result } = renderHook(() => useGradingCenter(10));

        await act(async () => {
            await result.current.handleSendDocument();
        });

        expect(result.current.errorMessage).toBe('Selecciona asignatura y archivo antes de enviar.');
        expect(uploadProfessorDocument).not.toHaveBeenCalled();
    });

    it('envia documento correctamente y refresca notificaciones', async () => {
        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        const file = new File(['pdf'], 'guia.pdf', { type: 'application/pdf' });
        act(() => {
            result.current.handleFileSelection(file);
        });

        await act(async () => {
            await result.current.handleSendDocument();
        });

        expect(uploadProfessorDocument).toHaveBeenCalledWith(file, 10, 11, 'EXAMEN');
        expect(result.current.successMessage).toBe('Documento enviado a ana correctamente.');
        expect(result.current.selectedFile).toBeNull();
        expect(mockRefreshNotifications).not.toHaveBeenCalled();
        expect(result.current.isUploadingDocument).toBe(false);
    });

    it('valida rango de nota antes de enviar calificacion', async () => {
        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        act(() => {
            result.current.setScore('15');
        });

        const preventDefault = vi.fn();
        await act(async () => {
            await result.current.handleGradeSubmit({ preventDefault } as unknown as React.FormEvent);
        });

        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(result.current.errorMessage).toBe('La nota debe ser un valor numérico entre 0 y 10.');
        expect(submitStudentGrade).not.toHaveBeenCalled();
    });

    it('bloquea el envio cuando la aclaracion del profesor supera 300 caracteres', async () => {
        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        act(() => {
            result.current.setScore('8.0');
            result.current.setFeedback('a'.repeat(301));
        });

        await act(async () => {
            await result.current.handleGradeSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
        });

        expect(result.current.errorMessage).toBe('La aclaración del profesor no puede superar 300 caracteres.');
        expect(submitStudentGrade).not.toHaveBeenCalled();
    });

    it('envia calificacion con enrollmentId y refresca datos del curso', async () => {
        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        act(() => {
            result.current.setEvaluationTitle('Examen Final');
            result.current.setScore('8.7');
            result.current.setFeedback('Buen rendimiento');
        });

        await act(async () => {
            await result.current.handleGradeSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
        });

        expect(submitStudentGrade).toHaveBeenCalledWith({
            enrollmentId: 301,
            title: 'Examen Final',
            score: 8.7,
            feedback: 'Buen rendimiento'
        });
        expect(result.current.successMessage).toContain('Calificación registrada con éxito');
        expect(result.current.gradeSubmitFeedbackStatus).toBe('success');
        expect(result.current.score).toBe('');
        expect(result.current.feedback).toBe('');
        expect(getActiveStudentsByCourse).toHaveBeenCalledTimes(2);
        expect(mockRefreshNotifications).toHaveBeenCalledTimes(1);
        expect(result.current.isSubmitting).toBe(false);
    });

    it('muestra error claro si falla la carga inicial de alumnado', async () => {
        vi.mocked(getActiveStudentsByCourse).mockRejectedValueOnce(new Error('boom'));

        const { result } = renderHook(() => useGradingCenter(10));

        await waitFor(() => {
            expect(result.current.loadingData).toBe(false);
            expect(result.current.errorMessage).toBe('No se pudo cargar el alumnado de la asignatura seleccionada.');
            expect(result.current.students).toEqual([]);
        });
    });

    it('limpia automáticamente la alarma de error tras unos segundos', async () => {
        vi.mocked(getActiveStudentsByCourse).mockRejectedValueOnce(new Error('boom'));

        const { result } = renderHook(() => useGradingCenter(10));

        await waitFor(() => {
            expect(result.current.errorMessage).toBe('No se pudo cargar el alumnado de la asignatura seleccionada.');
        });

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 6200));
        });

        await waitFor(() => {
            expect(result.current.errorMessage).toBe('');
        });
    }, 12000);

    it('muestra error si falla la carga de documentos del alumno seleccionado', async () => {
        vi.mocked(getDocumentsByEnrollment).mockRejectedValueOnce(new Error('docs-error'));

        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        expect(result.current.errorMessage).toBe('No se pudieron recuperar las entregas físicas de este estudiante.');
        expect(result.current.loadingDocs).toBe(false);
    });

    it('no consulta documentos cuando el alumno no tiene enrollmentId', async () => {
        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(12);
        });

        expect(getDocumentsByEnrollment).not.toHaveBeenCalledWith(12);
        expect(result.current.studentDocuments).toEqual([]);
    });

    it('permite limpiar archivo seleccionado con valor null', () => {
        const { result } = renderHook(() => useGradingCenter(10));

        act(() => {
            result.current.handleFileSelection(new File(['pdf'], 'tmp.pdf', { type: 'application/pdf' }));
        });
        expect(result.current.selectedFile).not.toBeNull();

        act(() => {
            result.current.handleFileSelection(null);
        });

        expect(result.current.selectedFile).toBeNull();
    });

    it('muestra error si falla el envio de documento', async () => {
        vi.mocked(uploadProfessorDocument).mockRejectedValueOnce(new Error('upload-error'));

        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        act(() => {
            result.current.handleFileSelection(new File(['pdf'], 'guia.pdf', { type: 'application/pdf' }));
        });

        await act(async () => {
            await result.current.handleSendDocument();
        });

        expect(result.current.errorMessage).toBe('No se pudo enviar el documento con la configuración seleccionada.');
        expect(result.current.isUploadingDocument).toBe(false);
    });

    it('valida calificacion obligatoria cuando no hay score', async () => {
        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        await act(async () => {
            await result.current.handleGradeSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
        });

        expect(result.current.errorMessage).toBe('Por favor, introduce una calificación válida.');
    });

    it('calcula la nota final ponderada, redondea a un decimal y la traslada al formulario', async () => {
        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        act(() => {
            result.current.setFinalExamWeight('60');
            result.current.handleCalculateFinalGrade();
        });

        expect(result.current.evaluationTitle).toBe('Nota Final Asignatura');
        expect(result.current.score).toBe('8.0');
        expect(result.current.feedback).toBe('Media trabajos 8.0 + examen 8.0 con ponderación 60%');
        expect(result.current.calculatorMessage).toBe('Nota final calculada y trasladada al panel de Calificaciones.');
        expect(result.current.calculatorMessageType).toBe('success');
    });

    it('usa directamente la nota del examen cuando no hay trabajos registrados', async () => {
        vi.mocked(getTeacherEnrollmentGrades).mockResolvedValueOnce([
            { gradeId: 3, title: 'Examen Final', score: '8.0' }
        ]);

        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        act(() => {
            result.current.handleCalculateFinalGrade();
        });

        expect(result.current.evaluationTitle).toBe('Nota Final Asignatura');
        expect(result.current.score).toBe('8.0');
        expect(result.current.calculatorMessage).toBe('No hay trabajos registrados. Se usará directamente la nota del examen.');
        expect(result.current.calculatorMessageType).toBe('info');
    });

    it('bloquea el cálculo si falta la nota de examen final', async () => {
        vi.mocked(getTeacherEnrollmentGrades).mockResolvedValueOnce([
            { gradeId: 1, title: 'Trabajo 1', score: '7.0' },
            { gradeId: 2, title: 'Trabajo 2', score: '9.0' }
        ]);

        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        act(() => {
            result.current.handleCalculateFinalGrade();
        });

        expect(result.current.calculatorMessage).toBe('No se puede calcular la nota final porque falta la nota de Examen Final.');
        expect(result.current.calculatorMessageType).toBe('error');
        expect(result.current.evaluationTitle).not.toBe('Nota Final Asignatura');
    });

    it('muestra el mensaje de backend cuando submitStudentGrade devuelve error de Axios', async () => {
        const backendErrorMessage = 'La Nota Final de la Asignatura ya fue enviada. Es definitiva y no puede modificarse.';
        vi.mocked(submitStudentGrade).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                data: {
                    error: backendErrorMessage
                }
            }
        });

        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        act(() => {
            result.current.setEvaluationTitle('Nota Final Asignatura');
            result.current.setScore('7.0');
        });

        await act(async () => {
            await result.current.handleGradeSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
        });

        expect(result.current.errorMessage).toBe(backendErrorMessage);
        expect(result.current.gradeSubmitFeedbackStatus).toBe('error');
        expect(result.current.isSubmitting).toBe(false);
    });

    it('muestra error perimetral cuando falla submitStudentGrade', async () => {
        vi.mocked(submitStudentGrade).mockRejectedValueOnce(new Error('grade-error'));

        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        act(() => {
            result.current.setScore('7.0');
        });

        await act(async () => {
            await result.current.handleGradeSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
        });

        expect(result.current.errorMessage).toBe('Error crítico perimetral: No tienes autorización o la sesión expiró.');
        expect(result.current.gradeSubmitFeedbackStatus).toBe('error');
        expect(result.current.isSubmitting).toBe(false);
    });

    it('limpia automáticamente el feedback visual de éxito en el botón de nota', async () => {
        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        act(() => {
            result.current.setScore('9.1');
        });

        await act(async () => {
            await result.current.handleGradeSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
        });

        expect(result.current.gradeSubmitFeedbackStatus).toBe('success');

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 3600));
        });

        expect(result.current.gradeSubmitFeedbackStatus).toBeNull();
    }, 12000);

    it('limpia automáticamente el feedback visual de error en el botón de nota', async () => {
        vi.mocked(submitStudentGrade).mockRejectedValueOnce(new Error('grade-error'));

        const { result } = renderHook(() => useGradingCenter(10));
        await waitFor(() => expect(result.current.loadingData).toBe(false));

        await act(async () => {
            await result.current.handleSelectStudentById(11);
        });

        act(() => {
            result.current.setScore('7.4');
        });

        await act(async () => {
            await result.current.handleGradeSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
        });

        expect(result.current.gradeSubmitFeedbackStatus).toBe('error');

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 3600));
        });

        expect(result.current.gradeSubmitFeedbackStatus).toBeNull();
    }, 12000);
});