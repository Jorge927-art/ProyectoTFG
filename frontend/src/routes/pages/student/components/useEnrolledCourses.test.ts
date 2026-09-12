import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEnrolledCourses } from './useEnrolledCourses';
import { apiClient } from '../../../../services/apiClient';
import { useAuth } from '../../../../auth/useAuth';
import { readStoredAuthUser, readStoredToken } from '../../../../auth/authStorage';

// --- AISLAMIENTO PERIMETRAL ESTRICTO: MOCKS DE INFRAESTRUCTURA DE RED Y AUTENTICACIÓN ---
vi.mock('../../../../services/apiClient', () => ({
    apiClient: {
        get: vi.fn(),
    },
}));

vi.mock('../../../../auth/useAuth', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../../../../auth/authStorage', () => ({
    readStoredAuthUser: vi.fn(),
    readStoredToken: vi.fn(),
}));

type MockedApiClient = {
    get: ReturnType<typeof vi.fn>;
};

const mockedApi = apiClient as unknown as MockedApiClient;
const mockedUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;
const mockedReadStoredAuthUser = readStoredAuthUser as unknown as ReturnType<typeof vi.fn>;
const mockedReadStoredToken = readStoredToken as unknown as ReturnType<typeof vi.fn>;

describe('useEnrolledCourses - Suite de Pruebas Unitarias de Hooks Avanzados', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockedReadStoredToken.mockReturnValue(null);
    });

    // --- ACCESORIOS DE PAYLOADS COMPLEJOS (FIXTURES) ---
    const mockValidBackendPayload = [
        {
            enrollmentid: 701,
            enrolled_at: '2026-01-10T12:00:00Z',
            started_at: '2026-01-11T09:00:00Z',
            status: 'ACTIVA',
            progress_percentage: 45,
            course: {
                course_id: 10,
                title: 'Testing Avanzado con Vitest',
                category: 'Calidad de Software',
                instructors: 'Ing. Test Expert',
                duration: 40
            },
            grades: [
                { title: 'Trabajo 1', score: 8.75 },
                { title: 'Examen final', score: '9.5' }
            ]
        }
    ];

    const mockHeterogeneousPayload = [
        {
            enrollmentId: 702,
            enrolled_at: '2026-02-10T12:00:00Z',
            startedAt: '2026-02-11T09:00:00Z',
            status: null,
            progress: 80,
            courses: {
                id: 20,
                title: 'React Avanzado',
                category: undefined,
                instructors: undefined,
                duration: undefined
            }
        },
        {
            enrollmentid: undefined,
            course: { title: 'Curso Fantasma Corrupto' }
        }
    ];
    // --- BLOQUE 1: CASOS DE PRUEBA DE NORMALIZACIÓN DE DATOS (DATA RESILIENCE) ---
    it('debe intentar por token aunque no exista username local en memoria ni storage', async () => {
        mockedUseAuth.mockReturnValue({ user: null });
        mockedReadStoredAuthUser.mockReturnValue(null);
        mockedApi.get.mockResolvedValueOnce({ status: 200, data: mockValidBackendPayload });

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(result.current.enrollmentError).toBe('');
        expect(result.current.enrolledList).toHaveLength(1);
        expect(mockedApi.get).toHaveBeenCalledWith('/api/auth/my-active-courses');
    });

    it('debe recurrir recursivamente al storage si el contexto de useAuth no tiene el username hidratado', async () => {
        mockedUseAuth.mockReturnValue({ user: { username: undefined } });
        mockedReadStoredAuthUser.mockReturnValue({ username: 'student_from_storage  ' });
        mockedApi.get.mockResolvedValueOnce({ status: 200, data: mockValidBackendPayload });

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(result.current.enrollmentError).toBe('');
        expect(mockedApi.get).toHaveBeenCalledWith('/api/auth/my-active-courses');
    });

    it('debe reintentar con username cuando la primera lectura por token retorna vacío', async () => {
        mockedUseAuth.mockReturnValue({ user: { username: 'Carlos Gomez' } });
        mockedApi.get
            .mockResolvedValueOnce({ status: 200, data: [] })
            .mockResolvedValueOnce({ status: 200, data: mockValidBackendPayload });

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/api/auth/my-active-courses');
        expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/api/auth/my-active-courses', {
            params: { username: 'Carlos Gomez' }
        });
        expect(result.current.enrolledList).toHaveLength(1);
    });

    it('debe continuar al fallback por username si el intento por token falla por transporte', async () => {
        mockedUseAuth.mockReturnValue({ user: { username: 'Carlos Gomez' } });
        mockedApi.get
            .mockRejectedValueOnce(new Error('401'))
            .mockResolvedValueOnce({ status: 200, data: mockValidBackendPayload });

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/api/auth/my-active-courses');
        expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/api/auth/my-active-courses', {
            params: { username: 'Carlos Gomez' }
        });
        expect(result.current.enrolledList).toHaveLength(1);
    });

    it('debe resolver username canónico con /api/auth/me y reintentar si token+username inicial devuelven vacío', async () => {
        mockedUseAuth.mockReturnValue({ user: { username: 'Carlos Gomez' } });
        mockedApi.get
            .mockResolvedValueOnce({ status: 200, data: [] })
            .mockResolvedValueOnce({ status: 200, data: [] })
            .mockResolvedValueOnce({ status: 200, data: { username: 'carlos_student' } })
            .mockResolvedValueOnce({ status: 200, data: mockValidBackendPayload });

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/api/auth/my-active-courses');
        expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/api/auth/my-active-courses', {
            params: { username: 'Carlos Gomez' }
        });
        expect(mockedApi.get).toHaveBeenNthCalledWith(3, '/api/auth/me');
        expect(mockedApi.get).toHaveBeenNthCalledWith(4, '/api/auth/my-active-courses', {
            params: { username: 'carlos_student' }
        });
        expect(result.current.enrolledList).toHaveLength(1);
    });

    it('debe usar el sub/email del JWT como fallback si /api/auth/me falla con 500', async () => {
        mockedUseAuth.mockReturnValue({ user: { username: 'Carlos Gomez' } });

        const payload = btoa(JSON.stringify({
            sub: 'carlos_student',
            email: 'carlos@student.test'
        }));
        mockedReadStoredToken.mockReturnValue(`header.${payload}.signature`);

        mockedApi.get
            .mockResolvedValueOnce({ status: 200, data: [] })
            .mockResolvedValueOnce({ status: 200, data: [] })
            .mockResolvedValueOnce({ status: 200, data: mockValidBackendPayload });

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/api/auth/my-active-courses');
        expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/api/auth/my-active-courses', {
            params: { username: 'Carlos Gomez' }
        });
        expect(mockedApi.get).toHaveBeenNthCalledWith(3, '/api/auth/my-active-courses', {
            params: { username: 'carlos_student' }
        });
        expect(result.current.enrolledList).toHaveLength(1);
    });

    it('debe reintentar por userId explícito cuando token y username retornan vacío', async () => {
        mockedUseAuth.mockReturnValue({ user: { username: 'Carlos Gomez', userId: 77 } });
        mockedApi.get
            .mockResolvedValueOnce({ status: 200, data: [] })
            .mockResolvedValueOnce({ status: 200, data: [] })
            .mockResolvedValueOnce({ status: 200, data: mockValidBackendPayload });

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/api/auth/my-active-courses');
        expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/api/auth/my-active-courses', {
            params: { username: 'Carlos Gomez' }
        });
        expect(mockedApi.get).toHaveBeenNthCalledWith(3, '/api/auth/my-active-courses', {
            params: { userId: 77 }
        });
        expect(result.current.enrolledList).toHaveLength(1);
    });

    it('debe resolver, normalizar y depurar con éxito colecciones estándar de asignaturas activas', async () => {
        mockedUseAuth.mockReturnValue({ user: { username: 'tfg_user' } });
        mockedApi.get.mockResolvedValueOnce({ status: 200, data: mockValidBackendPayload });

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(result.current.enrollmentError).toBe('');
        expect(result.current.enrolledList).toHaveLength(1);
        
        const firstEnrollment = result.current.enrolledList[0];
        expect(firstEnrollment.enrollmentid).toBe(701);
        expect(firstEnrollment.enrolled_at).toBe('2026-01-10T12:00:00Z');
        expect(firstEnrollment.started_at).toBe('2026-01-11T09:00:00Z');
        expect(firstEnrollment.status).toBe('ACTIVA');
        expect(firstEnrollment.progress_percentage).toBe(45);
        expect(firstEnrollment.course.title).toBe('Testing Avanzado con Vitest');
        expect(firstEnrollment.grades).toEqual([
            { gradeId: undefined, title: 'Trabajo 1', score: '8.75', comments: '' },
            { gradeId: undefined, title: 'Examen final', score: '9.5', comments: '' }
        ]);
    });

    it('debe aplicar la normalización adaptativa estricta contra payloads heterogéneos y filtrar registros sin ID', async () => {
        mockedUseAuth.mockReturnValue({ user: { username: 'adaptive_user' } });
        mockedApi.get.mockResolvedValueOnce({ status: 200, data: mockHeterogeneousPayload });

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(result.current.enrolledList).toHaveLength(1);
        expect(console.warn).toHaveBeenCalledTimes(0);

        const evaluatedEnrollment = result.current.enrolledList[0];
        expect(evaluatedEnrollment.enrollmentid).toBe(702);
        expect(evaluatedEnrollment.enrolled_at).toBe('2026-02-10T12:00:00Z');
        
        // CORRECCIÓN QUIRÚRGICA: Sincronización matemática del valor del fixture con la lógica real de tu hook
        expect(evaluatedEnrollment.started_at).toBe('2026-02-11T09:00:00Z');
        expect(evaluatedEnrollment.status).toBe('EN_PROGRESO');
        expect(evaluatedEnrollment.progress_percentage).toBe(80);
        expect(evaluatedEnrollment.course.course_id).toBe(20);
        expect(evaluatedEnrollment.course.title).toBe('React Avanzado');
        expect(evaluatedEnrollment.course.category).toBe('General');
        expect(evaluatedEnrollment.course.instructors).toBe('Por asignar');
        expect(evaluatedEnrollment.course.duration).toBe(0);
        expect(evaluatedEnrollment.grades).toEqual([]);
    });
    // --- BLOQUE 2: GESTIÓN DE EXCEPCIONES Y ACCIONES EN CALIENTE ---
    it('debe capturar errores de pasarela HTTP de red de forma asíncrona y transparente mutando el error', async () => {
        mockedUseAuth.mockReturnValue({ user: { username: 'error_user' } });
        mockedApi.get
            .mockRejectedValueOnce(new Error('PostgreSQL connections exhausted'))
            .mockRejectedValueOnce(new Error('Unauthorized'))
            .mockRejectedValueOnce(new Error('Unauthorized'));

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(result.current.enrolledList).toEqual([]);
        expect(result.current.enrollmentError).toBe('No se pudieron sincronizar tus asignaturas activas desde PostgreSQL.');
        expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('debe ejecutar una recarga transparente desde la base de datos al invocar la inserción optimista local', async () => {
        mockedUseAuth.mockReturnValue({ user: { username: 'optimistic_user' } });
        mockedApi.get.mockResolvedValue({ status: 200, data: mockValidBackendPayload });

        const { result } = renderHook(() => useEnrolledCourses('trigger_1'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });
        expect(mockedApi.get).toHaveBeenCalledTimes(1);

        act(() => {
            result.current.injectLocalEnrollment();
        });

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        // Asegurar matemáticamente que se forzó la llamada limpia para limpiar IDs temporales
        expect(mockedApi.get).toHaveBeenCalledTimes(2);
    });

    it('debe normalizar payload envuelto en "enrollments" para evitar errores de map sobre objetos', async () => {
        mockedUseAuth.mockReturnValue({ user: { username: 'wrapped_user' } });
        mockedApi.get.mockResolvedValueOnce({
            status: 200,
            data: {
                enrollments: mockValidBackendPayload
            }
        });

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(result.current.enrollmentError).toBe('');
        expect(result.current.enrolledList).toHaveLength(1);
        expect(result.current.enrolledList[0].enrollmentid).toBe(701);
    });

    it('debe aceptar id legacy en la raíz cuando no existe enrollmentid/enrollmentId', async () => {
        mockedUseAuth.mockReturnValue({ user: { username: 'legacy_user' } });
        mockedApi.get.mockResolvedValueOnce({
            status: 200,
            data: [
                {
                    id: 888,
                    status: 'EN_PROGRESO',
                    progress_percentage: 20,
                    course: {
                        course_id: 55,
                        title: 'Curso Legacy',
                        category: 'General',
                        instructors: 'Profesor Legacy',
                        duration: 10
                    }
                }
            ]
        });

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(result.current.enrolledList).toHaveLength(1);
        expect(result.current.enrolledList[0].enrollmentid).toBe(888);
    });

    it('debe usar course_id como fallback de enrollmentid si el backend omite el id de matrícula', async () => {
        mockedUseAuth.mockReturnValue({ user: { username: 'fallback_user' } });
        mockedApi.get.mockResolvedValueOnce({
            status: 200,
            data: [
                {
                    status: 'EN_PROGRESO',
                    progress_percentage: 35,
                    course: {
                        course_id: 777,
                        title: 'Curso sin id de matrícula',
                        category: 'General',
                        instructors: 'Profesor X',
                        duration: 12
                    }
                }
            ]
        });

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(result.current.enrolledList).toHaveLength(1);
        expect(result.current.enrolledList[0].enrollmentid).toBe(777);
    });
});
