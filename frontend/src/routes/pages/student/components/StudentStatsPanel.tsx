// frontend/src/routes/pages/student/components/StudentStatsPanel.tsx

import { Trophy, Users, Star, Globe, Tags, Loader2 } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard'; // Ajusta la ruta a tu GenericCard si es necesario
import { useCourseStats } from './useCourseStats';

interface StudentStatsPanelProps {
    activeCourseId: number | undefined | null;
}

/**
 * Panel Estadístico Académico del Alumno [ADR-41].
 * Renderiza micro-indicadores analíticos agregados de PostgreSQL.
 * Sincronizado geométricamente a h-109 para mantener la simetría horizontal de la UI.
 */
export const StudentStatsPanel = ({ activeCourseId }: StudentStatsPanelProps) => {
    const { stats, loadingStats, statsError } = useCourseStats(activeCourseId);

    // Formateador defensivo para la maquetación visual [Manejo de Nulidad Pedagógica]
    const formatDecimal = (val: number | null | undefined): string => {
        if (val === null || val === undefined || val === 0) return '---';
        return val.toFixed(1);
    };

    return (

        <GenericCard className="h-102 flex flex-col shadow-sm border-slate-200">
            {/* CABECERA DEL PANEL */}
            <div className="flex items-center gap-2 mb-5 shrink-0">
                <div className="bg-indigo-50 p-2 rounded-lg">
                    <Trophy className="text-indigo-600" size={18} />
                </div>
                <div>
                    <h2 className="text-base font-bold text-slate-800 leading-tight">
                        Rendimiento y Métricas del Curso
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Analítica consolidada del catálogo
                    </p>
                </div>
            </div>

            {/* CONTENEDOR CENTRAL REACTIVO CON SCROLL INTERNO [ADR-19] */}
            <div className="flex-1 max-h-52 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                {loadingStats ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 py-12">
                        <Loader2 className="animate-spin mb-2 text-indigo-600" size={22} />
                        <p className="text-[11px] font-bold">Calculando agregaciones en PostgreSQL...</p>
                    </div>
                ) : statsError ? (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center text-[10px] font-bold">
                        {statsError}
                    </div>
                ) : !activeCourseId ? (
                    <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-100 rounded-xl my-4">
                        <p className="text-[11px] text-slate-400 font-medium italic">
                            Selecciona una asignatura activa para proyectar sus indicadores analíticos.
                        </p>
                    </div>
                ) : (
                    /* GRILLA GEOMÉTRICA DE MICRO-INDICADORES */
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            {/* INDICADOR 1: ALUMNOS INSCRITOS */}
                            <div className="p-3 bg-slate-50/60 border border-slate-100 rounded-xl flex items-center gap-2.5">
                                <Users size={16} className="text-blue-500 shrink-0" />
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Comunidad</p>
                                    <p className="text-xs font-black text-slate-700 mt-0.5">{stats?.localEnrollments || 0} inscritos</p>
                                </div>
                            </div>

                            {/* INDICADOR 2: NOTA MEDIA */}
                            <div className="p-3 bg-slate-50/60 border border-slate-100 rounded-xl flex items-center gap-2.5">
                                <Trophy size={16} className="text-emerald-500 shrink-0" />
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Nota Media</p>
                                    <p className="text-xs font-black text-slate-700 mt-0.5">
                                        {stats?.averageGrade ? `${formatDecimal(stats.averageGrade)} / 10` : '--- / 10'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* INDICADOR 3: RATING COMUNIDAD */}
                            <div className="p-3 bg-slate-50/60 border border-slate-100 rounded-xl flex items-center gap-2.5">
                                <Star size={16} className="text-amber-500 fill-amber-400 shrink-0" />
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Rating Curso</p>
                                    <p className="text-xs font-black text-slate-700 mt-0.5">
                                        {stats?.communityRating ? `${formatDecimal(stats.communityRating)} ★` : 'Sin valoraciones'}
                                    </p>
                                </div>
                            </div>

                            {/* INDICADOR 4: RATING PROFESOR */}
                            <div className="p-3 bg-slate-50/60 border border-slate-100 rounded-xl flex items-center gap-2.5">
                                <Star size={16} className="text-indigo-500 fill-indigo-400 shrink-0" />
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Rating Docente</p>
                                    <p className="text-xs font-black text-slate-700 mt-0.5">
                                        {stats?.instructorRating ? `${formatDecimal(stats.instructorRating)} ★` : 'Sin valoraciones'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN INFORMATIVA DE ABSTRACCIÓN DE PLATAFORMA */}
                        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold truncate">
                                <Globe size={13} className="text-slate-400 shrink-0" />
                                <span className="text-slate-400">Origen:</span>
                                <span className="font-bold text-slate-600 truncate">{stats?.platform || "---"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold truncate">
                                <Tags size={13} className="text-slate-400 shrink-0" />
                                <span className="text-slate-400">Rama:</span>
                                <span className="font-bold text-slate-600 truncate">{stats?.category || "---"}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </GenericCard>
    );
};
