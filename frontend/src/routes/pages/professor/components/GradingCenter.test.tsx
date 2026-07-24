import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { GradingCenter } from './GradingCenter';
import { useGradingCenter } from './useGradingCenter';
import { downloadDocumentSecure } from '../../../../services/documentService';
import type { TaughtCourse } from '../../../../services/userDomains';

vi.mock('./useGradingCenter', () => ({
    useGradingCenter: vi.fn()
}));

vi.mock('../../../../services/documentService', () => ({
    downloadDocumentSecure: vi.fn()
}));

describe('GradingCenter', () => {
    const mockOnCourseChange = vi.fn();
    const mockHandleFileSelection = vi.fn();
    const mockHandleSendDocument = vi.fn();
    const mockHandleSelectStudentById = vi.fn();
    const mockHandleGradeSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const mockSetEvaluationTitle = vi.fn();
    const mockSetScore = vi.fn();
    const mockSetFeedback = vi.fn();

    const availableCourses: TaughtCourse[] = [
        { id: 1, title: 'Backend Avanzado', category: 'Programacion', studentsCount: 20, averageProgress: 78 },
        { id: 2, title: 'Arquitectura de Software', category: 'Ingenieria', studentsCount: 15, averageProgress: 82 }
    ];

    const baseHookReturn = {
        students: [],
        selectedStudent: null,
        studentDocuments: [],
        loadingData: false,
        loadingDocs: false,
        isSubmitting: false,
        errorMessage: '',
        successMessage: '',
        evaluationTitle: 'Trabajo Académico Escrito',
        setEvaluationTitle: mockSetEvaluationTitle,
        score: '',
        setScore: mockSetScore,
        feedback: '',
        setFeedback: mockSetFeedback,
        selectedFile: null,
        isUploadingDocument: false,
        handleFileSelection: mockHandleFileSelection,
        handleSendDocument: mockHandleSendDocument,
        handleSelectStudentById: mockHandleSelectStudentById,
        handleGradeSubmit: mockHandleGradeSubmit
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useGradingCenter).mockReturnValue(baseHookReturn as ReturnType<typeof useGradingCenter>);
    });

    it('renderiza cursos y notifica cambios de selector de asignatura', () => {
        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        const courseSelector = screen.getByLabelText('Asignatura del profesor');
        expect(screen.getByRole('option', { name: 'Backend Avanzado' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Arquitectura de Software' })).toBeInTheDocument();

        fireEvent.change(courseSelector, { target: { value: '2' } });
        expect(mockOnCourseChange).toHaveBeenCalledWith(2);

        fireEvent.change(courseSelector, { target: { value: '' } });
        expect(mockOnCourseChange).toHaveBeenCalledWith(null);
    });

    it('deshabilita selector de alumno cuando no hay asignatura seleccionada', () => {
        render(<GradingCenter courseId={null} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        const studentSelector = screen.getByLabelText('Alumno de la asignatura seleccionada');
        expect(studentSelector).toBeDisabled();
        expect(screen.getByText('Primero selecciona asignatura')).toBeInTheDocument();
    });

    it('selecciona alumno y ejecuta handleSelectStudentById', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            students: [{ userId: 10, username: 'ana', email: 'ana@uni.es' }]
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        const studentSelector = screen.getByLabelText('Alumno de la asignatura seleccionada');
        fireEvent.change(studentSelector, { target: { value: '10' } });

        expect(mockHandleSelectStudentById).toHaveBeenCalledWith(10);
    });

    it('muestra paneles de espera cuando no hay alumno seleccionado', () => {
        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        expect(screen.getByText('Selecciona una asignatura y un alumno para habilitar el envio y la recepcion de documentos.')).toBeInTheDocument();
        expect(screen.getByText('Selecciona un alumno para habilitar el envio de notas.')).toBeInTheDocument();
    });

    it('procesa seleccion de archivo PDF desde el input', () => {
        const selectedFile = new File(['pdf'], 'entrega.pdf', { type: 'application/pdf' });
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: { userId: 10, username: 'ana', email: 'ana@uni.es' }
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        const fileInput = screen.getByLabelText('Documento (PDF)');
        fireEvent.change(fileInput, { target: { files: [selectedFile] } });

        expect(mockHandleFileSelection).toHaveBeenCalledWith(selectedFile);
    });

    it('envia documento al pulsar el boton de envio', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: { userId: 10, username: 'ana', email: 'ana@uni.es' },
            selectedFile: new File(['pdf'], 'entrega.pdf', { type: 'application/pdf' })
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        fireEvent.click(screen.getByRole('button', { name: 'Enviar al alumno seleccionado' }));
        expect(mockHandleSendDocument).toHaveBeenCalledTimes(1);
    });

    it('descarga documento de la lista de entregas del alumno', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: { userId: 10, username: 'ana', email: 'ana@uni.es' },
            studentDocuments: [
                {
                    documentid: 777,
                    originalname: 'actividad-final.pdf'
                }
            ]
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        const documentName = screen.getByText('actividad-final.pdf');
        const documentRow = documentName.closest('div');

        expect(documentRow).not.toBeNull();

        const downloadButton = within(documentRow as HTMLElement).getByRole('button');
        fireEvent.click(downloadButton);
        expect(downloadDocumentSecure).toHaveBeenCalledWith(777, 'actividad-final.pdf');
    });

    it('envia calificacion mediante submit del formulario', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: { userId: 10, username: 'ana', email: 'ana@uni.es' },
            score: '8.5',
            feedback: 'Buen trabajo'
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        fireEvent.submit(screen.getByRole('button', { name: 'Enviar calificacion' }).closest('form') as HTMLFormElement);
        expect(mockHandleGradeSubmit).toHaveBeenCalledTimes(1);
    });

    it('muestra alerta de error y de exito cuando el hook las expone', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            errorMessage: 'Error al procesar la evaluacion',
            successMessage: 'Documento enviado correctamente'
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        expect(screen.getByText('Error al procesar la evaluacion')).toBeInTheDocument();
        expect(screen.getByText('Documento enviado correctamente')).toBeInTheDocument();
    });

    it('muestra estado de carga de documentos del alumno', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: { userId: 10, username: 'ana', email: 'ana@uni.es' },
            loadingDocs: true
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        expect(screen.getByText('Cargando archivos...')).toBeInTheDocument();
    });

    it('deshabilita envio de documento cuando esta subiendo archivo', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: { userId: 10, username: 'ana', email: 'ana@uni.es' },
            selectedFile: new File(['pdf'], 'entrega.pdf', { type: 'application/pdf' }),
            isUploadingDocument: true
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        const sendButton = screen.getByRole('button', { name: 'Enviando documento...' });
        expect(sendButton).toBeDisabled();
    });

    it('deshabilita submit de calificacion durante el envio de nota', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: { userId: 10, username: 'ana', email: 'ana@uni.es' },
            isSubmitting: true
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        const submitButton = screen.getByRole('button', { name: 'Enviando nota...' });
        expect(submitButton).toBeDisabled();
    });

    it('propaga cambios de campos de evaluacion al hook', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: { userId: 10, username: 'ana', email: 'ana@uni.es' }
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        fireEvent.change(screen.getByLabelText('Tipo Evaluacion'), { target: { value: 'Examen Final' } });
        fireEvent.change(screen.getByLabelText('Calificacion (0-10)'), { target: { value: '9.2' } });
        fireEvent.change(screen.getByLabelText('Feedback del profesor'), { target: { value: 'Excelente nivel' } });

        expect(mockSetEvaluationTitle).toHaveBeenCalledWith('Examen Final');
        expect(mockSetScore).toHaveBeenCalledWith('9.2');
        expect(mockSetFeedback).toHaveBeenCalledWith('Excelente nivel');
    });
});