// frontend/src/routes/pages/admin/components/useUserSearch.ts
import { useState } from 'react';
import {
    searchUserByUsername,
    resolveSearchErrorMessage,
    updateUserRole,
    resolveRoleUpdateErrorMessage,
    toggleUserStatus,
    resolveStatusToggleErrorMessage
} from '../../../../services/adminUserService';
import type { UserEntity } from '../../../../services/userDomains';

/**
 * Hook del "Buscador de Usuarios" [espejo de useGradingCenter / useCourseManagement].
 * Encapsula la búsqueda de un usuario por nombre, el cambio de rol y la
 * baja/reactivación lógica, dejando el componente visual limpio de lógica
 * de red.
 *
 * @param currentAdminUsername Nombre del administrador autenticado, usado
 * para bloquear el autoborrado por seguridad.
 */
export const useUserSearch = (currentAdminUsername: string) => {
    const [searchName, setSearchName] = useState<string>('');
    const [foundUser, setFoundUser] = useState<UserEntity | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const handleSearchUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchName.trim()) return;

        setLoading(true);
        setError('');
        setFoundUser(null);
        try {
            const user = await searchUserByUsername(searchName);
            setFoundUser(user);
        } catch (err) {
            console.error('Error al consultar el usuario en PostgreSQL:', err);
            setError(resolveSearchErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (targetId: number, newRole: string) => {
        if (!foundUser) return;
        setUpdatingId(targetId);
        setError('');

        try {
            await updateUserRole(foundUser.username, newRole);
            setFoundUser({ ...foundUser, role: newRole });
        } catch (err) {
            console.error('Error al cambiar el rol en el servidor:', err);
            setError(resolveRoleUpdateErrorMessage(err));
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDeleteUser = async () => {
        if (!foundUser) return;

        if (foundUser.username.toLowerCase() === currentAdminUsername.toLowerCase()) {
            setError('Acción denegada: El sistema bloquea el autoborrado por seguridad.');
            return;
        }

        const operacionTexto = foundUser.enabled ? 'Baja temporal' : 'reactivar y dar de alta';
        const confirmed = window.confirm(
            `¿Estás seguro de cambiar el estado de acceso de ${foundUser.username} para ${operacionTexto}?`
        );
        if (!confirmed) return;

        setDeleting(true);
        setError('');

        try {
            const { message, enabled } = await toggleUserStatus(foundUser.username);
            alert(message);
            setFoundUser({ ...foundUser, enabled });
        } catch (err) {
            console.error('Error en la petición de baja temporal:', err);
            setError(resolveStatusToggleErrorMessage(err));
        } finally {
            setDeleting(false);
        }
    };

    return {
        searchName,
        setSearchName,
        foundUser,
        loading,
        updatingId,
        deleting,
        error,
        handleSearchUser,
        handleRoleChange,
        handleDeleteUser
    };
};
