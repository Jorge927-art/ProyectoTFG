// frontend/src/services/teachingMetricsService.ts
import { apiClient } from './apiClient';

/**
 * Contrato del resumen agregado del panel "Métricas de Docencia".
 * courseId === null representa la opción TODOS (agregación sobre todas las
 * asignaturas asignadas al profesor autenticado).
 */
export interface TeachingMetricsSummary {
    courseId: number | null;
    collectiveProgress: number;
    completionRate: number;
    averageGrade: number;
}

/**
 * Contrato del desglose individual por alumno, usado por "Progreso Alumno"
 * y "Nota Alumno".
 */
export interface StudentMetricBreakdown {
    userId: number;
    username: string;
    email: string;
    courseId: number;
    courseTitle: string;
    progressPercentage: number;
    averageGrade: number;
    workAverage: number | null;
    finalExamGrade: number | null;
    finalGrade: number | null;
}

/**
 * [SERVICIO PANEL DOCENTE - RESUMEN]: Recupera las métricas agregadas para
 * la asignatura seleccionada, o para todas las asignadas al profesor si
 * courseId es null (opción TODOS del selector).
 */
export const getTeachingMetricsSummary = async (
    courseId: number | null
): Promise<TeachingMetricsSummary> => {
    const response = await apiClient.get<TeachingMetricsSummary>(
        '/api/v1/teacher/metrics/summary',
        { params: courseId ? { courseId } : {} }
    );
    return response.data;
};

/**
 * [SERVICIO PANEL DOCENTE - DESGLOSE ALUMNO]: Recupera el progreso y la nota
 * media individual de cada alumno, scopeado igual que el resumen.
 */
export const getStudentMetricsBreakdown = async (
    courseId: number | null
): Promise<StudentMetricBreakdown[]> => {
    const response = await apiClient.get<StudentMetricBreakdown[]>(
        '/api/v1/teacher/metrics/students',
        { params: courseId ? { courseId } : {} }
    );
    return response.data;
};
