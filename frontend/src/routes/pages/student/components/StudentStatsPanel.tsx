// frontend/src/routes/pages/student/components/StudentStatsPanel.tsx

import { Trophy, Globe, Tags, Loader2, AlertCircle, FileText } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import { useMemo, useState } from 'react';
import type { EnrollmentInfo } from '../../../../services/courseTypes';
import { useCourseStats } from './useCourseStats';

interface StudentStatsPanelProps {
    activeCourseId: number | undefined | null;
    enrolledList: EnrollmentInfo[];
}

/**
 * Panel Estadístico Académico del Alumno [ADR-41].
 * Prioriza la nota individual del examen y el listado de trabajos de la matrícula seleccionada.
 */
export const StudentStatsPanel = ({ activeCourseId, enrolledList }: StudentStatsPanelProps) => {
    // Estado interno para almacenar de forma reactiva la asignatura seleccionada [ADR-41]
    const [localSelectedId, setLocalSelectedId] = useState<number | null>(null);
    const selectedCourseId = localSelectedId ?? activeCourseId ?? null;
    const selectedEnrollments = useMemo(
        () => enrolledList.filter((enrollment) => enrollment.course?.course_id === selectedCourseId),
        [enrolledList, selectedCourseId]
    );
    const selectedGrades = useMemo(
        () => selectedEnrollments.flatMap((enrollment) => enrollment.grades ?? []),
        [selectedEnrollments]
    );
    const { stats, loadingStats, statsError } = useCourseStats(selectedCourseId);

    // Formateador defensivo para la maquetación visual [Manejo de Nulidad Pedagógica]
    const formatDecimal = (val: number | null | undefined): string => {
        if (val === null || val === undefined || val === 0) return '---';
        return Number(val).toFixed(1);
    };

    const isExamGrade = (title: string): boolean => {
        const normalized = title.toLowerCase();

        // Si el título describe un trabajo/actividad, jamás debe tratarse como examen.
        if (
            normalized.includes('trabajo')
            || normalized.includes('proyecto')
            || normalized.includes('actividad')
            || normalized.includes('práctica')
            || normalized.includes('practica')
        ) {
            return false;
        }

        return /\bexamen\b/.test(normalized)
            || /\bevaluaci[oó]n final\b/.test(normalized)
            || /^\s*final\s*$/.test(normalized);
    };

    const examGrade = selectedGrades.find((grade) => isExamGrade(grade.title)) ?? null;
    const workGrades = selectedGrades.filter((grade) => !isExamGrade(grade.title));
    const shouldShowScrollHint = workGrades.length >= 3;

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
                            value={selectedCourseId || ''}
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
                {!selectedCourseId && !loadingStats && !statsError && (
                    <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl my-auto">
                        <p className="text-[11px] text-slate-400 font-medium italic">
                            Selecciona una asignatura activa para ver tu nota del examen y tus trabajos.
                        </p>
                    </div>
                )}
                {/* 4. Renderizado Seguro de las Cajas cuando los datos están listos */}
                {!loadingStats && !statsError && selectedCourseId && (
                    <div className="flex flex-col gap-4 flex-1 min-h-0">

                        {/* CAJA A: RENDIMIENTO ACADÉMICO INDIVIDUAL */}
                        <div className="bg-slate-50/40 border border-slate-100 rounded-xl p-4 flex flex-col min-h-0">
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-3 shrink-0">
                                Rendimiento Académico
                            </p>

                            <div className="pr-1 space-y-3 min-h-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-2.5 min-w-0 shadow-xs">
                                        <Trophy size={16} className="text-green-500 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight truncate">Nota del examen</p>
                                            <p className="text-xs font-black text-slate-700 mt-0.5 truncate">
                                                {examGrade ? `${formatDecimal(Number(examGrade.score))} / 10` : 'Pendiente de calificar'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-2.5 min-w-0 shadow-xs">
                                        <FileText size={16} className="text-blue-500 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight truncate">Trabajos registrados</p>
                                            <p className="text-xs font-black text-slate-700 mt-0.5 truncate">
                                                {workGrades.length} entregas
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-xs">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight">
                                            Trabajos y actividades
                                        </p>
                                        {shouldShowScrollHint ? (
                                            <span className="text-[10px] font-semibold text-slate-500">
                                                Scroll para ver más
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-semibold text-slate-500">
                                                Lista completa
                                            </span>
                                        )}
                                    </div>

                                    <div
                                        className={`custom-scrollbar pr-1 space-y-2 overscroll-contain ${shouldShowScrollHint
                                                ? 'h-32 overflow-y-scroll'
                                                : 'overflow-y-visible'
                                            }`}
                                    >
                                        {workGrades.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">
                                                No hay trabajos registrados para esta asignatura.
                                            </p>
                                        ) : (
                                            workGrades.map((grade, index) => (
                                                <div
                                                    key={`${grade.title}-${index}`}
                                                    className="flex items-center justify-between gap-3 p-2 rounded-lg border border-slate-100 bg-slate-50"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-700 truncate">{grade.title}</p>
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Trabajo</p>
                                                    </div>
                                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-black text-[10px] shrink-0">
                                                        {formatDecimal(Number(grade.score))} / 10
                                                    </span>
                                                </div>
                                            ))
                                        )}
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
