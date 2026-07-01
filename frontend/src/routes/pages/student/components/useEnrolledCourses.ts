import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../../services/apiClient';
import { useAuth } from '../../../../auth/useAuth';
import { readStoredAuthUser } from '../../../../auth/authStorage';
import type { DBModelCourse } from './useCourseCatalog';

export interface EnrollmentInfo {
    enrollmentid: number;
    enrolled_at: string;
    status: string;
    progress_percentage: number;
    course: DBModelCourse;
}

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
                // 3. Mapeo adaptativo tolerante a la nomenclatura del ORM (course vs courses)
                const normalizedData = response.data.map((enrollment) => {
                    const courseData = (enrollment.course || enrollment.courses || enrollment) as Record<string, unknown>;
                    
                    return {
                        enrollmentid: Number(enrollment.enrollmentid || Date.now()),
                        enrolled_at: String(enrollment.enrolled_at || new Date().toISOString()),
                        status: String(enrollment.status || "EN_PROGRESO"),
                        progress_percentage: Number(enrollment.progress_percentage ?? enrollment.progress ?? 0),
                        course: {
                            course_id: Number(courseData.course_id || courseData.id || 0),
                            title: String(courseData.title || ""),
                            category: String(courseData.category || "General"),
                            instructors: String(courseData.instructors || "Por asignar")
                        }
                    };
                });

                setEnrolledList(normalizedData);
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
    const injectLocalEnrollment = (course: DBModelCourse) => {
        setEnrolledList((prev) => {
            const exists = prev.some(e => e.course.course_id === course.course_id);
            if (exists) return prev;

            return [
                ...prev,
                {
                    enrollmentid: Date.now(),
                    enrolled_at: new Date().toISOString(),
                    status: "EN_PROGRESO",
                    progress_percentage: 0,
                    course: course
                }
            ];
        });
    };

    return {
        enrolledList,
        loadingEnrollments,
        enrollmentError,
        injectLocalEnrollment
    };
};
