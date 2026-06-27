import { useState, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';
import axios from 'axios';
import type { DBModelCourse } from './useCourseCatalog';

export interface EnrollmentInfo {
    enrollmentid: number;
    enrolled_at: string;
    status: string;
    progress_percentage: number;
    course: DBModelCourse;
}

export const useEnrolledCourses = (successTrigger: string) => {
    const [enrolledList, setEnrolledList] = useState<EnrollmentInfo[]>([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState<boolean>(false);
    const [enrollmentError, setEnrollmentError] = useState<string>('');

    const fetchStudentEnrollments = async () => {
        setLoadingEnrollments(true);
        setEnrollmentError('');
        try {
            const authUser = localStorage.getItem('auth_user');
            if (!authUser) return;

            const parsedUser = JSON.parse(authUser);
            const currentUsername = parsedUser?.username || "luis";

            const response = await apiClient.get(`/api/auth/${encodeURIComponent(currentUsername.trim().toLowerCase())}`);

            if (response.status === 200 && response.data.enrollments) {
                setEnrolledList(response.data.enrollments as EnrollmentInfo[]);
            }
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 400) {
                setEnrolledList([
                    {
                        enrollmentid: 1,
                        enrolled_at: new Date().toISOString(),
                        status: "EN_PROGRESO",
                        progress_percentage: 0,
                        course: {
                            course_id: 2,
                            title: "Introduction to Data Science Specialization",
                            category: "Data Science",
                            instructors: "Raymond Xie"
                        }
                    }
                ]);
            } else {
                console.error("Error al recuperar las matrículas:", err);
                setEnrollmentError("No se pudieron sincronizar tus asignaturas activas.");
            }
        } finally {
            setLoadingEnrollments(false);
        }
    };

    useEffect(() => {
        fetchStudentEnrollments();
    }, [successTrigger]);

    const injectLocalEnrollment = (course: DBModelCourse) => {
        setEnrolledList((prev) => [
            ...prev,
            {
                enrollmentid: Date.now(),
                enrolled_at: new Date().toISOString(),
                status: "EN_PROGRESO",
                progress_percentage: 0,
                course: course
            }
        ]);
    };

    return {
        enrolledList,
        loadingEnrollments,
        enrollmentError,
        injectLocalEnrollment
    };
};
