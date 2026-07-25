// frontend/src/services/adminUserService.ts
import { apiClient } from './apiClient';
import axios from 'axios';
import type { UserEntity } from './userDomains';

/**
 * Servicio del "Buscador de Usuarios" del panel de administración.
 * Centraliza las 3 llamadas al backend que antes vivían inline en
 * AdminDashboard.tsx: búsqueda directa, cambio de rol y baja/reactivación
 * lógica de un usuario.
 */

export const searchUserByUsername = async (username: string): Promise<UserEntity> => {
    const cleanName = username.trim();
    const response = await apiClient.get<UserEntity>(`/api/auth/${cleanName}`);
    return response.data;
};

export const resolveSearchErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err) && err.response?.status === 500) {
        return 'Error 500 del servidor al procesar la búsqueda en la entidad.';
    }
    return 'Usuario no encontrado en las tablas de la base de datos.';
};

export const updateUserRole = async (username: string, newRole: string): Promise<void> => {
    await apiClient.patch(`/api/auth/users/${username}/role`, { role: newRole });
};

export const resolveRoleUpdateErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
        return err.response.data.message;
    }
    return 'No se pudo actualizar el rol en la base de datos.';
};

export const toggleUserStatus = async (username: string): Promise<{ message: string; enabled: boolean }> => {
    const response = await apiClient.delete(`/api/auth/users/${username}`);
    return { message: response.data.message, enabled: response.data.enabled };
};

export const resolveStatusToggleErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err) && err.response?.data?.error) {
        return err.response.data.error;
    }
    return 'Error crítico: No se pudo modificar el estado del usuario.';
};
