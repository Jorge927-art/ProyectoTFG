import { useState, useEffect, type ChangeEvent } from 'react';
import { 
    getActiveStudentsByCourse, 
    getCourseManagementMetrics,
    type StudentPerformanceDTO,
    type CourseMetricsDTO
} from '../../../../services/evaluationService';


export type TabType = 'alumnado' | 'trabajos' | 'metricas';

export const useCourseManagement = (courseId: number | null, isOpen: boolean) => {
    const [activeTab, setActiveTab] = useState<TabType>('alumnado');
    const [students, setStudents] = useState<StudentPerformanceDTO[]>([]);
    const [metrics, setMetrics] = useState<CourseMetricsDTO | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    // Efecto de limpieza estricta cuando el modal se cierra o cambia de curso
    useEffect(() => {
        if (!isOpen) {
            setActiveTab('alumnado');
            setStudents([]);
            setMetrics(null);
        }
    }, [isOpen, courseId]);

    // Hidratación diferida bajo demanda (Lazy Loading por pestaña activa)
    useEffect(() => {
        if (!isOpen || courseId === null) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                if (activeTab === 'alumnado' && students.length === 0) {
                    const data = await getActiveStudentsByCourse(courseId);
                    setStudents(data);
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
    }, [activeTab, courseId, isOpen, students.length, metrics]);
    // Validación estricta de archivo según directiva [ADR-25]
    const [fileError, setFileError] = useState<string | null>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFileError(null);
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
            setFileError('Validación Estricta [ADR-25]: Solo se admiten archivos en formato .pdf');
            e.target.value = ''; // Reseteo inmediato del input nativo
        }
    };

    return {
        activeTab,
        setActiveTab,
        students,
        metrics,
        loading,
        fileError,
        handleFileChange
    };
};
