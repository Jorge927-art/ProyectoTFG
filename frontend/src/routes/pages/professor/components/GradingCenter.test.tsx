import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { GradingCenter } from './GradingCenter';
import { useGradingCenter } from './useGradingCenter';
import { downloadDocumentSecure } from '../../../../services/documentService';

import type { TaughtCourse } from '../../../../services/userDomains';
import type { StudentPerformanceDTO } from '../../../../services/evaluationService';
import type { DocumentMetadata } from '../../../../services/documentService';

vi.mock('./useGradingCenter', () => ({
    useGradingCenter: vi.fn()
}));

vi.mock('../../../../services/documentService', () => ({
    downloadDocumentSecure: vi.fn()
}));

vi.mock('axios', async (importOriginal) => {
    const actual = await importOriginal<typeof import('axios')>();
    return {
        ...actual,
        isAxiosError: vi.fn((err: unknown) => Boolean((err as { isAxiosError?: boolean })?.isAxiosError)),
    };
});

describe('GradingCenter', () => {
    const mockOnCourseChange = vi.fn();
    const mockHandleFileSelection = vi.fn();
    const mockHandleSendDocument = vi.fn(async () => undefined);
    const mockHandleSelectStudent = vi.fn(async () => undefined);
    const mockHandleSelectStudentById = vi.fn(async () => undefined);
    const mockHandleGradeSubmit = vi.fn(async (event: React.FormEvent) => {
        event.preventDefault();
    });
    const mockSetEvaluationTitle = vi.fn();
    const mockSetScore = vi.fn();
    const mockSetFeedback = vi.fn();
    const mockSetFinalExamWeight = vi.fn();
    const scrollIntoViewSpy = vi.fn();
    const mockHandleCalculateFinalGrade = vi.fn();

    const availableCourses: TaughtCourse[] = [
        { id: 1, title: 'Backend Avanzado', category: 'Programacion', studentsCount: 20, averageProgress: 78 },
        { id: 2, title: 'Arquitectura de Software', category: 'Ingenieria', studentsCount: 15, averageProgress: 82 }
    ];

    const mockStudent: StudentPerformanceDTO = {
        userId: 10,
        username: 'ana',
        email: 'ana@uni.es',
        individualGrade: 8.2,
        groupAverage: 7.6,
        enrollmentId: 301
    };

    const mockStudentDocument: DocumentMetadata = {
        documentid: 777,
        filename: 'documents/actividad-final.pdf',
        originalname: 'actividad-final.pdf',
        upload_date: '2026-07-24T10:00:00Z',
        sender: {
            userId: 10,
            username: 'ana',
            email: 'ana@uni.es',
            role: 'STUDENT'
        },
        receiver: {
            userId: 1,
            username: 'profesor',
            email: 'profe@uni.es',
            role: 'PROFESSOR'
        },
        folder_type: 'RECEIVED',
        isRead: false
    };

    const baseHookReturn: ReturnType<typeof useGradingCenter> = {
        students: [],
        selectedStudent: null,
        studentGrades: [],
        studentDocuments: [],
        documentsLoadedFromCourseFallback: false,
        loadingData: false,
        loadingDocs: false,
        isSubmitting: false,
        gradeSubmitFeedbackStatus: null,
        errorMessage: '',
        successMessage: '',
        evaluationTitle: 'Trabajo Académico Escrito',
        setEvaluationTitle: mockSetEvaluationTitle,
        score: '',
        setScore: mockSetScore,
        feedback: '',
        setFeedback: mockSetFeedback,
        finalExamWeight: '60',
        setFinalExamWeight: mockSetFinalExamWeight,
        calculatorMessage: '',
        calculatorMessageType: null,
        calculatorSnapshot: {
            workGrades: [],
            workAverage: null,
            examGrade: null,
            finalCourseGrade: null,
        },
        selectedFile: null,
        isUploadingDocument: false,
        handleFileSelection: mockHandleFileSelection,
        handleSendDocument: mockHandleSendDocument,
        handleSelectStudent: mockHandleSelectStudent,
        handleSelectStudentById: mockHandleSelectStudentById,
        handleCalculateFinalGrade: mockHandleCalculateFinalGrade,
        handleGradeSubmit: mockHandleGradeSubmit
    };

    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
            configurable: true,
            value: scrollIntoViewSpy,
        });
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
            students: [mockStudent]
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
        expect(screen.getByText('Selecciona un alumno para habilitar la calculadora de nota final.')).toBeInTheDocument();
    });

    it('procesa seleccion de archivo PDF desde el input', () => {
        const selectedFile = new File(['pdf'], 'entrega.pdf', { type: 'application/pdf' });
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: mockStudent
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        const fileInput = screen.getByLabelText('Documento (PDF)');
        fireEvent.change(fileInput, { target: { files: [selectedFile] } });

        expect(mockHandleFileSelection).toHaveBeenCalledWith(selectedFile);
    });

    it('envia documento al pulsar el boton de envio', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: mockStudent,
            selectedFile: new File(['pdf'], 'entrega.pdf', { type: 'application/pdf' })
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        fireEvent.click(screen.getByRole('button', { name: 'Enviar al alumno seleccionado' }));
        expect(mockHandleSendDocument).toHaveBeenCalledTimes(1);
    });

    it('descarga documento de la lista de entregas del alumno', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: mockStudent,
            studentDocuments: [mockStudentDocument]
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
            selectedStudent: mockStudent,
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
            selectedStudent: mockStudent,
            loadingDocs: true
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        expect(screen.getByText('Cargando archivos...')).toBeInTheDocument();
    });

    it('muestra aviso contextual cuando la recepcion se obtiene por fallback de asignatura', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: mockStudent,
            documentsLoadedFromCourseFallback: true,
            studentDocuments: [mockStudentDocument],
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        expect(screen.getByText('Vista recuperada por verificacion de asignatura para evitar perdida de entregas en datos legacy.')).toBeInTheDocument();
    });

    it('deshabilita envio de documento cuando esta subiendo archivo', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: mockStudent,
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
            selectedStudent: mockStudent,
            isSubmitting: true
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        const submitButton = screen.getByRole('button', { name: 'Enviando nota...' });
        expect(submitButton).toBeDisabled();
    });

    it('pinta el boton de enviar calificacion en verde tras envio exitoso', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: mockStudent,
            gradeSubmitFeedbackStatus: 'success'
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        const submitButton = screen.getByRole('button', { name: 'Enviar calificacion' });
        expect(submitButton.className).toContain('bg-emerald-600');
    });

    it('pinta el boton de enviar calificacion en rojo cuando falla el envio', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: mockStudent,
            gradeSubmitFeedbackStatus: 'error'
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        const submitButton = screen.getByRole('button', { name: 'Enviar calificacion' });
        expect(submitButton.className).toContain('bg-red-600');
    });

    it('propaga cambios de campos de evaluacion al hook', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: mockStudent
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        fireEvent.change(screen.getByLabelText('Tipo Evaluacion'), { target: { value: 'Examen Final' } });
        fireEvent.change(screen.getByLabelText('Calificacion (0-10)'), { target: { value: '9.2' } });
        fireEvent.change(screen.getByLabelText('Feedback del profesor'), { target: { value: 'Excelente nivel' } });

        expect(mockSetEvaluationTitle).toHaveBeenCalledWith('Examen Final');
        expect(mockSetScore).toHaveBeenCalledWith('9.2');
        expect(mockSetFeedback).toHaveBeenCalledWith('Excelente nivel');
    });

    it('muestra el subpanel de calculadora con resumen de notas detectadas', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: mockStudent,
            calculatorSnapshot: {
                workGrades: [{ gradeId: 1, title: 'Trabajo 1', score: '7.0' }],
                workAverage: 7.0,
                examGrade: 8.0,
                finalCourseGrade: null,
            }
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        expect(screen.getByText('Calculadora nota final')).toBeInTheDocument();
        expect(screen.getByText('7.0 / 10')).toBeInTheDocument();
        expect(screen.getByText('8.0 / 10')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('Previsualización de la fórmula')).toBeInTheDocument();
        expect(screen.getByText('Nota final = trabajos 40% + examen 60%')).toBeInTheDocument();
        expect(screen.getByText('7.0 x 40% + 8.0 x 60%')).toBeInTheDocument();
    });

    it('propaga cambios del porcentaje y lanza el cálculo explícito al pulsar el botón', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: mockStudent,
            calculatorSnapshot: {
                workGrades: [{ gradeId: 1, title: 'Trabajo 1', score: '7.0' }],
                workAverage: 7.0,
                examGrade: 8.0,
                finalCourseGrade: null,
            }
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        fireEvent.change(screen.getByLabelText('Peso del examen en la nota final (40%-100%)'), { target: { value: '70' } });
        fireEvent.click(screen.getByRole('button', { name: 'Calcular nota final' }));

        expect(mockSetFinalExamWeight).toHaveBeenCalledWith('70');
        expect(mockHandleCalculateFinalGrade).toHaveBeenCalledTimes(1);
    });

    it('muestra el mensaje informativo de la calculadora cuando el hook lo expone', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: mockStudent,
            calculatorMessage: 'Nota final calculada y trasladada al panel de Calificaciones.',
            calculatorMessageType: 'success',
            calculatorSnapshot: {
                workGrades: [{ gradeId: 1, title: 'Trabajo 1', score: '7.0' }],
                workAverage: 7.0,
                examGrade: 8.0,
                finalCourseGrade: null,
            }
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        expect(screen.getByText('Nota final calculada y trasladada al panel de Calificaciones.')).toBeInTheDocument();
    });

    it('no permite introducir porcentaje cuando no hay trabajos detectados', () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: mockStudent,
            calculatorSnapshot: {
                workGrades: [],
                workAverage: null,
                examGrade: 8.0,
                finalCourseGrade: null,
            }
        } as ReturnType<typeof useGradingCenter>);

        render(<GradingCenter courseId={1} availableCourses={availableCourses} onCourseChange={mockOnCourseChange} />);

        expect(screen.queryByLabelText('Peso del examen en la nota final (40%-100%)')).not.toBeInTheDocument();
        expect(screen.getByText('Si no hay trabajos registrados, la calculadora utilizará directamente la nota del examen y no pedirá porcentaje.')).toBeInTheDocument();
    });

    it('en modo autoFocusDocuments resalta y centra la primera entrega disponible', async () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            selectedStudent: mockStudent,
            studentDocuments: [mockStudentDocument]
        } as ReturnType<typeof useGradingCenter>);

        render(
            <GradingCenter
                courseId={1}
                availableCourses={availableCourses}
                onCourseChange={mockOnCourseChange}
                autoFocusDocuments={true}
            />
        );

        const row = await screen.findByTestId('grading-document-row-777');
        expect(row.className).toContain('border-amber-300');
        expect(scrollIntoViewSpy).toHaveBeenCalled();
    });

    it('preselecciona alumno objetivo cuando llega focusStudentUserId', async () => {
        vi.mocked(useGradingCenter).mockReturnValue({
            ...baseHookReturn,
            students: [mockStudent],
            selectedStudent: null
        } as ReturnType<typeof useGradingCenter>);

        render(
            <GradingCenter
                courseId={1}
                availableCourses={availableCourses}
                onCourseChange={mockOnCourseChange}
                autoFocusDocuments={true}
                focusStudentUserId={10}
            />
        );

        expect(mockHandleSelectStudentById).toHaveBeenCalledWith(10);
    });

});