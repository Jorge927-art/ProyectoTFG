import { apiClient } from './apiClient';
import axios from 'axios';

type BackendErrorPayload = {
    message?: string;
    error?: string;
};

export interface CourseSearchResult {
    courseId: number;
    title: string;
    category: string;
}

export interface EnrolledUser {
    userId: number;
    username: string;
    role: 'STUDENT' | 'PROFESSOR';
    enabled: boolean;
}

export interface CourseDetail {
    courseId: number;
    title: string;
    professor: EnrolledUser | null;
    students: EnrolledUser[];
}

export interface CourseUserStats {
    activeStudentsInCourse: number;
    studentProgressPercentage: number | null; // null si es el profesor
    courseAverageProgressPercentage: number;
    studentGrades: { title: string; score: number }[];
    workGrade: number | null;
    finalExamGrade: number | null;
    completionRatePercentage: number;
    averageCourseRating: number | null;
    averageInstructorRating: number | null;
}

export interface CourseCollectiveStats {
    activeStudentsInCourse: number;
    courseAverageProgressPercentage: number;
    completionRatePercentage: number;
    averageCourseRating: number | null;
    averageInstructorRating: number | null;
    averageGrade: number | null;
    averageWorkGrade: number | null;
    averageFinalExamGrade: number | null;
}

export const searchCourses = async (keyword: string): Promise<CourseSearchResult[]> => {
    const response = await apiClient.get<CourseSearchResult[]>('/api/admin/courses/search', {
        params: { keyword }
    });
    return response.data;
};

export const getCourseDetail = async (courseId: number): Promise<CourseDetail> => {
    const response = await apiClient.get<CourseDetail>(`/api/admin/courses/${courseId}`);
    return response.data;
};

export const getCourseUserStats = async (courseId: number, userId: number): Promise<CourseUserStats> => {
    const response = await apiClient.get<CourseUserStats>(`/api/admin/courses/${courseId}/users/${userId}/stats`);
    return response.data;
};

export const getCourseCollectiveStats = async (courseId: number): Promise<CourseCollectiveStats> => {
    const response = await apiClient.get<CourseCollectiveStats>(`/api/admin/courses/${courseId}/collective-stats`);
    return response.data;
};

export const resolveCourseInsightErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
        const payload = err.response?.data as BackendErrorPayload | undefined;
        const backendMessage = payload?.message ?? payload?.error;
        if (backendMessage) {
            return backendMessage;
        }
    }
    return 'Error al consultar la información estadística del curso.';
};