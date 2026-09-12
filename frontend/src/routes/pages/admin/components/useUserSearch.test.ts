// frontend/src/routes/pages/admin/components/useUserSearch.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserSearch } from './useUserSearch';
import {
    searchUserByUsername,
    resolveSearchErrorMessage,
    updateUserRole,
    resolveRoleUpdateErrorMessage,
    toggleUserStatus,
    resolveStatusToggleErrorMessage,
    deleteUserPermanently,
    resolvePermanentDeleteErrorMessage
} from '../../../../services/adminUserService';
import type { UserEntity } from '../../../../services/userDomains';

vi.mock('../../../../services/adminUserService', () => ({
    searchUserByUsername: vi.fn(),
    resolveSearchErrorMessage: vi.fn(),
    updateUserRole: vi.fn(),
    resolveRoleUpdateErrorMessage: vi.fn(),
    toggleUserStatus: vi.fn(),
    resolveStatusToggleErrorMessage: vi.fn(),
    deleteUserPermanently: vi.fn(),
    resolvePermanentDeleteErrorMessage: vi.fn()
}));

describe('useUserSearch', () => {
    const sampleUserEntity: UserEntity = {
        userId: 101,
        username: 'laura_student',
        role: 'STUDENT',
        enabled: true
    };

    const adminUserEntity: UserEntity = {
        userId: 999,
        username: 'root_admin',
        role: 'ADMIN',
        enabled: true
    };

    const fakeFormEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('confirm', vi.fn(() => true));
        vi.stubGlobal('alert', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('busca un usuario y lo hidrata en foundUser', async () => {
        vi.mocked(searchUserByUsername).mockResolvedValue(sampleUserEntity);

        const { result } = renderHook(() => useUserSearch('root_admin'));

        act(() => {
            result.current.setSearchName('laura_student');
        });

        await act(async () => {
            await result.current.handleSearchUser(fakeFormEvent);
        });

        expect(searchUserByUsername).toHaveBeenCalledWith('laura_student');
        expect(result.current.foundUser).toEqual(sampleUserEntity);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('');
    });

    it('no busca si el nombre está vacío', async () => {
        const { result } = renderHook(() => useUserSearch('root_admin'));

        await act(async () => {
            await result.current.handleSearchUser(fakeFormEvent);
        });

        expect(searchUserByUsername).not.toHaveBeenCalled();
    });

    it('captura un error de búsqueda y traduce el mensaje mediante el servicio', async () => {
        const fakeError = new Error('boom');
        vi.mocked(searchUserByUsername).mockRejectedValue(fakeError);
        vi.mocked(resolveSearchErrorMessage).mockReturnValue('Usuario no encontrado en las tablas de la base de datos.');

        const { result } = renderHook(() => useUserSearch('root_admin'));

        act(() => {
            result.current.setSearchName('desconocido');
        });

        await act(async () => {
            await result.current.handleSearchUser(fakeFormEvent);
        });

        expect(resolveSearchErrorMessage).toHaveBeenCalledWith(fakeError);
        expect(result.current.error).toBe('Usuario no encontrado en las tablas de la base de datos.');
        expect(result.current.foundUser).toBeNull();
    });

    it('cambia el rol del usuario encontrado y sincroniza el estado local', async () => {
        vi.mocked(searchUserByUsername).mockResolvedValue(sampleUserEntity);
        vi.mocked(updateUserRole).mockResolvedValue(undefined);

        const { result } = renderHook(() => useUserSearch('root_admin'));

        act(() => {
            result.current.setSearchName('laura_student');
        });

        await act(async () => {
            await result.current.handleSearchUser(fakeFormEvent);
        });

        await act(async () => {
            await result.current.handleRoleChange(101, 'PROFESSOR');
        });

        expect(updateUserRole).toHaveBeenCalledWith('laura_student', 'PROFESSOR');
        expect(result.current.foundUser?.role).toBe('PROFESSOR');
        expect(result.current.updatingId).toBeNull();
    });

    it('captura un error de cambio de rol y lo traduce mediante el servicio', async () => {
        vi.mocked(searchUserByUsername).mockResolvedValue(sampleUserEntity);
        const fakeError = new Error('role-error');
        vi.mocked(updateUserRole).mockRejectedValue(fakeError);
        vi.mocked(resolveRoleUpdateErrorMessage).mockReturnValue('No se pudo actualizar el rol en la base de datos.');

        const { result } = renderHook(() => useUserSearch('root_admin'));

        act(() => {
            result.current.setSearchName('laura_student');
        });

        await act(async () => {
            await result.current.handleSearchUser(fakeFormEvent);
        });

        await act(async () => {
            await result.current.handleRoleChange(101, 'ADMIN');
        });

        expect(result.current.error).toBe('No se pudo actualizar el rol en la base de datos.');
        // El rol local no debe cambiar si el backend falló
        expect(result.current.foundUser?.role).toBe('STUDENT');
    });

    it('bloquea el autoborrado sin llamar al backend si el usuario encontrado es el administrador en sesión', async () => {
        vi.mocked(searchUserByUsername).mockResolvedValue(adminUserEntity);

        const { result } = renderHook(() => useUserSearch('root_admin'));

        act(() => {
            result.current.setSearchName('root_admin');
        });

        await act(async () => {
            await result.current.handleSearchUser(fakeFormEvent);
        });

        await act(async () => {
            await result.current.handleDeleteUser();
        });

        expect(toggleUserStatus).not.toHaveBeenCalled();
        expect(result.current.error).toBe('Acción denegada: El sistema bloquea el autoborrado por seguridad.');
    });

    it('no ejecuta la baja si el usuario cancela el diálogo de confirmación', async () => {
        vi.mocked(searchUserByUsername).mockResolvedValue(sampleUserEntity);
        vi.stubGlobal('confirm', vi.fn(() => false));

        const { result } = renderHook(() => useUserSearch('root_admin'));

        act(() => {
            result.current.setSearchName('laura_student');
        });

        await act(async () => {
            await result.current.handleSearchUser(fakeFormEvent);
        });

        await act(async () => {
            await result.current.handleDeleteUser();
        });

        expect(toggleUserStatus).not.toHaveBeenCalled();
    });

    it('ejecuta la baja/reactivación y sincroniza el estado enabled tras confirmar', async () => {
        vi.mocked(searchUserByUsername).mockResolvedValue(sampleUserEntity);
        vi.mocked(toggleUserStatus).mockResolvedValue({
            message: 'Usuario suspendido temporalmente',
            enabled: false
        });

        const { result } = renderHook(() => useUserSearch('root_admin'));

        act(() => {
            result.current.setSearchName('laura_student');
        });

        await act(async () => {
            await result.current.handleSearchUser(fakeFormEvent);
        });

        await act(async () => {
            await result.current.handleDeleteUser();
        });

        expect(window.confirm).toHaveBeenCalled();
        expect(toggleUserStatus).toHaveBeenCalledWith('laura_student');
        expect(result.current.successMessage).toBe('Usuario suspendido temporalmente');
        expect(result.current.foundUser?.enabled).toBe(false);
        expect(result.current.deleting).toBe(false);
    });

    it('captura un error de baja/reactivación y lo traduce mediante el servicio', async () => {
        vi.mocked(searchUserByUsername).mockResolvedValue(sampleUserEntity);
        const fakeError = new Error('toggle-error');
        vi.mocked(toggleUserStatus).mockRejectedValue(fakeError);
        vi.mocked(resolveStatusToggleErrorMessage).mockReturnValue('Error crítico: No se pudo modificar el estado del usuario.');

        const { result } = renderHook(() => useUserSearch('root_admin'));

        act(() => {
            result.current.setSearchName('laura_student');
        });

        await act(async () => {
            await result.current.handleSearchUser(fakeFormEvent);
        });

        await act(async () => {
            await result.current.handleDeleteUser();
        });

        expect(result.current.error).toBe('Error crítico: No se pudo modificar el estado del usuario.');
    });

    it('no intenta dar de baja si no hay usuario encontrado', async () => {
        const { result } = renderHook(() => useUserSearch('root_admin'));

        await act(async () => {
            await result.current.handleDeleteUser();
        });

        expect(toggleUserStatus).not.toHaveBeenCalled();
    });

    it('handleDeletePermanently bloquea el autoborrado del propio admin', async () => {
        vi.mocked(searchUserByUsername).mockResolvedValue(adminUserEntity);

        const { result } = renderHook(() => useUserSearch('root_admin'));

        act(() => {
            result.current.setSearchName('root_admin');
        });

        await act(async () => {
            await result.current.handleSearchUser(fakeFormEvent);
        });

        await act(async () => {
            await result.current.handleDeletePermanently();
        });

        expect(deleteUserPermanently).not.toHaveBeenCalled();
        expect(result.current.error).toBe('Acción denegada: no puedes eliminarte permanentemente a ti mismo.');
    });

    it('handleDeletePermanently no ejecuta la baja si el usuario cancela el diálogo de confirmación', async () => {
        vi.mocked(searchUserByUsername).mockResolvedValue(sampleUserEntity);
        vi.stubGlobal('confirm', vi.fn(() => false));

        const { result } = renderHook(() => useUserSearch('root_admin'));

        act(() => {
            result.current.setSearchName('laura_student');
        });

        await act(async () => {
            await result.current.handleSearchUser(fakeFormEvent);
        });

        await act(async () => {
            await result.current.handleDeletePermanently();
        });

        expect(deleteUserPermanently).not.toHaveBeenCalled();
    });

    it('handleDeletePermanently ejecuta la baja definitiva y limpia la búsqueda tras confirmar', async () => {
        vi.mocked(searchUserByUsername).mockResolvedValue(sampleUserEntity);
        vi.mocked(deleteUserPermanently).mockResolvedValue({
            message: "El usuario 'laura_student' ha sido eliminado permanentemente de PostgreSQL."
        });

        const { result } = renderHook(() => useUserSearch('root_admin'));

        act(() => {
            result.current.setSearchName('laura_student');
        });

        await act(async () => {
            await result.current.handleSearchUser(fakeFormEvent);
        });

        await act(async () => {
            await result.current.handleDeletePermanently();
        });

        expect(window.confirm).toHaveBeenCalled();
        expect(deleteUserPermanently).toHaveBeenCalledWith('laura_student');
        expect(result.current.successMessage).toBe("El usuario 'laura_student' ha sido eliminado permanentemente de PostgreSQL.");
        expect(result.current.foundUser).toBeNull();
        expect(result.current.searchName).toBe('');
        expect(result.current.deletingPermanently).toBe(false);
    });

    it('handleDeletePermanently captura un error y lo traduce mediante el servicio', async () => {
        vi.mocked(searchUserByUsername).mockResolvedValue(sampleUserEntity);
        const fakeError = new Error('delete-error');
        vi.mocked(deleteUserPermanently).mockRejectedValue(fakeError);
        vi.mocked(resolvePermanentDeleteErrorMessage).mockReturnValue('Error crítico: No se pudo eliminar permanentemente al usuario.');

        const { result } = renderHook(() => useUserSearch('root_admin'));

        act(() => {
            result.current.setSearchName('laura_student');
        });

        await act(async () => {
            await result.current.handleSearchUser(fakeFormEvent);
        });

        await act(async () => {
            await result.current.handleDeletePermanently();
        });

        expect(result.current.error).toBe('Error crítico: No se pudo eliminar permanentemente al usuario.');
        // El usuario encontrado NO debe borrarse de la vista si la petición falló
        expect(result.current.foundUser).toEqual(sampleUserEntity);
    });

    it('handleDeletePermanently no hace nada si no hay usuario encontrado', async () => {
        const { result } = renderHook(() => useUserSearch('root_admin'));

        await act(async () => {
            await result.current.handleDeletePermanently();
        });

        expect(deleteUserPermanently).not.toHaveBeenCalled();
    });
});
