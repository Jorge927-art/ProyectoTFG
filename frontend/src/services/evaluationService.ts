import { apiClient } from './apiClient';
import type { DBModelCourse } from './courseTypes';

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

// INTERFAZ NUEVA: Contrato de tipos para las calificaciones físicas del alumno
export interface CourseGradeDTO {
    gradeId: number;
    title: string; // "Trabajo Académico Escrito" o "Examen Final"
    score: string; // Nota Ej: "8.5"
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

/**
 * [SERVICIO CONSULTA CALIFICACIONES ASIGNATURA]: Recupera de forma específica las notas 
 * de trabajos y exámenes asociadas a una matrícula determinada [CABLEADO ADR-47].
 */
export const getStudentCourseGrades = async (enrollmentId: number): Promise<CourseGradeDTO[]> => {
    const response = await apiClient.get<CourseGradeDTO[]>(`/api/v1/users/my-courses/${enrollmentId}/grades`);
    return response.data;
};

export interface StudentPerformanceDTO {
    // Nuevo contrato real del backend docente
    userId: number;
    username: string;
    email: string;
    individualGrade: number;
    groupAverage: number;
    // Campo opcional para compatibilidad con flujos donde se expone matrícula explícita
    enrollmentId?: number;
}

export interface CourseMetricsDTO {
    courseId: number;
    groupAverageScore: number;
    activeStudentsCount: number;
    pendingTasksCount: number;
}

type RawCourseMetricsDTO = Partial<CourseMetricsDTO> & {
    groupAverageGrade?: number;
    pendingSubmissionsCount?: number;
};

const normalizeCourseMetrics = (courseId: number, payload: RawCourseMetricsDTO): CourseMetricsDTO => ({
    courseId: typeof payload.courseId === 'number' ? payload.courseId : courseId,
    groupAverageScore:
        typeof payload.groupAverageScore === 'number'
            ? payload.groupAverageScore
            : typeof payload.groupAverageGrade === 'number'
                ? payload.groupAverageGrade
                : 0,
    activeStudentsCount: typeof payload.activeStudentsCount === 'number' ? payload.activeStudentsCount : 0,
    pendingTasksCount:
        typeof payload.pendingTasksCount === 'number'
            ? payload.pendingTasksCount
            : typeof payload.pendingSubmissionsCount === 'number'
                ? payload.pendingSubmissionsCount
                : 0,
});

export const getActiveStudentsByCourse = async (courseId: number): Promise<StudentPerformanceDTO[]> => {
    const response = await apiClient.get<StudentPerformanceDTO[]>(`/api/v1/teacher/evaluations/courses/${courseId}/management/students`);
    return response.data;
};

export const getCourseManagementMetrics = async (courseId: number): Promise<CourseMetricsDTO> => {
    const response = await apiClient.get<RawCourseMetricsDTO>(`/api/v1/teacher/evaluations/courses/${courseId}/management/metrics`);
    return normalizeCourseMetrics(courseId, response.data ?? {});
};

export interface TeacherGradeInput {
    enrollmentId: number;
    title: string;
    score: number;
    feedback: string;
}

export const submitStudentGrade = async (payload: TeacherGradeInput): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
        '/api/v1/teacher/evaluations/submit',
        payload
    );
    return response.data;
};

export const getProfessorAssignedCourses = async (): Promise<DBModelCourse[]> => {
    const response = await apiClient.get<DBModelCourse[]>('/api/courses/assigned-to-me');
    return response.data;
};

