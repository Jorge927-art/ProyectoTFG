import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEnrolledCourses } from './useEnrolledCourses';
import { apiClient } from '../../../../services/apiClient';
import { useAuth } from '../../../../auth/useAuth';
import { readStoredAuthUser } from '../../../../auth/authStorage';

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
}));

type MockedApiClient = {
    get: ReturnType<typeof vi.fn>;
};

const mockedApi = apiClient as unknown as MockedApiClient;
const mockedUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;
const mockedReadStoredAuthUser = readStoredAuthUser as unknown as ReturnType<typeof vi.fn>;

describe('useEnrolledCourses - Suite de Pruebas Unitarias de Hooks Avanzados', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
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
            }
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
    it('debe abortar la hidratación indicando error si el estudiante no se puede identificar en memoria ni storage', async () => {
        mockedUseAuth.mockReturnValue({ user: null });
        mockedReadStoredAuthUser.mockReturnValue(null);

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(result.current.enrollmentError).toBe('No se pudo identificar al estudiante autenticado.');
        expect(result.current.enrolledList).toEqual([]);
        expect(mockedApi.get).not.toHaveBeenCalled();
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
        expect(mockedApi.get).toHaveBeenCalledWith('/api/auth/my-active-courses', {
            params: { username: 'student_from_storage' }
        });
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
    });

    it('debe aplicar la normalización adaptativa estricta contra payloads heterogéneos y filtrar registros sin ID', async () => {
        mockedUseAuth.mockReturnValue({ user: { username: 'adaptive_user' } });
        mockedApi.get.mockResolvedValueOnce({ status: 200, data: mockHeterogeneousPayload });

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(result.current.enrolledList).toHaveLength(1);
        expect(console.warn).toHaveBeenCalledTimes(1);

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
    });
    // --- BLOQUE 2: GESTIÓN DE EXCEPCIONES Y ACCIONES EN CALIENTE ---
    it('debe capturar errores de pasarela HTTP de red de forma asíncrona y transparente mutando el error', async () => {
        mockedUseAuth.mockReturnValue({ user: { username: 'error_user' } });
        mockedApi.get.mockRejectedValueOnce(new Error('PostgreSQL connections exhausted'));

        const { result } = renderHook(() => useEnrolledCourses('init'));

        await waitFor(() => {
            expect(result.current.loadingEnrollments).toBe(false);
        });

        expect(result.current.enrolledList).toEqual([]);
        expect(result.current.enrollmentError).toBe('No se pudieron sincronizar tus asignaturas activas desde PostgreSQL.');
        expect(console.error).toHaveBeenCalledTimes(1);
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
});
