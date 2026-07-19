import { useState, useEffect, type ChangeEvent } from 'react';
import { 
    getActiveStudentsByCourse, 
    getCourseManagementMetrics,
    type StudentPerformanceDTO,
    type CourseMetricsDTO
} from '../../../../services/evaluationService';

export type TabType = 'alumnado' | 'trabajos' | 'metricas';

export const useCourseManagement = (
    courseId: number | null, isOpen: boolean, onSyncCount?: (courseId: number, count: number) => void
) =>  {
    const [activeTab, setActiveTab] = useState<TabType>('alumnado');
    const [students, setStudents] = useState<StudentPerformanceDTO[]>([]);
    const [metrics, setMetrics] = useState<CourseMetricsDTO | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    
    // Nueva variable de control para evitar re-consultar si el curso tiene 0 alumnos
    const [hasLoadedAlumnado, setHasLoadedAlumnado] = useState<boolean>(false);

    // Efecto de limpieza estricta cuando el modal se cierra o cambia de curso
    useEffect(() => {
        if (!isOpen) {
            setActiveTab('alumnado');
            setStudents([]);
            setMetrics(null);
            setHasLoadedAlumnado(false); // Reseteamos el control al cerrar
        }
    }, [isOpen, courseId]);

    // Hidratación diferida bajo demanda (Lazy Loading por pestaña activa)

useEffect(() => {
    if (!isOpen || courseId === null) return;

    const fetchData = async () => {
        setLoading(true);
        try {
            // Modificamos la condición añadiendo: || activeTab === 'trabajos'
            if ((activeTab === 'alumnado' || activeTab === 'trabajos') && !hasLoadedAlumnado) {
                const data = await getActiveStudentsByCourse(courseId);
                setStudents(data);
                setHasLoadedAlumnado(true); // Marcamos como cargado definitivamente
                
                if (onSyncCount) {
                    onSyncCount(courseId, data.length);
                }
            } else if (activeTab === 'metricas' && !metrics) {
                const data = await getCourseManagementMetrics(courseId);
                setMetrics(data);
            }
        } catch (error) {
            console.error("Error asíncrono en useCourseManagement:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchData();

}, [activeTab, courseId, isOpen, hasLoadedAlumnado, metrics, onSyncCount]);

    // Validación estricta de archivo según directiva [ADR-25]
    const [fileError, setFileError] = useState<string | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string>("0");

     // 1. NUEVOS ESTADOS COMPLEMENTARIOS PARA LA SUBIDA DE ARCHIVOS
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFileError(null);
        setUploadSuccessMessage(null);
        const file = e.target.files?.[0];
        if (!file) {
            setSelectedFile(null);
            return;
        }

        if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
            setFileError('Validación Estricta [ADR-25]: Solo se admiten archivos en formato .pdf');
            setSelectedFile(null);
            e.target.value = ''; // Reseteo inmediato del input nativo            
        } else{
            setSelectedFile(file);
        }
    };

        const handleUploadDocument = async () => {
        if (!courseId || !selectedFile) {
            setFileError('Por favor, selecciona un archivo válido antes de transmitir.');
            return;
        }

        setIsSubmitting(true);
        setFileError(null);
        setUploadSuccessMessage(null);

        try {
            // Importamos de manera dinámica el servicio para evitar colisiones de dependencias circulares
            const { uploadProfessorDocument } = await import('../../../../services/documentService');
            
            const receiverIdNum = parseInt(selectedStudentId, 10);
            
            const response = await uploadProfessorDocument(selectedFile, courseId, receiverIdNum);
            
            setUploadSuccessMessage(response.message || 'Documento transmitido con éxito.');
            setSelectedFile(null); // Reseteamos el archivo en memoria tras el éxito
            
     } catch (error: unknown) { // Cambiado a 'unknown' de forma estricta
        console.error("Error en la transmisión del profesor:", error);
        
        // Moldeamos la referencia de forma segura para leer la respuesta de Axios
        const axiosError = error as { response?: { data?: { error?: string } } };
        setFileError(axiosError.response?.data?.error || 'Error crítico en el servidor al transmitir el documento.');
    } finally {
            setIsSubmitting(false);
        }
    };

    // Añadimos la limpieza de estos estados nuevos al cerrar el modal (dentro del useEffect de limpieza superior)
    useEffect(() => {
        if (!isOpen) {
            setActiveTab('alumnado');
            setStudents([]);
            setMetrics(null);
            setHasLoadedAlumnado(false);
            // Limpieza perimetral de estados de subida:
            setSelectedFile(null);
            setFileError(null);
            setUploadSuccessMessage(null);
            setIsSubmitting(false);
            setSelectedStudentId("0");
        }
    }, [isOpen, courseId]);

    return {
        activeTab,
        setActiveTab,
        students,
        metrics,
        loading,
        fileError,
        handleFileChange,
        selectedStudentId,
        setSelectedStudentId,
        selectedFile,
        isSubmitting,
        uploadSuccessMessage,
        handleUploadDocument
    };
};
