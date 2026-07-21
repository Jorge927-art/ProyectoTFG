// frontend/src/routes/pages/student/components/StudentStatsPanel.tsx

import { Trophy, Users, Star, Globe, Tags, Loader2, AlertCircle } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import { useState } from 'react';
import type { EnrollmentInfo } from '../../../../services/courseTypes';
import { useCourseStats } from './useCourseStats';

interface StudentStatsPanelProps {
    activeCourseId: number | undefined | null;
    enrolledList: EnrollmentInfo[];
}

/**
 * Panel Estadístico Académico del Alumno [ADR-41].
 * Renderiza micro-indicadores analíticos agregados de PostgreSQL.
 * Dividido en dos sub-cajas con tamaños amplios, scrolls naturales y títulos unificados en rojo.
 */
export const StudentStatsPanel = ({ activeCourseId, enrolledList }: StudentStatsPanelProps) => {
    // Estado interno para almacenar de forma reactiva la asignatura seleccionada [ADR-41]
    const [localSelectedId, setLocalSelectedId] = useState<number | null>(null);
    const { stats, loadingStats, statsError } = useCourseStats(localSelectedId || activeCourseId);

    // Formateador defensivo para la maquetación visual [Manejo de Nulidad Pedagógica]
    const formatDecimal = (val: number | null | undefined): string => {
        if (val === null || val === undefined || val === 0) return '---';
        return val.toFixed(1);
    };

    return (
        <GenericCard className="flex flex-col flex-1 min-h-0">
            {/* CABECERA PRINCIPAL UNIFICADA (REESTRUCTURADA EN DOS FILAS) */}
            <div className="flex flex-col gap-3 mb-5 shrink-0 w-full">
                {/* Fila 1: Título e Icono */}
                <div className="flex items-center gap-2 w-full">
                    <div className="bg-blue-50 p-2 rounded-lg shrink-0">
                        <Trophy className="text-blue-600" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold text-slate-800 leading-tight truncate">
                            Rendimiento y Métricas del Curso
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                            Analítica del catálogo de asignaturas
                        </p>
                    </div>
                </div>

                {/* Fila 2: Etiqueta y Selector alineados a la derecha */}
                {enrolledList && enrolledList.length > 0 && (
                    <div className="flex items-center justify-end gap-2 w-full">
                        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider shrink-0">
                            ASIGNATURA
                        </span>
                        <select
                            value={localSelectedId || activeCourseId || ''}
                            onChange={(e) => setLocalSelectedId(Number(e.target.value))}
                            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700 outline-hidden cursor-pointer hover:bg-slate-100 transition-colors max-w-45 truncate shrink-0"
                        >
                            {enrolledList.map((enroll) => (
                                <option key={enroll.enrollmentid} value={enroll.course?.course_id}>
                                    {enroll.course?.title}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* CONTENEDOR OPERACIONAL CENTRAL */}
            <div className="flex-1 flex flex-col min-h-0">

                {/* 1. Estado de Carga Unificado */}
                {loadingStats && (
                    <div className="flex flex-col items-center justify-center text-slate-400 py-16 flex-1">
                        <Loader2 className="animate-spin mb-2 text-blue-600" size={24} />
                        <p className="text-[11px] font-bold text-center">Calculando agregaciones en PostgreSQL...</p>
                    </div>
                )}

                {/* 2. Estado de Error Unificado */}
                {statsError && !loadingStats && (
                    <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-2 text-xs font-semibold my-auto">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{statsError}</span>
                    </div>
                )}

                {/* 3. Estado de Asignatura No Seleccionada */}
                {!activeCourseId && !localSelectedId && !loadingStats && !statsError && (
                    <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl my-auto">
                        <p className="text-[11px] text-slate-400 font-medium italic">
                            Selecciona una asignatura activa para proyectar sus indicadores analíticos.
                        </p>
                    </div>
                )}
                {/* 4. Renderizado Seguro de las Cajas cuando los datos están listos */}
                {!loadingStats && !statsError && (activeCourseId || localSelectedId) && (
                    <div className="flex flex-col gap-4 flex-1 min-h-0">

                        {/* CAJA A: MÉTRICAS DE TU CAMPUS (DATOS LOCALES) */}
                        <div className="bg-slate-50/40 border border-slate-100 rounded-xl p-4 flex flex-col min-h-0">
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-3 shrink-0">
                                Métricas de tu Campus (Datos Locales)
                            </p>

                            {/* Contenedor de desborde natural para la Caja A */}
                            <div className="overflow-y-auto custom-scrollbar pr-1 space-y-3 min-h-0">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-2.5 min-w-0 shadow-xs">
                                        <Users size={16} className="text-blue-500 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight truncate">Comunidad</p>
                                            <p className="text-xs font-black text-slate-700 mt-0.5 truncate">{stats?.localEnrollments || 0} inscritos</p>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-2.5 min-w-0 shadow-xs">
                                        <Trophy size={16} className="text-green-500 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight truncate">Nota Media</p>
                                            <p className="text-xs font-black text-slate-700 mt-0.5 truncate">
                                                {stats?.averageGrade ? `${formatDecimal(stats.averageGrade)} / 10` : '--- / 10'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-2.5 min-w-0 shadow-xs">
                                        <Star size={16} className="text-amber-500 fill-amber-400 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight truncate">Rating Curso</p>
                                            <p className="text-xs font-black text-slate-700 mt-0.5 truncate">
                                                {stats?.communityRating ? `${formatDecimal(stats.communityRating)} ★` : 'Sin valoraciones'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-2.5 min-w-0 shadow-xs">
                                        <Star size={16} className="text-indigo-500 fill-indigo-400 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight truncate">Rating Docente</p>
                                            <p className="text-xs font-black text-slate-700 mt-0.5 truncate">
                                                {stats?.instructorRating ? `${formatDecimal(stats.instructorRating)} ★` : 'Sin valoraciones'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CAJA B: FICHA TÉCNICA DEL CURSO (DATOS DEL CATÁLOGO BASE) */}
                        <div className="flex-1 bg-slate-50/40 border border-slate-100 rounded-xl p-4 flex flex-col min-h-0">
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-3 shrink-0">
                                Ficha Técnica del Curso (Catálogo Base)
                            </p>

                            {/* Contenedor de desborde natural para la Caja B */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-2.5 bg-white border border-slate-100 rounded-xl flex items-center gap-2 min-w-0 shadow-xs">
                                        <Globe size={14} className="text-slate-400 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight truncate">Origen Remoto</p>
                                            <p className="text-xs font-bold text-slate-600 truncate">{stats?.platform || "---"}</p>
                                        </div>
                                    </div>

                                    <div className="p-2.5 bg-white border border-slate-100 rounded-xl flex items-center gap-2 min-w-0 shadow-xs">
                                        <Tags size={14} className="text-slate-400 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight truncate">Especialidad</p>
                                            <p className="text-xs font-bold text-slate-600 truncate">{stats?.category || "---"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </GenericCard>
    );
};
