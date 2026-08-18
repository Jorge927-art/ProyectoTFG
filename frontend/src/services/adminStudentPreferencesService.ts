import { apiClient } from './apiClient';
import axios from 'axios';

export interface AdminStudentPreferenceSummary {
    dimension: string;
    values: string[];
    selections: number;
    analyzedStudents: number;
}

export interface AdminCourseDemand {
    courseId: number;
    title: string | null;
    totalScore: number;
    categoryScore: number;
    enrollmentScore: number;
    levelScore: number;
    languageScore: number;
    subtitleScore: number;
    durationScore: number;
    activeEnrollments: number;
    professorAssigned: boolean;
    professorUsername: string | null;
}

export interface AdminStudentPreferences {
    studentsWithPreferences: number;
    activeStudentsWithEnrollments: number;
    preferences: AdminStudentPreferenceSummary[];
    courses: AdminCourseDemand[];
}

export const getAdminStudentPreferences = async (): Promise<AdminStudentPreferences> => {
    const response = await apiClient.get<AdminStudentPreferences>('/api/admin/statistics/student-preferences', {
        timeout: 30000,
    });
    return response.data;
};

export const resolveAdminStudentPreferencesError = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        const payload = error.response?.data as { message?: string; error?: string } | undefined;
        const backendMessage = payload?.message ?? payload?.error;
        if (backendMessage) {
            return backendMessage;
        }
    }
    return 'No se pudo actualizar el análisis de preferencias de los alumnos.';
};
