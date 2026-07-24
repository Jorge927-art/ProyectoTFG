import { useState, useEffect } from 'react';
// Usamos 'import type' para satisfacer las reglas estrictas de TypeScript de tu proyecto
import type { 
    StudentPerformanceDTO
} from '../../../../services/evaluationService';
import type { DocumentMetadata } from '../../../../services/documentService';

import { 
    getActiveStudentsByCourse, 
    submitStudentGrade 
} from '../../../../services/evaluationService';
import { getDocumentsByEnrollment, uploadProfessorDocument } from '../../../../services/documentService';
import { useNotifications } from '../../../../components/ui/globalNotificationBell/useNotifications';

const ERROR_MESSAGE_AUTO_DISMISS_MS = 6000;

export const useGradingCenter = (courseId: number | null) => {
    // Estados de datos encapsulados
    const [students, setStudents] = useState<StudentPerformanceDTO[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentPerformanceDTO | null>(null);
    const [studentDocuments, setStudentDocuments] = useState<DocumentMetadata[]>([]);
    
    // Estados de carga de la API
    const [loadingData, setLoadingData] = useState<boolean>(false);
    const [loadingDocs, setLoadingDocs] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    
    // Gestión de mensajes de feedback para la UI
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Estado local del formulario de evaluación
    const [evaluationTitle, setEvaluationTitle] = useState<string>('Trabajo Académico Escrito');
    const [score, setScore] = useState<string>('');
    const [feedback, setFeedback] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploadingDocument, setIsUploadingDocument] = useState<boolean>(false);

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


    // 1. Cargar alumnos y métricas globales del curso seleccionado
    useEffect(() => {
        if (!courseId) {
            setStudents([]);
            setSelectedStudent(null);
            setStudentDocuments([]);
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
            setStudentDocuments([]);
            setSelectedFile(null);
        };

        fetchCourseData();
    }, [courseId]);

    const fetchStudentDocuments = async (student: StudentPerformanceDTO) => {
        setStudentDocuments([]);
        setErrorMessage('');

        try {
            setLoadingDocs(true);
            // El endpoint espera enrollmentId; usamos fallback a userId en datasets legacy.
            const targetEnrollmentId = student.enrollmentId ?? student.userId;
            const docs = await getDocumentsByEnrollment(targetEnrollmentId);
            setStudentDocuments(docs);
        } catch {
            setErrorMessage('No se pudieron recuperar las entregas físicas de este estudiante.');
        } finally {
            setLoadingDocs(false);
        }
    };

    // 2. Sincronización [NotebookLM Punto 4]: Cargar documentos al seleccionar un alumno
    const handleSelectStudent = async (student: StudentPerformanceDTO) => {
        setSelectedStudent(student);
        setErrorMessage('');
        setSuccessMessage('');
        setScore('');
        setFeedback('');
        await fetchStudentDocuments(student);
    };

    const handleSelectStudentById = async (studentId: number) => {
        const student = students.find((candidate) => candidate.userId === studentId);
        if (!student) {
            setSelectedStudent(null);
            setStudentDocuments([]);
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

    // 3. Envío de Calificación [NotebookLM Puntos 4 y 5]
    const handleGradeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !score) {
            setErrorMessage('Por favor, introduce una calificación válida.');
            return;
        }

        const parsedScore = parseFloat(score);
        if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 10) {
            setErrorMessage('La nota debe ser un valor numérico entre 0 y 10.');
            return;
        }

        try {
            setIsSubmitting(true);
            setErrorMessage('');
            setSuccessMessage('');

            // Enviamos payload seguro con el nuevo campo de feedback habilitado en backend
            const targetEnrollmentId = selectedStudent.enrollmentId ?? selectedStudent.userId;
            await submitStudentGrade({
                enrollmentId: targetEnrollmentId,
                title: evaluationTitle,
                score: parsedScore,
                feedback: feedback
            });

            setSuccessMessage(`Calificación registrada con éxito. Notificación enviada a la campana del alumno.`);
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

            // [NotebookLM Punto 5]: Sincronizar campanas del sistema
            refreshNotifications();

        } catch {
            setErrorMessage('Error crítico perimetral: No tienes autorización o la sesión expiró.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        students,
        selectedStudent,
        studentDocuments,
        loadingData,
        loadingDocs,
        isSubmitting,
        errorMessage,
        successMessage,
        evaluationTitle,
        setEvaluationTitle,
        score,
        setScore,
        feedback,
        setFeedback,
        selectedFile,
        isUploadingDocument,
        handleFileSelection,
        handleSendDocument,
        handleSelectStudent,
        handleSelectStudentById,
        handleGradeSubmit
    };
};
