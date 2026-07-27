// frontend/src/routes/pages/admin/components/UserSearchPanel.tsx
import { Users, Search, Loader2, Shield } from 'lucide-react';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import Input from '../../../../components/ui/Input';
import { useUserSearch } from './useUserSearch';

interface UserSearchPanelProps {
    currentAdminUsername: string;
}

export const UserSearchPanel = ({ currentAdminUsername }: UserSearchPanelProps) => {
    const {
        searchName,
        setSearchName,
        foundUser,
        loading,
        updatingId,
        deleting,
        deletingPermanently,
        error,
        handleSearchUser,
        handleRoleChange,
        handleDeleteUser,
        handleDeletePermanently
    } = useUserSearch(currentAdminUsername);

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-6 w-full">
            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                    <Users size={22} />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-900">Buscador de Usuarios</h3>
                    <p className="text-xs text-slate-900 font-medium">
                        Consulta directa y en tiempo real a PostgreSQL
                    </p>
                </div>
            </div>

            <form onSubmit={handleSearchUser} className="flex gap-2 mb-4 items-end">
                <Input
                    type="text"
                    placeholder="Introduce el nombre (ej. Laura)"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    required
                    className="flex-1 text-sm font-medium text-slate-800 placeholder-slate-400"
                />
                <GenericButton
                    type="submit"
                    disabled={loading}
                    variant="primary"
                    ariaLabel="Buscar en base de datos"
                    icon={loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    className="p-2! bg-blue-600! hover:bg-blue-700! text-white! rounded-xl! shadow-md! border border-transparent! h-11.5 flex items-center justify-center"
                />
            </form>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-semibold mb-2 animate-in fade-in duration-200">
                    ⚠️ {error}
                </div>
            )}

            {foundUser && (
                <div className="mt-4 border-t border-slate-100 pt-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-200/60 pb-2">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Usuario</span>
                                <span className="text-sm font-bold text-slate-800 truncate max-w-36">
                                    {foundUser.username}
                                </span>
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rol Actual</span>
                                <span className="px-2.5 py-0.5 bg-blue-100 border border-blue-200 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide">
                                    {foundUser.role}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label
                                htmlFor="role-selector"
                                className="text-[11px] font-bold text-slate-900 flex items-center gap-1"
                            >
                                <Shield size={12} className="text-blue-500" />
                                <span>Asignar nuevo rol en el sistema:</span>
                            </label>
                            <div className="flex gap-2">
                                <select
                                    id="role-selector"
                                    value={foundUser.role}
                                    disabled={updatingId !== null || deleting}
                                    onChange={(e) => handleRoleChange(foundUser.userId || 0, e.target.value)}
                                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-slate-100"
                                >
                                    <option value="STUDENT">STUDENT (Alumno)</option>
                                    <option value="PROFESSOR">PROFESSOR (Profesor)</option>
                                    <option value="ADMIN">ADMIN (Administrador)</option>
                                </select>
                                {updatingId !== null && (
                                    <div className="flex items-center justify-center p-1.5 bg-slate-200 rounded-lg text-slate-600">
                                        <Loader2 size={14} className="animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-2 pt-3 border-t border-slate-100">
                            {foundUser.username.toLowerCase() === currentAdminUsername.toLowerCase() ? (
                                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-center font-medium">
                                    Esta es tu cuenta actual. No puedes eliminarte a ti mismo.
                                </div>
                            ) : foundUser.enabled === false ? (
                                <GenericButton
                                    type="button"
                                    onClick={handleDeleteUser}
                                    disabled={deleting || updatingId !== null}
                                    variant="success"
                                    label={deleting ? 'Reactivando...' : 'Reactivar y dar de alta usuario'}
                                    icon={deleting ? <Loader2 size={14} className="animate-spin" /> : undefined}
                                    className="w-full py-2! bg-emerald-600! hover:bg-emerald-700! border-2! border-emerald-600! text-white! rounded-xl! text-xs! font-bold! uppercase! tracking-wide! transition-all! justify-center! gap-2!"
                                />
                            ) : (
                                <GenericButton
                                    type="button"
                                    onClick={handleDeleteUser}
                                    disabled={deleting || updatingId !== null}
                                    variant="primary"
                                    label={deleting ? 'Procesando...' : 'Dar de baja temporal usuario'}
                                    icon={deleting ? <Loader2 size={14} className="animate-spin" /> : undefined}
                                    className="w-full py-2! bg-blue-600! hover:bg-blue-700! border-2! border-blue-600! text-white! rounded-xl! text-xs! font-bold! uppercase! tracking-wide! transition-all! justify-center! gap-2!"
                                />
                            )}
                        </div>
                        {foundUser.username.toLowerCase() !== currentAdminUsername.toLowerCase() && (
                            <div className="mt-2 pt-3 border-t border-slate-100">
                                <GenericButton
                                    type="button"
                                    onClick={handleDeletePermanently}
                                    disabled={deleting || deletingPermanently || updatingId !== null}
                                    variant="primary"
                                    label={deletingPermanently ? 'Eliminando...' : 'Dar de baja permanente usuario'}
                                    icon={deletingPermanently ? <Loader2 size={14} className="animate-spin" /> : undefined}
                                    className="w-full py-2! bg-red-600! hover:bg-red-700! border-2! border-red-600! text-white! rounded-xl! text-xs! font-bold! uppercase! tracking-wide! transition-all! justify-center! gap-2!"
                                />
                                <p className="text-[10px] text-slate-400 text-center mt-1.5">
                                    Borrado físico e irreversible. No podrá recuperarse.
                                </p>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
};
