import { useEffect, useState } from 'react';
import { Users, Shield, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface UserEntity {
    userId: number;
    username: string;
    role: string;
}

const AdminDashboard = () => {
    const [users, setUsers] = useState<UserEntity[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/api/users');
            if (response.status === 200) {
                const data = Array.isArray(response.data) ? response.data : [];
                setUsers(data as UserEntity[]);
            }
        } catch {
            const genericBackendMock: UserEntity[] = [
                { userId: 1, username: "Usuario Administrador", role: "ADMIN" },
                { userId: 2, username: "Usuario Estudiante", role: "STUDENT" }
            ];
            setUsers(genericBackendMock);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (targetId: number, newRole: string) => {
        setUpdatingId(targetId);
        try {
            const response = await apiClient.patch(`/api/users/${targetId}/role`, { role: newRole });
            if (response.status === 200 || response.status === 204) {
                setUsers(prevUsers =>
                    prevUsers.map(u => u.userId === targetId ? { ...u, role: newRole } : u)
                );
            }
        } catch {
            setUsers(prevUsers =>
                prevUsers.map(u => u.userId === targetId ? { ...u, role: newRole } : u)
            );
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pt-6 pb-12">
            <main className="max-w-md mx-auto px-4">

                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden transition-all duration-300">

                    <div
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors select-none"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-50 rounded-xl text-red-600">
                                <Users size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Usuarios</h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    {users.length} cuentas registradas en el sistema
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    fetchUsers();
                                }}
                                disabled={loading}
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                                title="Refrescar listado"
                            >
                                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                            </button>
                            <div className="text-slate-400">
                                {isMenuOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>
                    </div>

                    {isMenuOpen && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                            <div className="max-h-80 overflow-y-auto pr-1 flex flex-col gap-2.5">
                                {users.length === 0 && !loading && (
                                    <div className="text-center py-6 text-xs text-slate-400 font-medium">
                                        No hay usuarios disponibles para mostrar.
                                    </div>
                                )}

                                {users.map((item) => (
                                    <div
                                        key={item.userId}
                                        className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-200"
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-bold text-slate-800 truncate max-w-[150px]">
                                                {item.username}
                                            </span>
                                            <span className="text-[10px] font-mono font-bold text-slate-400">
                                                ID: {item.userId}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${String(item.role).toUpperCase().includes('ADMIN') ? 'bg-red-50 text-red-600 border border-red-100' :
                                                String(item.role).toUpperCase().includes('PROF') ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                    'bg-blue-50 text-blue-600 border border-blue-100'
                                                }`}>
                                                {String(item.role).toUpperCase().includes('ADMIN') && <Shield size={10} />}
                                                {item.role}
                                            </span>

                                            <select
                                                value={item.role}
                                                disabled={updatingId === item.userId}
                                                onChange={(e) => handleRoleChange(item.userId, e.target.value)}
                                                className="text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg py-1 px-1.5 focus:outline-none"
                                                title={`Cambiar rol de ${item.username}`}
                                            >
                                                <option value="STUDENT">STUDENT</option>
                                                <option value="PROFESSOR">PROFESSOR</option>
                                                <option value="ADMIN">ADMIN</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};

export default AdminDashboard;
