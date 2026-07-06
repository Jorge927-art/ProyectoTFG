import { apiClient } from './apiClient';

// Interfaz para mapear la estructura de la matrícula con el curso anidado
export interface PendingEvaluationDTO {
    enrollmentid: number;
    enrolled_at: string;
    status: string;
    course: {
        course_id: number;
        title: string;
        category: string;
        instructors: string;
        duration: number;
    };
}

// Interfaz estricta para el payload estructurado del formulario granular
export interface EvaluationInput {
    course_id: number;
    course_score: number;       // Estrellas de la asignatura (1-5)
    course_comment: string;     // Comentario de la asignatura (Opcional)
    instructor_score: number;   // Estrellas del profesor (1-5)
    instructor_comment: string; // Comentario del profesor (Opcional)
}

/**
 * [SERVICIO FILTRADO DOCENTE]: Recupera la lista de asignaturas y nombres de instructores 
 * activos en las matrículas del estudiante autenticado que aún no han sido evaluados.
 */
export const getPendingEvaluations = async (): Promise<PendingEvaluationDTO[]> => {
    const response = await apiClient.get<PendingEvaluationDTO[]>('/api/v1/evaluations/pending');
    return response.data;
};

/**
 * [SERVICIO CARGA PUNTUACIONES]: Transmite el payload granular con las estrellas y 
 * valoraciones textuales de ambas dimensiones para su persistencia segura en PostgreSQL.
 */
export const submitAcademicEvaluation = async (data: EvaluationInput): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/api/v1/evaluations/submit', data);
    return response.data;
};
