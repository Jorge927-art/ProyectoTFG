import axios from 'axios';
import { apiClient } from './apiClient';

export interface AdminCourseCatalogItem {
    courseId: number;
    title: string | null;
    url: string | null;
    shortIntro: string | null;
    category: string | null;
    subCategory: string | null;
    courseType: string | null;
    language: string | null;
    subtitleLanguages: string | null;
    skills: string | null;
    instructors: string | null;
    rating: number | null;
    numOfViewers: number | null;
    duration: number | null;
    site: string;
    used: boolean;
}

export interface AdminCourseCreatePayload {
    title: string;
    url?: string | null;
    shortIntro?: string | null;
    category?: string | null;
    subCategory?: string | null;
    courseType?: string | null;
    language?: string | null;
    subtitleLanguages?: string | null;
    skills?: string | null;
    instructors?: string | null;
    rating?: number | null;
    numOfViewers?: number | null;
    duration?: number | null;
}

type BackendErrorPayload = {
    message?: string;
    error?: string;
};

export const getAdminCourseCatalog = async (): Promise<AdminCourseCatalogItem[]> => {
    const response = await apiClient.get<AdminCourseCatalogItem[]>('/api/admin/courses/catalog');
    return Array.isArray(response.data) ? response.data : [];
};

export const createAdminCourse = async (payload: AdminCourseCreatePayload): Promise<AdminCourseCatalogItem> => {
    const response = await apiClient.post<AdminCourseCatalogItem>('/api/admin/courses', payload);
    return response.data;
};

export const patchAdminCourse = async (
    courseId: number,
    changes: Record<string, unknown>
): Promise<AdminCourseCatalogItem> => {
    const response = await apiClient.patch<AdminCourseCatalogItem>(`/api/admin/courses/${courseId}`, changes);
    return response.data;
};

export const deleteAdminCourse = async (courseId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/api/admin/courses/${courseId}`);
    return response.data;
};

export const resolveAdminCourseCatalogError = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
        const payload = err.response?.data as BackendErrorPayload | undefined;
        const backendMessage = payload?.message ?? payload?.error;
        if (backendMessage) {
            return backendMessage;
        }
    }
    return 'No se pudo completar la operación solicitada sobre el catálogo de cursos.';
};
