import { apiClient } from './apiClient';
import axios from 'axios';

type BackendErrorPayload = {
    message?: string;
    error?: string;
};

export interface AdminGlobalTopCourse {
    courseId: number | null;
    courseTitle: string;
    enrolledStudents: number;
}

export interface AdminGlobalYearComparison {
    year: number;
    totalStudents: number;
    totalProfessors: number;
    topCourseEnrollment: number;
    realData: boolean;
}

export interface AdminGlobalStatistics {
    currentYear: number;
    totalStudents: number;
    totalProfessors: number;
    topCourses: AdminGlobalTopCourse[];
    yearlyComparisons: AdminGlobalYearComparison[];
}

export interface AdminGlobalFinalizeResponse {
    message: string;
    finalizedYear: number;
}

export const getAdminGlobalStatistics = async (): Promise<AdminGlobalStatistics> => {
    const response = await apiClient.get<AdminGlobalStatistics>('/api/admin/statistics/global');
    return response.data;
};

export const finalizeAdminGlobalPreviousYear = async (): Promise<AdminGlobalFinalizeResponse> => {
    const response = await apiClient.post<AdminGlobalFinalizeResponse>('/api/admin/statistics/global/finalize-previous-year');
    return response.data;
};

export const resolveAdminGlobalStatisticsErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
        const payload = err.response?.data as BackendErrorPayload | undefined;
        const backendMessage = payload?.message ?? payload?.error;
        if (backendMessage) {
            return backendMessage;
        }
    }
    return 'No se pudo cargar el panel estadístico global.';
};
