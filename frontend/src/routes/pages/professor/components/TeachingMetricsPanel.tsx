// frontend/src/routes/pages/professor/components/TeachingMetricsPanel.tsx
import { Activity, TrendingUp, CheckCircle2, Trophy, Loader2, AlertCircle } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import { useTeachingMetrics } from './useTeachingMetrics';
import { MetricStatCard } from './MetricStatCard';
import { StudentProgressBreakdown } from './StudentProgressBreakdown';
import { StudentGradeBreakdown } from './StudentGradeBreakdown';
import type { TaughtCourse } from '../../../../services/userDomains';

interface TeachingMetricsPanelProps {
    selectedCourseId: number | null; // null = TODAS
    onCourseChange: (courseId: number | null) => void;
    availableCourses: TaughtCourse[];
}

const formatDecimal = (val: number | undefined): string => (val ? val.toFixed(1) : '---');

/**
 * Panel "Métricas de Docencia" [nueva funcionalidad].
 * Sustituye al bloque estático anterior de ProfessorDashboard. Apila de
 * arriba a abajo: título, selector (TODAS + asignaturas del profesor) y las
 * estadísticas: progreso alumno, nota alumno, progreso colectivo, tasa de
 * finalización y nota media.
 */
export const TeachingMetricsPanel = ({
    selectedCourseId,
    onCourseChange,
    availableCourses
}: TeachingMetricsPanelProps) => {
    const { summary, students, loading, error } = useTeachingMetrics(selectedCourseId);

    return (
        <GenericCard className="w-full h-full flex flex-col self-start bg-slate-50/40 border-slate-100 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Activity size={18} className="text-blue-600" />
                        <span>Métricas de Docencia</span>
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        Rendimiento docente y seguimiento académico
                    </p>
                </div>

                <div className="w-full max-w-52 shrink-0 space-y-1">
                    <label
                        htmlFor="teaching-metrics-selector"
                        className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                    >
                        Asignatura
                    </label>
                    <select
                        id="teaching-metrics-selector"
                        value={selectedCourseId ?? ''}
                        onChange={(event) => {
                            const value = event.target.value;
                            onCourseChange(value ? Number(value) : null);
                        }}
                        className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-400"
                    >
                        <option value="">TODAS</option>
                        {availableCourses.map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.title}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading && (
                <div className="flex items-center gap-2 justify-center py-6 text-slate-400 flex-1">
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                    <span className="text-[11px] font-semibold">Calculando métricas...</span>
                </div>
            )}

            {error && !loading && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2 flex-1">
                    <AlertCircle size={14} className="shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {!loading && !error && (
                <div className="flex flex-col gap-4 flex-1 min-h-0">
                    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                        <StudentProgressBreakdown students={students} showCourseColumn={selectedCourseId === null} />
                        <StudentGradeBreakdown students={students} showCourseColumn={selectedCourseId === null} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <MetricStatCard
                            icon={<TrendingUp size={16} className="text-blue-600" />}
                            title="Progreso colectivo"
                            value={`${formatDecimal(summary?.collectiveProgress)}%`}
                            description="Media de avance del alumnado activo"
                            badgeLabel="Rendimiento"
                            badgeClassName="bg-green-50 text-green-700"
                        />

                        <MetricStatCard
                            icon={<CheckCircle2 size={16} className="text-blue-600" />}
                            title="Tasa de finalización"
                            value={`${formatDecimal(summary?.completionRate)}%`}
                            description="Alumnos con progreso completado"
                            badgeLabel="Finalización"
                            badgeClassName="bg-amber-50 text-amber-700"
                        />

                        <MetricStatCard
                            icon={<Trophy size={16} className="text-blue-600" />}
                            title="Nota media"
                            value={formatDecimal(summary?.averageGrade)}
                            description="Media de calificaciones registradas"
                            badgeLabel="Calificación"
                            badgeClassName="bg-blue-50 text-blue-700"
                        />
                    </div>
                </div>
            )}
        </GenericCard>
    );
};
