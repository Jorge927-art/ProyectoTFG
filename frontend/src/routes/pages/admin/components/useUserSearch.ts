// frontend/src/routes/pages/admin/components/useUserSearch.ts
import { useState } from 'react';
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
import { USER_DIRECTORY_REFRESH_EVENT } from '../../../../components/admin/UserScrollList';

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
    const [deletingPermanently, setDeletingPermanently] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    
    /**
     * Maneja la búsqueda de un usuario por nombre de usuario.
     * @param e El evento de envío del formulario.
     * @returns Una promesa que se resuelve cuando la operación se completa.
     */
    const handleSearchUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchName.trim()) return;

        setLoading(true);
        setError('');
        setSuccessMessage('');
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
    
    /**
     * Maneja el cambio de rol de un usuario.
     *
     * @param targetId El ID del usuario cuyo rol se va a cambiar.
     * @param newRole El nuevo rol a asignar al usuario.
     * @returns Una promesa que se resuelve cuando la operación se completa.
     */
    const handleRoleChange = async (targetId: number, newRole: string) => {
        if (!foundUser) return;
        setUpdatingId(targetId);
        setError('');
        setSuccessMessage('');

        try {
            await updateUserRole(foundUser.username, newRole);
            setFoundUser({ ...foundUser, role: newRole });
            setSuccessMessage('Rol actualizado correctamente.');
            window.dispatchEvent(new Event(USER_DIRECTORY_REFRESH_EVENT));
        } catch (err) {
            console.error('Error al cambiar el rol en el servidor:', err);
            setError(resolveRoleUpdateErrorMessage(err));
        } finally {
            setUpdatingId(null);
        }
    };
    
    /**
     * Maneja la baja temporal o reactivación de un usuario.
     *
     * @returns Una promesa que se resuelve cuando la operación se completa.
     */
    const handleDeleteUser = async () => {
        if (!foundUser) return;

        if (foundUser.username.toLowerCase() === currentAdminUsername.toLowerCase()) {
            setError('Acción denegada: El sistema bloquea el autoborrado por seguridad.');
            setSuccessMessage('');
            return;
        }

        const operacionTexto = foundUser.enabled ? 'Baja temporal' : 'reactivar y dar de alta';
        const confirmed = window.confirm(
            `¿Estás seguro de cambiar el estado de acceso de ${foundUser.username} para ${operacionTexto}?`
        );
        if (!confirmed) return;

        setDeleting(true);
        setError('');
        setSuccessMessage('');

        try {
            const { message, enabled } = await toggleUserStatus(foundUser.username);
            setFoundUser({ ...foundUser, enabled });
            setSuccessMessage(message);
            window.dispatchEvent(new Event(USER_DIRECTORY_REFRESH_EVENT));
        } catch (err) {
            console.error('Error en la petición de baja temporal:', err);
            setError(resolveStatusToggleErrorMessage(err));
        } finally {
            setDeleting(false);
        }
    };

    /**
     * Maneja la eliminación permanente de un usuario.
     *
     * @returns Una promesa que se resuelve cuando la operación se completa.
     */
    const handleDeletePermanently = async () => {
        if (!foundUser) return;

        if (foundUser.username.toLowerCase() === currentAdminUsername.toLowerCase()) {
            setError('Acción denegada: no puedes eliminarte permanentemente a ti mismo.');
            setSuccessMessage('');
            return;
        }

        const confirmed = window.confirm(
            `⚠️ ATENCIÓN: vas a ELIMINAR PERMANENTEMENTE a ${foundUser.username} de la base de datos. ` +
            `Esta acción NO se puede deshacer. ¿Continuar?`
        );
        if (!confirmed) return;

        setDeletingPermanently(true);
        setError('');
        setSuccessMessage('');

        try {
            const { message } = await deleteUserPermanently(foundUser.username);
            setFoundUser(null);
            setSearchName('');
            setSuccessMessage(message);
            window.dispatchEvent(new Event(USER_DIRECTORY_REFRESH_EVENT)); // refresca "Consola de Usuarios" sin recargar la página
        } catch (err) {
            console.error('Error en la baja permanente:', err);
            setError(resolvePermanentDeleteErrorMessage(err));
        } finally {
            setDeletingPermanently(false);
        }
    };

   return {
        searchName,
        setSearchName,
        foundUser,
        loading,
        updatingId,
        deleting,
        deletingPermanently,
        error,
        successMessage,
        handleSearchUser,
        handleRoleChange,
        handleDeleteUser,
        handleDeletePermanently
    };
};