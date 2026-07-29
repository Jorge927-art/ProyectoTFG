// frontend/src/routes/pages/professor/components/TeachingMetricsPanel.tsx
import { Activity, TrendingUp, CheckCircle2, Trophy, Star, Loader2, AlertCircle } from 'lucide-react';
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
 * finalización, nota media, valoraciones del curso y valoraciones del
 * profesor.
 */
export const TeachingMetricsPanel = ({
    selectedCourseId,
    onCourseChange,
    availableCourses
}: TeachingMetricsPanelProps) => {
    const { summary, students, loading, error } = useTeachingMetrics(selectedCourseId);

    return (
        <GenericCard className="h-full flex-1 space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Activity size={18} className="text-blue-600" />
                <span>Métricas de Docencia</span>
            </h2>

            {/* SELECTOR: TODAS + asignaturas del profesor, mismo criterio que GradingCenter */}
            <div className="space-y-1">
                <label
                    htmlFor="teaching-metrics-selector"
                    className="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
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

            {loading && (
                <div className="flex items-center gap-2 justify-center py-6 text-slate-400">
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                    <span className="text-[11px] font-semibold">Calculando métricas...</span>
                </div>
            )}

            {error && !loading && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {!loading && !error && (
                <div className="flex flex-col gap-3">
                    {/* 1. Progreso Alumno (desglose por alumno) */}
                    <StudentProgressBreakdown students={students} showCourseColumn={selectedCourseId === null} />

                    {/* 2. Nota Alumno (desglose por alumno) */}
                    <StudentGradeBreakdown students={students} showCourseColumn={selectedCourseId === null} />

                    {/* 3. Progreso colectivo asignatura */}
                    <MetricStatCard
                        icon={<TrendingUp size={16} className="text-blue-600" />}
                        title="Progreso colectivo asignatura"
                        value={`${formatDecimal(summary?.collectiveProgress)}%`}
                        description="Media de avance de todos los alumnos activos"
                        badgeLabel="Rendimiento"
                        badgeClassName="bg-green-50 text-green-700"
                    />

                    {/* 4. Tasa de finalización asignatura */}
                    <MetricStatCard
                        icon={<CheckCircle2 size={16} className="text-blue-600" />}
                        title="Tasa de finalización asignatura"
                        value={`${formatDecimal(summary?.completionRate)}%`}
                        description="Porcentaje de alumnos que completaron el 100% del progreso"
                        badgeLabel="Finalización"
                        badgeClassName="bg-amber-50 text-amber-700"
                    />

                    {/* 5. Nota media */}
                    <MetricStatCard
                        icon={<Trophy size={16} className="text-blue-600" />}
                        title="Nota media"
                        value={`${formatDecimal(summary?.averageGrade)} / 10`}
                        description="Media de calificaciones registradas"
                        badgeLabel="Calificación"
                        badgeClassName="bg-blue-50 text-blue-700"
                    />

                    {/* 6. Valoraciones del curso */}
                    <MetricStatCard
                        icon={<Star size={16} className="text-amber-500 fill-amber-400" />}
                        title="Valoraciones del curso"
                        value={summary?.courseRating ? `${formatDecimal(summary.courseRating)} ★` : 'Sin valoraciones'}
                        description="Media de valoraciones de alumnos sobre la asignatura"
                        badgeLabel="Valoración"
                        badgeClassName="bg-purple-50 text-purple-700"
                    />

                    {/* 7. Valoraciones del profesor */}
                    <MetricStatCard
                        icon={<Star size={16} className="text-indigo-500 fill-indigo-400" />}
                        title="Valoración del profesor"
                        value={
                            summary?.instructorRating ? `${formatDecimal(summary.instructorRating)} ★` : 'Sin valoraciones'
                        }
                        description="Media de valoraciones del profesor por parte de los alumnos de la asignatura"
                        badgeLabel="Valoración"
                        badgeClassName="bg-indigo-50 text-indigo-700"
                    />
                </div>
            )}
        </GenericCard>
    );
};
