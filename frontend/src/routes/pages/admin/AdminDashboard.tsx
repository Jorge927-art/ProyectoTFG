import { useState } from 'react';
import { Users, Search, Loader2, Shield } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import axios from 'axios';
import AdminLayout from '../../layouts/AdminLayout';
import { UserScrollList } from '../../../components/admin/UserScrollList'; // Componente de consola con scroll

interface UserEntity {
    userId?: number;
    username: string;
    role: string;
    enabled: boolean; // Atributo integrado según auditoría
}

const AdminDashboard = () => {
    const [searchName, setSearchName] = useState<string>('');
    const [foundUser, setFoundUser] = useState<UserEntity | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [error, setError] = useState<string>('');
    const [deleting, setDeleting] = useState<boolean>(false);

    // 1. FUNCIÓN DE BÚSQUEDA: Consulta directa al endpoint de Spring Boot
    const handleSearchUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchName.trim()) return;

        setLoading(true);
        setError('');
        setFoundUser(null);

        try {
            const cleanName = searchName.trim();
            const response = await apiClient.get(`/api/auth/${cleanName}`);

            if (response.status === 200 && response.data) {
                setFoundUser(response.data as UserEntity);
            }
        } catch (err) {
            console.error("Error al consultar el usuario en PostgreSQL:", err);
            let message = 'Usuario no encontrado en las tablas de la base de datos.';
            if (axios.isAxiosError(err) && err.response?.status === 500) {
                message = 'Error 500 del servidor al procesar la búsqueda en la entidad.';
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    // 2. FUNCIÓN DE ACTUALIZACIÓN: Conexión con el endpoint PATCH administrativo
    const handleRoleChange = async (targetId: number, newRole: string) => {
        if (!foundUser) return;
        setUpdatingId(targetId);
        setError('');

        try {
            const response = await apiClient.patch(`/api/auth/users/${foundUser.username}/role`, {
                role: newRole
            });

            if (response.status === 200) {
                setFoundUser({ ...foundUser, role: newRole });
            }
        } catch (err) {
            console.error("Error al cambiar el rol en el servidor:", err);
            let message = 'No se pudo actualizar el rol en la base de datos.';
            if (axios.isAxiosError(err) && err.response?.data?.message) {
                message = err.response.data.message;
            }
            setError(message);
        } finally {
            setUpdatingId(null);
        }
    };

    // 3. FUNCIÓN DE BORRADO DESTRUCTIVO O CONMUTACIÓN DE ESTADO LÓGICO
    const handleDeleteUser = async () => {
        if (!foundUser) return;

        // Obtenemos el objeto del usuario desde la persistencia que maneja tu AuthProvider
        const storedAuth = localStorage.getItem('auth_user');
        let currentAdminUsername = '';

        if (storedAuth) {
            try {
                const parsedAuth = JSON.parse(storedAuth);
                currentAdminUsername = parsedAuth.username || '';
            } catch (errJson) {
                console.error("Error al parsear el usuario autenticado:", errJson);
            }
        }

        // Validación preventiva en UI contra autoborrado
        if (foundUser.username.toLowerCase() === currentAdminUsername.toLowerCase()) {
            setError("Acción denegada: El sistema bloquea el autoborrado por seguridad.");
            return;
        }

        const operacionTexto = foundUser.enabled ? "dar de baja (borrado lógico)" : "reactivar y dar de alta";
        const confirmed = window.confirm(`¿Estás seguro de cambiar el estado de acceso de ${foundUser.username} para ${operacionTexto}?`);
        if (!confirmed) return;

        setDeleting(true);
        setError('');

        try {
            // PETICIÓN HTTP: Invoca al controlador conmutador de estado
            const response = await apiClient.delete(`/api/auth/users/${foundUser.username}`);

            if (response.status === 200) {
                alert(response.data.message);

                // SINCRONIZACIÓN SEGURA: Actualizamos la tarjeta con el valor real devuelto por el servidor
                setFoundUser({
                    ...foundUser,
                    enabled: response.data.enabled // Sincroniza de forma atómica con el backend
                });
            }
        } catch (errHttp) {
            console.error("Error en la petición de borrado:", errHttp);
            let message = "Error crítico: No se pudo modificar el estado del usuario.";
            if (axios.isAxiosError(errHttp) && errHttp.response?.data?.error) {
                message = errHttp.response.data.error;
            }
            setError(message);
        } finally {
            setDeleting(false);
        }
    };

    // Auxiliar para obtener el nombre del admin actual directamente en la renderización
    const getAdminUsername = (): string => {
        const storedAuth = localStorage.getItem('auth_user');
        if (!storedAuth) return '';
        try {
            return JSON.parse(storedAuth).username || '';
        } catch {
            return '';
        }
    };

    return (
        <AdminLayout>
            {/* CONTENEDOR GRID EN PARALELO: Una al lado de la otra en pantallas grandes (lg), una encima de otra en móviles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full">
                {/* COLUMNA IZQUIERDA: TARJETA DEL BUSCADOR DE USUARIOS */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg px-5 py-15 w-full">
                    {/* Encabezado */}
                    <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                        <div className="p-2.5 bg-red-50 rounded-xl text-red-600">
                            <Users size={22} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Buscador de Usuarios</h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Consulta directa y en tiempo real a PostgreSQL
                            </p>
                        </div>
                    </div>

                    {/* Formulario de Búsqueda */}
                    <form onSubmit={handleSearchUser} className="flex gap-2 mb-4">
                        <input
                            type="text"
                            placeholder="Introduce el nombre (ej. Laura)"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            required
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-colors disabled:bg-gray-400 flex items-center justify-center"
                            title="Buscar en base de datos"
                            aria-label="Buscar en base de datos"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                        </button>
                    </form>

                    {/* Manejo de Errores */}
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-semibold mb-2 animate-in fade-in duration-200">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* RESULTADO DINÁMICO RECOLECTADO DE POSTGRESQL CON SELECTOR DE ROL */}
                    {foundUser && (
                        <div className="mt-4 border-t border-slate-100 pt-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 flex flex-col gap-3">
                                {/* Información del Usuario */}
                                <div className="flex items-center justify-between gap-4 border-b border-slate-200/60 pb-2">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Usuario</span>
                                        <span className="text-sm font-bold text-slate-800 truncate max-w-36">
                                            {foundUser.username}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rol Actual</span>
                                        <span className="px-2.5 py-0.5 bg-red-100 border border-red-200 text-red-700 rounded-full text-xs font-bold uppercase tracking-wide">
                                            {foundUser.role}
                                        </span>
                                    </div>
                                </div>

                                {/* Selector de nuevo Rol */}
                                <div className="flex flex-col gap-1.5">
                                    <label
                                        htmlFor="role-selector"
                                        className="text-[11px] font-bold text-slate-600 flex items-center gap-1"
                                    >
                                        <Shield size={12} className="text-red-500" />
                                        <span>Asignar nuevo rol en el sistema:</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            id="role-selector"
                                            value={foundUser.role}
                                            disabled={updatingId !== null || deleting}
                                            onChange={(e) => handleRoleChange(foundUser.userId || 0, e.target.value)}
                                            className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all disabled:bg-slate-100"
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

                                {/* BOTÓN DE BORRADO DESTRUCTIVO BLINDADO */}
                                <div className="mt-2 pt-3 border-t border-red-100">
                                    {foundUser.username.toLowerCase() === getAdminUsername().toLowerCase() ? (
                                        <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-xl text-center font-medium">
                                            Esta es tu cuenta actual. No puedes eliminarte a ti mismo.
                                        </div>
                                    ) : foundUser.enabled === false ? (
                                        <button
                                            type="button"
                                            onClick={handleDeleteUser}
                                            disabled={deleting || updatingId !== null}
                                            className="w-full py-2 bg-emerald-50 border-2 border-emerald-200 text-emerald-600 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                        >
                                            {deleting ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <>Reactivar y Dar de Alta Usuario</>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleDeleteUser}
                                            disabled={deleting || updatingId !== null}
                                            className="w-full py-2 bg-white border-2 border-red-200 text-red-600 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                        >
                                            {deleting ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <>Eliminar Usuario Definitivamente</>
                                            )}
                                        </button>
                                    )}
                                </div>

                            </div>
                        </div>
                    )}
                </div>

                {/* COLUMNA DERECHA: CONSOLA DE USUARIOS CON SCROLL INFRAESTRUCTURA */}
                <div className="w-full h-full">
                    <UserScrollList />
                </div>

            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;
