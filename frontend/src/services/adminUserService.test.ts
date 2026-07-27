import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    searchUserByUsername,
    resolveSearchErrorMessage,
    updateUserRole,
    resolveRoleUpdateErrorMessage,
    toggleUserStatus,
    resolveStatusToggleErrorMessage,
    deleteUserPermanently,
    resolvePermanentDeleteErrorMessage
} from './adminUserService';
import { apiClient } from './apiClient';
import axios from 'axios';

vi.mock('./apiClient', () => ({
    apiClient: {
        get: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn()
    }
}));

vi.mock('axios', () => ({
    default: {
        isAxiosError: vi.fn()
    }
}));

describe('adminUserService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('searchUserByUsername recorta espacios y consulta el endpoint correcto', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({
            data: {
                userId: 10,
                username: 'Laura',
                role: 'STUDENT',
                enabled: true
            }
        });

        const result = await searchUserByUsername('  Laura  ');

        expect(apiClient.get).toHaveBeenCalledWith('/api/auth/Laura');
        expect(result).toEqual({
            userId: 10,
            username: 'Laura',
            role: 'STUDENT',
            enabled: true
        });
    });

    it('resolveSearchErrorMessage devuelve mensaje 500 cuando corresponde', () => {
        const err = { response: { status: 500 } };
        vi.mocked(axios.isAxiosError).mockReturnValue(true);

        const msg = resolveSearchErrorMessage(err);

        expect(msg).toBe('Error 500 del servidor al procesar la búsqueda en la entidad.');
    });

    it('resolveSearchErrorMessage devuelve fallback para otros errores', () => {
        vi.mocked(axios.isAxiosError).mockReturnValue(false);

        const msg = resolveSearchErrorMessage(new Error('boom'));

        expect(msg).toBe('Usuario no encontrado en las tablas de la base de datos.');
    });

    it('updateUserRole llama PATCH con payload esperado', async () => {
        vi.mocked(apiClient.patch).mockResolvedValue({});

        await updateUserRole('laura_student', 'PROFESSOR');

        expect(apiClient.patch).toHaveBeenCalledWith('/api/auth/users/laura_student/role', {
            role: 'PROFESSOR'
        });
    });

    it('resolveRoleUpdateErrorMessage devuelve message del backend si existe', () => {
        const err = { response: { data: { message: 'Rol inválido' } } };
        vi.mocked(axios.isAxiosError).mockReturnValue(true);

        const msg = resolveRoleUpdateErrorMessage(err);

        expect(msg).toBe('Rol inválido');
    });

    it('resolveRoleUpdateErrorMessage devuelve fallback si no hay message', () => {
        vi.mocked(axios.isAxiosError).mockReturnValue(false);

        const msg = resolveRoleUpdateErrorMessage(new Error('x'));

        expect(msg).toBe('No se pudo actualizar el rol en la base de datos.');
    });

    it('toggleUserStatus devuelve solo message y enabled', async () => {
        vi.mocked(apiClient.delete).mockResolvedValue({
            data: {
                message: 'Usuario suspendido temporalmente',
                enabled: false,
                ignored: 'extra'
            }
        });

        const result = await toggleUserStatus('laura_student');

        expect(apiClient.delete).toHaveBeenCalledWith('/api/auth/users/laura_student');
        expect(result).toEqual({
            message: 'Usuario suspendido temporalmente',
            enabled: false
        });
    });

    it('resolveStatusToggleErrorMessage devuelve message del backend si existe', () => {
        const err = { response: { data: { message: 'Cuenta protegida por politica interna.' } } };
        vi.mocked(axios.isAxiosError).mockReturnValue(true);

        const msg = resolveStatusToggleErrorMessage(err);

        expect(msg).toBe('Cuenta protegida por politica interna.');
    });

    it('resolveStatusToggleErrorMessage mantiene compatibilidad con payload error', () => {
        const err = { response: { data: { error: 'Acción denegada' } } };
        vi.mocked(axios.isAxiosError).mockReturnValue(true);

        const msg = resolveStatusToggleErrorMessage(err);

        expect(msg).toBe('Acción denegada');
    });

    it('resolveStatusToggleErrorMessage devuelve fallback para otros errores', () => {
        vi.mocked(axios.isAxiosError).mockReturnValue(false);

        const msg = resolveStatusToggleErrorMessage(new Error('x'));

        expect(msg).toBe('Error crítico: No se pudo modificar el estado del usuario.');
    });

    it('deleteUserPermanently llama DELETE al endpoint /permanent y devuelve solo el message', async () => {
        vi.mocked(apiClient.delete).mockResolvedValue({
            data: {
                message: "El usuario 'laura_student' ha sido eliminado permanentemente de PostgreSQL.",
                extraCampoIgnorado: true
            }
        });

        const result = await deleteUserPermanently('laura_student');

        expect(apiClient.delete).toHaveBeenCalledWith('/api/auth/users/laura_student/permanent');
        expect(result).toEqual({
            message: "El usuario 'laura_student' ha sido eliminado permanentemente de PostgreSQL."
        });
    });

    it('resolvePermanentDeleteErrorMessage devuelve message del backend si existe', () => {
        const err = { response: { data: { message: 'Acción denegada: no puedes eliminarte permanentemente a ti mismo.' } } };
        vi.mocked(axios.isAxiosError).mockReturnValue(true);

        const msg = resolvePermanentDeleteErrorMessage(err);

        expect(msg).toBe('Acción denegada: no puedes eliminarte permanentemente a ti mismo.');
    });

    it('resolvePermanentDeleteErrorMessage mantiene compatibilidad con payload error', () => {
        const err = { response: { data: { error: 'Acción denegada: cuenta protegida.' } } };
        vi.mocked(axios.isAxiosError).mockReturnValue(true);

        const msg = resolvePermanentDeleteErrorMessage(err);

        expect(msg).toBe('Acción denegada: cuenta protegida.');
    });

    it('resolvePermanentDeleteErrorMessage devuelve el fallback para otros errores', () => {
        vi.mocked(axios.isAxiosError).mockReturnValue(false);

        const msg = resolvePermanentDeleteErrorMessage(new Error('boom'));

        expect(msg).toBe('Error crítico: No se pudo eliminar permanentemente al usuario.');
    });
});
