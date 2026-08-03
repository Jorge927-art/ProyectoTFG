import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2, GraduationCap, UserCheck, TrendingUp } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import {
    getAdminGlobalStatistics,
    finalizeAdminGlobalPreviousYear,
    resolveAdminGlobalStatisticsErrorMessage,
    type AdminGlobalStatistics,
    type AdminGlobalYearComparison,
} from '../../../../services/adminGlobalStatisticsService';

export const GlobalStatisticsPanel = () => {
    const [data, setData] = useState<AdminGlobalStatistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [consolidating, setConsolidating] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const loadStatistics = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await getAdminGlobalStatistics();
            setData(response);
        } catch (err) {
            setError(resolveAdminGlobalStatisticsErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadStatistics();
    }, []);

    const handleFinalizePreviousYear = async () => {
        setConsolidating(true);
        setError('');
        setSuccessMessage('');

        try {
            const response = await finalizeAdminGlobalPreviousYear();
            setSuccessMessage(`${response.message} Año consolidado: ${response.finalizedYear}.`);
            await loadStatistics();
        } catch (err) {
            setError(resolveAdminGlobalStatisticsErrorMessage(err));
        } finally {
            setConsolidating(false);
        }
    };

    const topEnrollmentMax = useMemo(() => {
        if (!data?.topCourses?.length) {
            return 0;
        }
        return Math.max(...data.topCourses.map((item) => item.enrolledStudents));
    }, [data]);

    return (
        <GenericCard className="space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 size={18} className="text-cyan-600" />
                Panel Estadístico Global
            </h2>

            <div className="flex justify-end">
                <GenericButton
                    type="button"
                    onClick={handleFinalizePreviousYear}
                    disabled={loading || consolidating}
                    variant="primary"
                    label={consolidating ? 'Consolidando...' : 'Consolidar año cerrado'}
                    icon={consolidating ? <Loader2 size={14} className="animate-spin" /> : undefined}
                    className="px-3! py-1.5! text-[11px]! font-bold! rounded-lg!"
                />
            </div>

            {loading && (
                <div className="flex justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-cyan-500" />
                </div>
            )}

            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
            {successMessage && <p className="text-xs text-emerald-700 font-medium">{successMessage}</p>}

            {!loading && !error && data && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <KpiCard
                            label="Alumnos (total actual)"
                            value={data.totalStudents}
                            icon={<GraduationCap size={16} className="text-blue-600" />}
                        />
                        <KpiCard
                            label="Profesores (total actual)"
                            value={data.totalProfessors}
                            icon={<UserCheck size={16} className="text-emerald-600" />}
                        />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wide">
                            Cursos con mayor nº de inscritos
                        </h3>

                        <div className="max-h-52 overflow-y-auto pr-1 space-y-1.5">
                            {data.topCourses.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic">No hay cursos con matrículas activas.</p>
                            ) : (
                                data.topCourses.map((course, index) => {
                                    const width = topEnrollmentMax > 0
                                        ? Math.max(6, Math.round((course.enrolledStudents / topEnrollmentMax) * 100))
                                        : 0;

                                    return (
                                        <div key={`${course.courseId ?? index}-${index}`} className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <p className="text-xs font-bold text-slate-700 truncate">
                                                    {index + 1}. {course.courseTitle}
                                                </p>
                                                <span className="text-[10px] font-black text-cyan-700 bg-cyan-50 rounded px-1.5 py-0.5 shrink-0">
                                                    {course.enrolledStudents}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                <div className="h-full bg-cyan-600" style={{ width: `${width}%` }} />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wide">
                            Comparativa anual (actual vs 2 años anteriores)
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <ComparisonBars
                                title="Alumnos"
                                rows={data.yearlyComparisons}
                                selector={(item) => item.totalStudents}
                                colorClass="bg-blue-600"
                            />
                            <ComparisonBars
                                title="Profesores"
                                rows={data.yearlyComparisons}
                                selector={(item) => item.totalProfessors}
                                colorClass="bg-emerald-600"
                            />
                            <ComparisonBars
                                title="Top inscritos"
                                rows={data.yearlyComparisons}
                                selector={(item) => item.topCourseEnrollment}
                                colorClass="bg-amber-500"
                            />
                        </div>

                        <p className="text-[10px] text-slate-500">
                            <TrendingUp size={11} className="inline mr-1" />
                            El año en curso es dinámico; los años previos pueden aparecer como ficticios hasta su consolidación real al cierre anual.
                        </p>
                    </div>
                </>
            )}
        </GenericCard>
    );
};

const KpiCard = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 flex items-center gap-2">
        <div className="shrink-0">{icon}</div>
        <div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-wide">{label}</p>
            <p className="text-sm font-black text-slate-800">{value}</p>
        </div>
    </div>
);

const ComparisonBars = ({
    title,
    rows,
    selector,
    colorClass,
}: {
    title: string;
    rows: AdminGlobalYearComparison[];
    selector: (row: AdminGlobalYearComparison) => number;
    colorClass: string;
}) => {
    const max = rows.length > 0 ? Math.max(...rows.map(selector)) : 0;

    return (
        <div className="border border-slate-100 rounded-lg p-2 bg-white">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 mb-2">{title}</p>
            <div className="space-y-1.5">
                {rows.map((row) => {
                    const value = selector(row);
                    const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;

                    return (
                        <div key={`${title}-${row.year}`}>
                            <div className="flex items-center justify-between text-[10px] mb-0.5">
                                <span className="font-bold text-slate-700">
                                    {row.year} {!row.realData ? '(ficticio)' : ''}
                                </span>
                                <span className="font-black text-slate-700">{value}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className={`${colorClass} h-full`} style={{ width: `${width}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
