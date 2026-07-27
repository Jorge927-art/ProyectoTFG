// frontend/src/services/adminUserService.ts
import { apiClient } from './apiClient';
import axios from 'axios';
import type { UserEntity } from './userDomains';

/**
 * Busca un usuario por su nombre de usuario.
 *
 * @param username El nombre de usuario del usuario a buscar.
 * @returns Una promesa que se resuelve con la entidad del usuario encontrado.
 */

export const searchUserByUsername = async (username: string): Promise<UserEntity> => {
    const cleanName = username.trim();
    const response = await apiClient.get<UserEntity>(`/api/auth/${cleanName}`);
    return response.data;
};

/**
 * Resuelve el mensaje de error al buscar un usuario.
 *
 * @param err El error ocurrido durante la búsqueda.
 * @returns Un mensaje de error legible para el usuario.
 */
export const resolveSearchErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err) && err.response?.status === 500) {
        return 'Error 500 del servidor al procesar la búsqueda en la entidad.';
    }
    return 'Usuario no encontrado en las tablas de la base de datos.';
};

/**
 * Actualiza el rol de un usuario.
 *
 * @param username El nombre de usuario del usuario cuyo rol se va a actualizar.
 * @param newRole El nuevo rol a asignar al usuario.
 * @returns Una promesa que se resuelve cuando se completa la actualización del rol.
 */
export const updateUserRole = async (username: string, newRole: string): Promise<void> => {
    await apiClient.patch(`/api/auth/users/${username}/role`, { role: newRole });
};

/**
 * Resuelve el mensaje de error al actualizar el rol de un usuario.
 *
 * @param err El error ocurrido durante la actualización del rol.
 * @returns Un mensaje de error legible para el usuario.
 */
export const resolveRoleUpdateErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
        return err.response.data.message;
    }
    return 'No se pudo actualizar el rol en la base de datos.';
};

/**
 * Alterna el estado de un usuario (habilitado/deshabilitado).
 *
 * @param username El nombre de usuario del usuario cuyo estado se va a alternar.
 * @returns Una promesa que se resuelve con un mensaje y el nuevo estado del usuario.
 */
export const toggleUserStatus = async (username: string): Promise<{ message: string; enabled: boolean }> => {
    const response = await apiClient.delete(`/api/auth/users/${username}`);
    return { message: response.data.message, enabled: response.data.enabled };
};

/**
 * Resuelve el mensaje de error al alternar el estado de un usuario.
 *
 * @param err El error ocurrido durante la alternancia del estado.
 * @returns Un mensaje de error legible para el usuario.
 */
export const resolveStatusToggleErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err) && err.response?.data?.error) {
        return err.response.data.error;
    }
    return 'Error crítico: No se pudo modificar el estado del usuario.';
};

/**
 * Elimina permanentemente a un usuario.
 *
 * @param username El nombre de usuario del usuario a eliminar permanentemente.
 * @returns Una promesa que se resuelve con un mensaje de confirmación.
 */
export const deleteUserPermanently = async (username: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/auth/users/${username}/permanent`);
    return { message: response.data.message };
};

/**
 * Resuelve el mensaje de error al eliminar permanentemente a un usuario.
 *
 * @param err El error ocurrido durante la eliminación permanente.
 * @returns Un mensaje de error legible para el usuario.
 */
export const resolvePermanentDeleteErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err) && err.response?.data?.error) {
        return err.response.data.error;
    }
    return 'Error crítico: No se pudo eliminar permanentemente al usuario.';
};