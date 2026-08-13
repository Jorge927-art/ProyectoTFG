import { apiClient } from './apiClient';

export type ProfessorAlertType = 'INITIAL_CONTACT' | 'MATERIAL_DISPATCH' | 'FINAL_EXAM';
export type ProfessorAlertStatus = 'PENDING' | 'VIEWED' | 'RESOLVED';

export interface ProfessorCourseAlert {
    alertId: number;
    alertType: ProfessorAlertType;
    status: ProfessorAlertStatus;
    checkpointIndex: number;
    checkpointPercent: number;
    courseId: number;
    courseTitle: string;
    studentUserId: number;
    studentUsername: string;
    title: string;
    message: string;
    createdAt: string;
    bellDismissed: boolean;
}

export interface CourseDispatchConfig {
    courseId: number;
    dispatchParts: number;
    examThreshold: number;
    intermediateCheckpoints: number[];
}

export interface CourseDispatchConfigEnvelope {
    configured: boolean;
    config?: CourseDispatchConfig;
}

export const assignTeacherWithAlertConfig = async (courseId: number, dispatchParts: number) => {
    const response = await apiClient.post(`/api/courses/${courseId}/assign-teacher-with-alert-config`, {
        dispatchParts,
    });
    return response.data;
};

export const getProfessorAlerts = async (): Promise<ProfessorCourseAlert[]> => {
    const response = await apiClient.get<ProfessorCourseAlert[]>('/api/professor/alerts');
    return Array.isArray(response.data) ? response.data : [];
};

export const updateProfessorAlertStatus = async (
    alertId: number,
    status: ProfessorAlertStatus
): Promise<ProfessorCourseAlert> => {
    const response = await apiClient.patch<ProfessorCourseAlert>(`/api/professor/alerts/${alertId}/status`, { status });
    return response.data;
};

export const dismissProfessorBellAlert = async (alertId: number): Promise<void> => {
    await apiClient.patch(`/api/professor/alerts/${alertId}/dismiss-bell`);
};

export const getCourseDispatchConfig = async (courseId: number): Promise<CourseDispatchConfigEnvelope> => {
    const response = await apiClient.get<CourseDispatchConfigEnvelope>(`/api/professor/alerts/course/${courseId}/config`);
    return response.data;
};

export const dismissSingleNotification = async (notificationId: number | null, type: string): Promise<void> => {
    await apiClient.patch('/api/auth/notifications/dismiss-one', {
        notificationId,
        type,
    });
};
