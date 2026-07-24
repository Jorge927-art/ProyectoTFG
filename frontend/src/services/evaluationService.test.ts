import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    getPendingEvaluations, 
    submitAcademicEvaluation, 
    getStudentCourseGrades, 
    getActiveStudentsByCourse, 
    getCourseManagementMetrics,
    getProfessorAssignedCourses,
    submitStudentGrade
} from './evaluationService';
import { apiClient } from './apiClient';
import type { 
    PendingEvaluationDTO, 
    EvaluationInput, 
    CourseGradeDTO, 
    StudentPerformanceDTO, 
    CourseMetricsDTO,
    TeacherGradeInput
} from './evaluationService';
import type { DBModelCourse } from './courseTypes';

// --- AISLAMIENTO PERIMETRAL ESTRICTO: MOCK TIPADO DE API_CLIENT ---
vi.mock('./apiClient', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

type MockedApiClient = {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
};

const mockedApi = apiClient as unknown as MockedApiClient;

describe('evaluationService - Suite de Pruebas Unitarias de Alta Fidelidad', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // --- ACCESORIOS DE DATOS SIMULADOS (FIXTURES) CON TIPADO ESTRICTO ---
    const mockPendingEvaluations: PendingEvaluationDTO[] = [
        {
            enrollmentid: 101,
            enrolled_at: '2026-02-15T08:30:00Z',
            status: 'ACTIVE',
            course: {
                course_id: 42,
                title: 'Desarrollo Avanzado con React y TypeScript',
                category: 'Ingeniería de Software',
                instructors: 'Dr. Alex Refactor',
                duration: 60,
            },
        },
    ];

    const mockEvaluationInput: EvaluationInput = {
        course_id: 42,
        course_score: 5,
        course_comment: 'Excelente arquitectura y claridad en los módulos.',
        instructor_score: 5,
        instructor_comment: 'Gran disposición para resolver dudas del TFG.',
    };

    const mockCourseGrades: CourseGradeDTO[] = [
        { gradeId: 1, title: 'Trabajo Académico Escrito', score: '9.2' },
        { gradeId: 2, title: 'Examen Final', score: '8.5' },
    ];
    // --- BLOQUE 1: FLUJOS ASÍNCRONOS EXITOSOS (HAPPY PATHS) ---
    it('debe recuperar las evaluaciones pendientes del estudiante vía GET', async () => {
        mockedApi.get.mockResolvedValueOnce({ data: mockPendingEvaluations });

        const result = await getPendingEvaluations();

        expect(result).toEqual(mockPendingEvaluations);
        expect(mockedApi.get).toHaveBeenCalledTimes(1);
        expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/evaluations/pending');
    });

    it('debe transmitir la evaluación académica vía POST y retornar el mensaje de confirmación', async () => {
        const successMessage = { message: 'Evaluación registrada con éxito' };
        mockedApi.post.mockResolvedValueOnce({ data: successMessage });

        const result = await submitAcademicEvaluation(mockEvaluationInput);

        expect(result).toEqual(successMessage);
        expect(mockedApi.post).toHaveBeenCalledTimes(1);
        expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/evaluations/submit', mockEvaluationInput);
    });

    it('debe inyectar correctamente el id de matrícula en la URL para consultar calificaciones', async () => {
        const enrollmentId = 101;
        mockedApi.get.mockResolvedValueOnce({ data: mockCourseGrades });

        const result = await getStudentCourseGrades(enrollmentId);

        expect(result).toEqual(mockCourseGrades);
        expect(mockedApi.get).toHaveBeenCalledTimes(1);
        expect(mockedApi.get).toHaveBeenCalledWith(`/api/v1/users/my-courses/${enrollmentId}/grades`);
    });

    it('debe inyectar el id del curso en la URL para obtener el rendimiento de alumnos [MÓDULO DOCENTE]', async () => {
        const courseId = 42;
        const mockPerformance: StudentPerformanceDTO[] = [
            {
                userId: 77,
                username: 'Alan Turing',
                email: 'turing@universidad.edu',
                individualGrade: 9.8,
                groupAverage: 8.1,
                enrollmentId: 901
            }
        ];
        mockedApi.get.mockResolvedValueOnce({ data: mockPerformance });

        const result = await getActiveStudentsByCourse(courseId);

        expect(result).toEqual(mockPerformance);
        expect(mockedApi.get).toHaveBeenCalledTimes(1);
        expect(mockedApi.get).toHaveBeenCalledWith(`/api/v1/teacher/evaluations/courses/${courseId}/management/students`);
    });

    it('debe recuperar las métricas de gestión del curso interpolando correctamente el identificador', async () => {
        const courseId = 42;
        const mockMetrics: CourseMetricsDTO = {
            courseId: 42,
            groupAverageScore: 7.6,
            activeStudentsCount: 25,
            pendingTasksCount: 3
        };
        mockedApi.get.mockResolvedValueOnce({ data: { ...mockMetrics, groupAverageGrade: 7.6, pendingSubmissionsCount: 3 } });

        const result = await getCourseManagementMetrics(courseId);

        expect(result).toEqual(mockMetrics);
        expect(mockedApi.get).toHaveBeenCalledTimes(1);
        expect(mockedApi.get).toHaveBeenCalledWith(`/api/v1/teacher/evaluations/courses/${courseId}/management/metrics`);
    });

    it('debe normalizar payload legacy de métricas con groupAverageGrade y pendingSubmissionsCount', async () => {
        const courseId = 77;
        mockedApi.get.mockResolvedValueOnce({
            data: {
                activeStudentsCount: 9,
                groupAverageGrade: 6.4,
                pendingSubmissionsCount: 5
            }
        });

        const result = await getCourseManagementMetrics(courseId);

        expect(result).toEqual({
            courseId: 77,
            activeStudentsCount: 9,
            groupAverageScore: 6.4,
            pendingTasksCount: 5
        });
    });

    it('debe estabilizar métricas en 0 cuando faltan campos numéricos en la respuesta', async () => {
        const courseId = 88;
        mockedApi.get.mockResolvedValueOnce({ data: {} });

        const result = await getCourseManagementMetrics(courseId);

        expect(result).toEqual({
            courseId: 88,
            activeStudentsCount: 0,
            groupAverageScore: 0,
            pendingTasksCount: 0
        });
    });

    it('debe recuperar las asignaturas asignadas al profesor autenticado para hidratar su panel', async () => {
        const mockAssignedCourses: DBModelCourse[] = [
            {
                course_id: 301,
                title: 'Microservicios con Spring Cloud',
                category: 'Arquitectura'
            }
        ];
        mockedApi.get.mockResolvedValueOnce({ data: mockAssignedCourses });

        const result = await getProfessorAssignedCourses();

        expect(result).toEqual(mockAssignedCourses);
        expect(mockedApi.get).toHaveBeenCalledTimes(1);
        expect(mockedApi.get).toHaveBeenCalledWith('/api/courses/assigned-to-me');
    });

    it('debe enviar la calificación del profesor incluyendo feedback al endpoint docente', async () => {
        const payload: TeacherGradeInput = {
            enrollmentId: 901,
            title: 'Trabajo Académico Escrito',
            score: 8.75,
            feedback: 'Buen razonamiento, mejora la conclusión.'
        };
        const response = { success: true, message: 'Calificación registrada con éxito por el docente autorizado.' };
        mockedApi.post.mockResolvedValueOnce({ data: response });

        const result = await submitStudentGrade(payload);

        expect(result).toEqual(response);
        expect(mockedApi.post).toHaveBeenCalledTimes(1);
        expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/teacher/evaluations/submit', payload);
    });
    // --- BLOQUE 2: GESTIÓN DE EXCEPCIONES Y CONTROL DE ERRORES DE RED ---
    it('debe propagar el error de red cuando falla la obtención de evaluaciones pendientes', async () => {
        const errorMock = new Error('Error 503: Servicio temporalmente no disponible');
        mockedApi.get.mockRejectedValueOnce(errorMock);

        await expect(getPendingEvaluations()).rejects.toThrow('Error 503: Servicio temporalmente no disponible');
        expect(mockedApi.get).toHaveBeenCalledTimes(1);
    });

    it('debe propagar el error de validación cuando el payload de evaluación es rechazado', async () => {
        const errorMock = new Error('Error 400: Puntuación fuera del rango permitido (1-5)');
        mockedApi.post.mockRejectedValueOnce(errorMock);

        await expect(submitAcademicEvaluation(mockEvaluationInput)).rejects.toThrow(
            'Error 400: Puntuación fuera del rango permitido (1-5)'
        );
        expect(mockedApi.post).toHaveBeenCalledTimes(1);
    });

    it('debe gestionar errores 404 al consultar calificaciones con un ID de matrícula inexistente', async () => {
        const invalidEnrollmentId = 9999;
        const errorMock = new Error('Error 404: Registro de matrícula no encontrado');
        mockedApi.get.mockRejectedValueOnce(errorMock);

        await expect(getStudentCourseGrades(invalidEnrollmentId)).rejects.toThrow(
            'Error 404: Registro de matrícula no encontrado'
        );
        expect(mockedApi.get).toHaveBeenCalledWith(`/api/v1/users/my-courses/${invalidEnrollmentId}/grades`);
    });

    it('debe propagar errores de autorización (403) en el módulo docente al consultar alumnos por curso', async () => {
        const forbiddenCourseId = 88;
        const errorMock = new Error('Error 403: No tienes permisos de docente sobre este curso');
        mockedApi.get.mockRejectedValueOnce(errorMock);

        await expect(getActiveStudentsByCourse(forbiddenCourseId)).rejects.toThrow(
            'Error 403: No tienes permisos de docente sobre este curso'
        );
        expect(mockedApi.get).toHaveBeenCalledWith(
            `/api/v1/teacher/evaluations/courses/${forbiddenCourseId}/management/students`
        );
    });

    it('debe propagar errores de infraestructura al consultar las métricas de gestión del curso', async () => {
        const courseId = 42;
        const errorMock = new Error('Error de conexión con la base de datos PostgreSQL');
        mockedApi.get.mockRejectedValueOnce(errorMock);

        await expect(getCourseManagementMetrics(courseId)).rejects.toThrow(
            'Error de conexión con la base de datos PostgreSQL'
        );
        expect(mockedApi.get).toHaveBeenCalledWith(
            `/api/v1/teacher/evaluations/courses/${courseId}/management/metrics`
        );
    });
});
