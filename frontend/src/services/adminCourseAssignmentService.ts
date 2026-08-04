import axios from 'axios';
import { apiClient } from './apiClient';

export interface AdminProfessorOption {
    userId: number;
    username: string;
}

export interface AdminProfessorCourse {
    courseId: number;
    title: string;
    currentProfessorUserId: number;
    currentProfessorUsername: string;
}

export interface AdminCourseProfessorReassignmentResult {
    message: string;
    courseId: number;
    courseTitle: string;
    previousProfessorUserId: number;
    previousProfessorUsername: string;
    newProfessorUserId: number;
    newProfessorUsername: string;
}

type BackendErrorPayload = {
    message?: string;
    error?: string;
};

const resolveBackendError = (err: unknown, fallback: string): string => {
    if (!axios.isAxiosError(err)) {
        return fallback;
    }
    const payload = err.response?.data as BackendErrorPayload | undefined;
    return payload?.message ?? payload?.error ?? fallback;
};

export const getAdminProfessorOptions = async (): Promise<AdminProfessorOption[]> => {
    const response = await apiClient.get<AdminProfessorOption[]>('/api/admin/course-assignments/professors');
    return Array.isArray(response.data) ? response.data : [];
};

export const getAdminCoursesByProfessor = async (professorId: number): Promise<AdminProfessorCourse[]> => {
    const response = await apiClient.get<AdminProfessorCourse[]>(`/api/admin/course-assignments/professors/${professorId}/courses`);
    return Array.isArray(response.data) ? response.data : [];
};

export const reassignAdminCourseProfessor = async (
    courseId: number,
    professorId: number
): Promise<AdminCourseProfessorReassignmentResult> => {
    const response = await apiClient.patch<AdminCourseProfessorReassignmentResult>(
        `/api/admin/course-assignments/courses/${courseId}/reassign-professor`,
        { professorId }
    );
    return response.data;
};

export const resolveAdminCourseAssignmentError = (err: unknown): string => {
    return resolveBackendError(err, 'No se pudo completar la reasignación del profesor para el curso.');
};
