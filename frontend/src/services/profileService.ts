import { apiClient } from './apiClient'; // Ajustado al nombre exacto de tu archivo

export interface ProfileData {
    username: string;
    email: string;
    role: string;
    avatarPath: string | null;
    phoneNumber: string | null;
    homeAddress: string | null;
}

export interface ProfileUpdateInput {
    email: string;
    phoneNumber: string;
    homeAddress: string;
}

/**
 * Obtiene los datos completos del perfil del usuario autenticado.
 */
export const getProfile = async (): Promise<ProfileData> => {
    const response = await apiClient.get<ProfileData>('/api/v1/profile');
    return response.data;
};

/**
 * Actualiza los datos de texto (correo, teléfono, dirección).
 */
export const updateProfileData = async (data: ProfileUpdateInput): Promise<{ message: string }> => {
    const response = await apiClient.put<{ message: string }>('/api/v1/profile/update', data);
    return response.data;
};

/**
 * Sube y actualiza la foto de perfil en el backend (Multipart/Form-Data).
 */
export const uploadAvatarFile = async (file: File): Promise<{ message: string; path: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{ message: string; path: string }>(
        '/api/v1/profile/avatar',
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }
    );
    return response.data;
};
