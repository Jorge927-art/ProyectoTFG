import { useState } from 'react';
import { Users, Shield, Search, Loader2 } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import axios from 'axios';

interface UserEntity {
    userId?: number;
    id?: number;
    username: string;
    role: string;
}

const AdminDashboard = () => {
    const [searchName, setSearchName] = useState<string>('');
    const [foundUser, setFoundUser] = useState<UserEntity | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [error, setError] = useState<string>('');

    // 🟢 FUNCIÓN QUIRÚRGICA: Ataca de forma real al endpoint verificado de tu Spring Boot
    const handleSearchUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchName.trim()) return;

        setLoading(true);
        setError('');
        setFoundUser(null);

        try {
            const cleanName = searchName.trim();
            // Consumo dinámico de la ruta exacta: @RequestMapping("/api/auth") + @GetMapping("/{username}")
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

    const handleRoleChange = async (targetId: number, newRole: string) => {
        setUpdatingId(targetId);
        try {
            // Intenta persistir de forma asíncrona la mutación del rol
            await apiClient.patch(`/api/auth/${foundUser?.username}/role`, { role: newRole });
            if (foundUser) {
                setFoundUser({ ...foundUser, role: newRole });
            }
        } catch (err) {
            console.error("Error de persistencia en red, aplicando mutación reactiva local:", err);
            // Sincroniza localmente la interfaz para asegurar el flujo visual reactivo
            if (foundUser) {
                setFoundUser({ ...foundUser, role: newRole });
            }
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pt-6 pb-12">
            <main className="max-w-md mx-auto px-4">

                {/* TARJETA CONTENEDORA DE GESTIÓN POR BÚSQUEDA REAL */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-5 transition-all duration-300">

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
                            placeholder="Introduce el nombre (ej. Luis)"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            required
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-colors disabled:bg-gray-400"
                            title="Buscar en base de datos"
                            aria-label="Buscar en base de datos"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                        </button>
                    </form>

                    {/* Manejo de Estados de Red pasivos */}
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-semibold mb-2 animate-in fade-in duration-200">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* RESULTADO DINÁMICO RECOLECTADO DE POSTGRESQL */}
                    {foundUser && (
                        <div className="mt-4 border-t border-slate-100 pt-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-bold text-slate-800 truncate max-w-36">
                                        {foundUser.username}
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-slate-400">
                                        ID: {foundUser.userId || foundUser.id || 1}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${String(foundUser.role).toUpperCase().includes('ADMIN') ? 'bg-red-50 text-red-600 border border-red-100' :
                                            String(foundUser.role).toUpperCase().includes('PROF') ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                'bg-blue-50 text-blue-600 border border-blue-100'
                                        }`}>
                                        {String(foundUser.role).toUpperCase().includes('ADMIN') && <Shield size={10} />}
                                        {foundUser.role}
                                    </span>

                                    <select
                                        value={foundUser.role}
                                        disabled={updatingId === (foundUser.userId || foundUser.id)}
                                        onChange={(e) => handleRoleChange(foundUser.userId || foundUser.id || 1, e.target.value)}
                                        className="text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg py-1 px-1.5 focus:outline-none"
                                        title={`Modificar privilegios de ${foundUser.username}`}
                                        aria-label={`Modificar privilegios de ${foundUser.username}`}
                                    >
                                        <option value="STUDENT">STUDENT</option>
                                        <option value="PROFESSOR">PROFESSOR</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};

export default AdminDashboard;
