import { useState, useEffect } from 'react';
// Usamos 'import type' para satisfacer las reglas estrictas de TypeScript de tu proyecto
import type { 
    StudentPerformanceDTO,
    CourseGradeDTO
} from '../../../../services/evaluationService';
import type { DocumentMetadata } from '../../../../services/documentService';
import axios from 'axios';

import { 
    getActiveStudentsByCourse, 
    getTeacherEnrollmentGrades,
    submitStudentGrade 
} from '../../../../services/evaluationService';
import { getDocumentsByEnrollment, getReceivedDocumentsByCourse, uploadProfessorDocument } from '../../../../services/documentService';
import { useNotifications } from '../../../../components/ui/globalNotificationBell/useNotifications';

const ERROR_MESSAGE_AUTO_DISMISS_MS = 6000;
const GRADE_SUBMIT_FEEDBACK_AUTO_DISMISS_MS = 3500;

type GradeSubmitFeedbackStatus = 'success' | 'error' | null;
type CalculatorMessageType = 'success' | 'info' | 'error' | null;

const roundToSingleDecimal = (value: number) => Math.round(value * 10) / 10;

const isFinalCourseGradeTitle = (title: string) => title.trim().toLowerCase() === 'nota final asignatura';

const isExamGradeTitle = (title: string) => {
    const normalized = title.trim().toLowerCase();

    if (
        normalized.includes('trabajo')
        || normalized.includes('proyecto')
        || normalized.includes('actividad')
        || normalized.includes('práctica')
        || normalized.includes('practica')
    ) {
        return false;
    }

    return normalized.includes('examen')
        || normalized.includes('evaluación final')
        || normalized.includes('evaluacion final')
        || normalized === 'final';
};

const buildCalculatorSnapshot = (grades: CourseGradeDTO[]) => {
    const examGradeCandidates = grades.filter((grade) => isExamGradeTitle(grade.title));
    const finalCourseGradeCandidates = grades.filter((grade) => isFinalCourseGradeTitle(grade.title));
    const workGrades = grades.filter((grade) => !isExamGradeTitle(grade.title) && !isFinalCourseGradeTitle(grade.title));

    const examGrade = examGradeCandidates.length > 0
        ? Number(examGradeCandidates[examGradeCandidates.length - 1].score)
        : null;

    const finalCourseGrade = finalCourseGradeCandidates.length > 0
        ? Number(finalCourseGradeCandidates[finalCourseGradeCandidates.length - 1].score)
        : null;

    const workAverage = workGrades.length > 0
        ? roundToSingleDecimal(workGrades.reduce((sum, grade) => sum + Number(grade.score), 0) / workGrades.length)
        : null;

    return {
        workGrades,
        examGrade,
        workAverage,
        finalCourseGrade,
    };
};

export const useGradingCenter = (courseId: number | null) => {
    // Estados de datos encapsulados
    const [students, setStudents] = useState<StudentPerformanceDTO[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentPerformanceDTO | null>(null);
    const [studentGrades, setStudentGrades] = useState<CourseGradeDTO[]>([]);
    const [studentDocuments, setStudentDocuments] = useState<DocumentMetadata[]>([]);
    const [documentsLoadedFromCourseFallback, setDocumentsLoadedFromCourseFallback] = useState<boolean>(false);
    
    // Estados de carga de la API
    const [loadingData, setLoadingData] = useState<boolean>(false);
    const [loadingDocs, setLoadingDocs] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [gradeSubmitFeedbackStatus, setGradeSubmitFeedbackStatus] = useState<GradeSubmitFeedbackStatus>(null);
    
    // Gestión de mensajes de feedback para la UI
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Estado local del formulario de evaluación
    const [evaluationTitle, setEvaluationTitle] = useState<string>('Trabajo Académico Escrito');
    const [score, setScore] = useState<string>('');
    const [feedback, setFeedback] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploadingDocument, setIsUploadingDocument] = useState<boolean>(false);
    const [finalExamWeight, setFinalExamWeight] = useState<string>('60');
    const [calculatorMessage, setCalculatorMessage] = useState<string>('');
    const [calculatorMessageType, setCalculatorMessageType] = useState<CalculatorMessageType>(null);

    const { refreshNotifications } = useNotifications();

    useEffect(() => {
        if (!errorMessage) return;

        const timeoutId = window.setTimeout(() => {
            setErrorMessage('');
        }, ERROR_MESSAGE_AUTO_DISMISS_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [errorMessage]);

    useEffect(() => {
        if (!gradeSubmitFeedbackStatus) return;

        const timeoutId = window.setTimeout(() => {
            setGradeSubmitFeedbackStatus(null);
        }, GRADE_SUBMIT_FEEDBACK_AUTO_DISMISS_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [gradeSubmitFeedbackStatus]);


    // 1. Cargar alumnos y métricas globales del curso seleccionado
    useEffect(() => {
        if (!courseId) {
            setStudents([]);
            setSelectedStudent(null);
            setStudentGrades([]);
            setStudentDocuments([]);
            setDocumentsLoadedFromCourseFallback(false);
            setGradeSubmitFeedbackStatus(null);
            setFinalExamWeight('60');
            setCalculatorMessage('');
            setCalculatorMessageType(null);
            return;
        }

        const fetchCourseData = async () => {
            try {
                setLoadingData(true);
                setErrorMessage('');
                const studentsData = await getActiveStudentsByCourse(courseId);
                setStudents(studentsData);
            } catch {
                setStudents([]);
                setErrorMessage('No se pudo cargar el alumnado de la asignatura seleccionada.');
            } finally {
                setLoadingData(false);
            }

            setSelectedStudent(null); // Resetear selección al cambiar de asignatura
            setStudentGrades([]);
            setStudentDocuments([]);
            setDocumentsLoadedFromCourseFallback(false);
            setSelectedFile(null);
            setFinalExamWeight('60');
            setCalculatorMessage('');
            setCalculatorMessageType(null);
        };

        fetchCourseData();
    }, [courseId]);

    const fetchStudentDocuments = async (student: StudentPerformanceDTO) => {
        setStudentDocuments([]);
        setDocumentsLoadedFromCourseFallback(false);
        setErrorMessage('');

        try {
            setLoadingDocs(true);

            // Camino principal: resolver por enrollmentId cuando el dataset del curso lo expone.
            if (typeof student.enrollmentId === 'number') {
                const docsByEnrollment = await getDocumentsByEnrollment(student.enrollmentId);

                // Si el endpoint no devuelve datos, hacemos fallback por asignatura para evitar falsos vacíos.
                if (docsByEnrollment.length > 0 || !courseId) {
                    setDocumentsLoadedFromCourseFallback(false);
                    setStudentDocuments(docsByEnrollment);
                    return;
                }
            }

            // Fallback robusto: cargar recibidos por asignatura y filtrar por el alumno emisor.
            if (!courseId) {
                setDocumentsLoadedFromCourseFallback(false);
                setStudentDocuments([]);
                return;
            }

            const docsByCourse = await getReceivedDocumentsByCourse(courseId);
            const docsForStudent = docsByCourse.filter((doc) => doc.sender.userId === student.userId);
            setDocumentsLoadedFromCourseFallback(true);
            setStudentDocuments(docsForStudent);
        } catch {
            setDocumentsLoadedFromCourseFallback(false);
            setErrorMessage('No se pudieron recuperar las entregas físicas de este estudiante.');
        } finally {
            setLoadingDocs(false);
        }
    };

    const fetchStudentGrades = async (student: StudentPerformanceDTO) => {
        if (typeof student.enrollmentId !== 'number') {
            setStudentGrades([]);
            return;
        }

        try {
            const grades = await getTeacherEnrollmentGrades(student.enrollmentId);
            setStudentGrades(grades);
        } catch {
            setStudentGrades([]);
            setErrorMessage('No se pudieron recuperar las calificaciones actuales de este estudiante.');
        }
    };

    // 2. Sincronización [NotebookLM Punto 4]: Cargar documentos al seleccionar un alumno
    const handleSelectStudent = async (student: StudentPerformanceDTO) => {
        setSelectedStudent(student);
        setErrorMessage('');
        setSuccessMessage('');
        setGradeSubmitFeedbackStatus(null);
        setScore('');
        setFeedback('');
        setFinalExamWeight('60');
        setCalculatorMessage('');
        setCalculatorMessageType(null);
        await Promise.all([fetchStudentDocuments(student), fetchStudentGrades(student)]);
    };

    const handleSelectStudentById = async (studentId: number) => {
        const student = students.find((candidate) => candidate.userId === studentId);
        if (!student) {
            setSelectedStudent(null);
            setStudentDocuments([]);
            setDocumentsLoadedFromCourseFallback(false);
            return;
        }
        await handleSelectStudent(student);
    };

    const handleFileSelection = (file: File | null) => {
        setSuccessMessage('');
        if (!file) {
            setSelectedFile(null);
            return;
        }

        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            setErrorMessage('Solo se admiten archivos PDF para trabajos y exámenes.');
            setSelectedFile(null);
            return;
        }

        setErrorMessage('');
        setSelectedFile(file);
    };

    const handleSendDocument = async () => {
        if (!courseId || !selectedStudent || !selectedFile) {
            setErrorMessage('Selecciona asignatura, alumno y archivo antes de enviar.');
            return;
        }

        try {
            setIsUploadingDocument(true);
            setErrorMessage('');
            setSuccessMessage('');

            await uploadProfessorDocument(selectedFile, courseId, selectedStudent.userId);

            setSelectedFile(null);
            setSuccessMessage(`Documento enviado a ${selectedStudent.username} correctamente.`);
            refreshNotifications();
        } catch {
            setErrorMessage('No se pudo enviar el documento al alumno seleccionado.');
        } finally {
            setIsUploadingDocument(false);
        }
    };

    const handleCalculateFinalGrade = () => {
        const { examGrade, workAverage, workGrades } = buildCalculatorSnapshot(studentGrades);

        if (!selectedStudent) {
            setCalculatorMessageType('error');
            setCalculatorMessage('Selecciona un alumno para calcular la nota final.');
            return;
        }

        if (examGrade === null || Number.isNaN(examGrade)) {
            setCalculatorMessageType('error');
            setCalculatorMessage('No se puede calcular la nota final porque falta la nota de Examen Final.');
            return;
        }

        if (workGrades.length === 0 || workAverage === null) {
            const examScore = roundToSingleDecimal(examGrade);
            setEvaluationTitle('Nota Final Asignatura');
            setScore(examScore.toFixed(1));
            setFeedback(`Sin trabajos registrados. Se toma directamente la nota de examen ${examScore.toFixed(1)} / 10.`);
            setCalculatorMessageType('info');
            setCalculatorMessage('No hay trabajos registrados. Se usará directamente la nota del examen.');
            setErrorMessage('');
            return;
        }

        const parsedWeight = Number(finalExamWeight);
        if (Number.isNaN(parsedWeight) || parsedWeight < 40 || parsedWeight > 100) {
            setCalculatorMessageType('error');
            setCalculatorMessage('Introduce un porcentaje de examen válido entre 40% y 100%.');
            return;
        }

        const examRatio = parsedWeight / 100;
        const workRatio = 1 - examRatio;
        const calculatedFinalGrade = roundToSingleDecimal((workAverage * workRatio) + (examGrade * examRatio));

        setEvaluationTitle('Nota Final Asignatura');
        setScore(calculatedFinalGrade.toFixed(1));
        setFeedback(`Media trabajos ${workAverage.toFixed(1)} + examen ${roundToSingleDecimal(examGrade).toFixed(1)} con ponderación ${parsedWeight}%`);
        setCalculatorMessageType('success');
        setCalculatorMessage('Nota final calculada y trasladada al panel de Calificaciones.');
        setErrorMessage('');
    };

    // 3. Envío de Calificación [NotebookLM Puntos 4 y 5]
    const handleGradeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !score) {
            setErrorMessage('Por favor, introduce una calificación válida.');
            setGradeSubmitFeedbackStatus('error');
            return;
        }

        const parsedScore = parseFloat(score);
        if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 10) {
            setErrorMessage('La nota debe ser un valor numérico entre 0 y 10.');
            setGradeSubmitFeedbackStatus('error');
            return;
        }

        try {
            setIsSubmitting(true);
            setErrorMessage('');
            setSuccessMessage('');
            setGradeSubmitFeedbackStatus(null);

            // Enviamos payload seguro con el nuevo campo de feedback habilitado en backend
            const targetEnrollmentId = selectedStudent.enrollmentId ?? selectedStudent.userId;
            await submitStudentGrade({
                enrollmentId: targetEnrollmentId,
                title: evaluationTitle,
                score: parsedScore,
                feedback: feedback
            });

            setSuccessMessage(`Calificación registrada con éxito. Notificación enviada a la campana del alumno.`);
            setGradeSubmitFeedbackStatus('success');
            setScore('');
            setFeedback('');
            
            // Forzar refresco del listado de alumnos para actualizar las medias aritméticas individuales y grupales
            if (courseId) {
                try {
                    const updatedStudents = await getActiveStudentsByCourse(courseId);
                    setStudents(updatedStudents);
                } catch {
                    // Evitamos romper una calificación exitosa por un fallo no crítico de refresco.
                }
            }

            if (selectedStudent?.enrollmentId) {
                try {
                    const updatedGrades = await getTeacherEnrollmentGrades(selectedStudent.enrollmentId);
                    setStudentGrades(updatedGrades);
                } catch {
                    // Evitamos romper la operación principal si falla solo el refresco auxiliar.
                }
            }

            // [NotebookLM Punto 5]: Sincronizar campanas del sistema
            refreshNotifications();

        } catch (error) {
            const backendMessage =
                axios.isAxiosError(error) && typeof error.response?.data?.error === 'string'
                    ? error.response.data.error
                    : null;

            setErrorMessage(backendMessage ?? 'Error crítico perimetral: No tienes autorización o la sesión expiró.');
            setGradeSubmitFeedbackStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const calculatorSnapshot = buildCalculatorSnapshot(studentGrades);

    return {
        students,
        selectedStudent,
        studentGrades,
        studentDocuments,
        documentsLoadedFromCourseFallback,
        loadingData,
        loadingDocs,
        isSubmitting,
        gradeSubmitFeedbackStatus,
        errorMessage,
        successMessage,
        evaluationTitle,
        setEvaluationTitle,
        score,
        setScore,
        feedback,
        setFeedback,
        finalExamWeight,
        setFinalExamWeight,
        calculatorMessage,
        calculatorMessageType,
        calculatorSnapshot,
        selectedFile,
        isUploadingDocument,
        handleFileSelection,
        handleSendDocument,
        handleSelectStudent,
        handleSelectStudentById,
        handleCalculateFinalGrade,
        handleGradeSubmit
    };
};
