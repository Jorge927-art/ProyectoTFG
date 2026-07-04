import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../../services/apiClient';
import { useAuth } from '../../../../auth/useAuth';
import { readStoredAuthUser } from '../../../../auth/authStorage';
import type { EnrollmentInfo} from '../../../../services/courseTypes';

export const useEnrolledCourses = (successTrigger: string) => {
    const { user } = useAuth();
    const [enrolledList, setEnrolledList] = useState<EnrollmentInfo[]>([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState<boolean>(false);
    const [enrollmentError, setEnrollmentError] = useState<string>('');

    /**
     * Recupera las asignaturas activas del estudiante pasando el username como parámetro.
     * Sincroniza el contrato de red con el endpoint especializado del Backend.
     */
    const fetchStudentEnrollments = useCallback(async () => {
        setLoadingEnrollments(true);
        setEnrollmentError('');
        try {
            const currentUsername = user?.username?.trim() ?? readStoredAuthUser()?.username?.trim();

            if (!currentUsername) {
                setEnrollmentError('No se pudo identificar al estudiante autenticado.');
                return;
            }

            const response = await apiClient.get<Record<string, unknown>[]>('/api/auth/my-active-courses', {
                params: { username: currentUsername }
            });

            if (response.status === 200 && response.data) {
                // Mapeo adaptativo estricto
                const normalizedData = response.data.map((enrollment) => {
                    const courseData = (enrollment.course || enrollment.courses || enrollment) as Record<string, unknown>;
                    
                    // [CORRECCIÓN CRÍTICA CRASH]: Forzar la extracción exacta de PostgreSQL (en minúsculas)
                    const rawEnrollmentId = enrollment.enrollmentid ?? enrollment.enrollmentId;
                    const safeCourseId = Number(courseData.course_id || courseData.id || 0);

                    // Si llega a ser undefined por un fallo de payload, lanzamos un warning controlado para depurar
                    if (!rawEnrollmentId) {
                        console.warn(`[WARN TFG] Matrícula detectada sin ID físico de base de datos para el curso: ${courseData.title}`);
                    }

                    return {
                        // Mantenemos la integridad estricta del ID numérico real. Nunca un fallback falso.
                        enrollmentid: rawEnrollmentId ? Number(rawEnrollmentId) : 0,
                        enrolled_at: String(enrollment.enrolled_at || new Date().toISOString()),
                        
                        // Sello de tiempo del cronómetro
                        started_at: enrollment.started_at || enrollment.startedAt ? String(enrollment.started_at || enrollment.startedAt) : null,
                        
                        status: String(enrollment.status || "EN_PROGRESO"),
                        progress_percentage: Number(enrollment.progress_percentage ?? enrollment.progress ?? 0),
                        course: {
                            course_id: safeCourseId,
                            title: String(courseData.title || ""),
                            category: String(courseData.category || "General"),
                            instructors: String(courseData.instructors || "Por asignar"),
                            duration: Number(courseData.duration || 0)
                        }
                    };
                });

                // Filtrar cualquier fila corrupta que haya venido sin ID real para proteger el DOM virtual de React
                const validEnrollments = normalizedData.filter(e => e.enrollmentid !== 0);
                setEnrolledList(validEnrollments as EnrollmentInfo[]);
            }
        } catch (err) {
            console.error("Error crítico en la pasarela HTTP de matrículas:", err);
            setEnrollmentError("No se pudieron sincronizar tus asignaturas activas desde PostgreSQL.");
        } finally {
            setLoadingEnrollments(false);
        }
    }, [user?.username]);

    // Reactividad: Se ejecuta al montar el componente y cada vez que cambia el successTrigger
    useEffect(() => {
        fetchStudentEnrollments();
    }, [successTrigger, fetchStudentEnrollments]);

        /**
     * Inyecta de forma optimista la matrícula en caliente en el estado local
     */
    const injectLocalEnrollment = () => {
        // Al ser una inserción optimista local inmediata sin ID de DB asignado aún,
        // forzamos el refresco limpio desde PostgreSQL para evitar IDs temporales que rompan las keys.
        fetchStudentEnrollments();
    };


    return {
        enrolledList,
        loadingEnrollments,
        enrollmentError,
        injectLocalEnrollment,
        fetchStudentEnrollments
    };
};
