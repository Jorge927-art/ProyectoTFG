// src/components/admin/UserScrollList.tsx
import { useEffect, useState } from 'react';
import { apiClient } from '@/services/apiClient';
import { User, ShieldAlert, BookOpen, GraduationCap } from 'lucide-react';

interface UserListEntity {
    userId: number;
    username: string;
    email: string;
    role: 'ADMIN' | 'PROFESSOR' | 'STUDENT';
}

export const UserScrollList = () => {
    const [users, setUsers] = useState<UserListEntity[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        apiClient.get<UserListEntity[]>('/api/auth')
            .then((response) => setUsers(response.data))
            .catch((error) => console.error('Error en pasarela de usuarios:', error))
            .finally(() => setLoading(false));
    }, []);

    // Diccionario estático para evitar condicionales sueltos en el render
    const badges = {
        ADMIN: (
            <div className="flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-100 text-[10px] font-bold uppercase tracking-wider text-red-700">
                <ShieldAlert size={12} />
                <span>Admin</span>
            </div>
        ),
        PROFESSOR: (
            <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <BookOpen size={12} />
                <span>Profesor</span>
            </div>
        ),
        STUDENT: (
            <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                <GraduationCap size={12} />
                <span>Alumno</span>
            </div>
        )
    };

    return (
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-5">
            {/* 1. MAQUETACIÓN DEL ENCABEZADO */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-indigo-50 text-indigo-600 border border-indigo-100">
                        Sistema
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">Modo Escaneable</span>
                </div>
                <h3 className="text-base font-bold text-slate-800 leading-tight">Consola de Usuarios</h3>
                <p className="text-xs text-slate-400 mt-1">Infrastructure: {users.length} cuentas en PostgreSQL.</p>
            </div>

            {/* 2. CUERPO DE LA UTILIDAD (SCROLL) */}
            {loading ? (
                <div className="text-center py-8 text-xs text-slate-400 animate-pulse">Cargando base de datos...</div>
            ) : users.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No hay registros de usuarios.</div>
            ) : (
                <div className="h-29 overflow-y-auto pr-1 space-y-2 mt-2 scrollbar-thin scrollbar-thumb-slate-200">
                    {users.map((item, index) => (
                        /* Clave compuesta combinada para asegurar estabilidad total en el DOM virtual */
                        <div key={item.userId || item.username || `usr-${index}`} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-50 hover:bg-slate-50/50 transition-all shadow-2xs">
                            <div className="flex items-center gap-2.5">
                                <div className="bg-slate-100 p-1.5 rounded-full text-slate-500">
                                    <User size={16} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-700 leading-tight">{item.username}</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{item.email}</p>
                                </div>
                            </div>

                            {/* Renderizado seguro desde diccionario con fallback a Alumno */}
                            {badges[item.role] || badges.STUDENT}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
