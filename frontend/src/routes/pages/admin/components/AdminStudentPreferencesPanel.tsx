import { useState } from 'react';
import { BarChart3, RefreshCw, UserCheck, UserX } from 'lucide-react';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import {
    getAdminStudentPreferences,
    resolveAdminStudentPreferencesError,
    type AdminStudentPreferences,
} from '../../../../services/adminStudentPreferencesService';

export const AdminStudentPreferencesPanel = () => {
    const [data, setData] = useState<AdminStudentPreferences | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const handleRefresh = async () => {
        setLoading(true);
        setError('');
        try {
            setData(await getAdminStudentPreferences());
            setLastUpdated(new Date());
        } catch (error) {
            setError(resolveAdminStudentPreferencesError(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <GenericCard className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-2">
                    <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                        <BarChart3 size={18} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-800">Preferencias de los alumnos</h2>
                        <p className="text-xs text-slate-500">Análisis global para priorizar la asignación de profesores.</p>
                    </div>
                </div>
                <GenericButton
                    type="button"
                    variant="primary"
                    onClick={handleRefresh}
                    disabled={loading}
                    label={loading ? 'Actualizando...' : 'Actualizar'}
                    icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
                    className="px-3! py-1.5! text-[11px]! font-bold! rounded-lg!"
                />
            </div>

            {lastUpdated && !error && (
                <p className="text-[10px] text-slate-400">Última actualización: {lastUpdated.toLocaleString()}</p>
            )}
            {error && <p className="text-xs font-medium text-red-600" role="alert">{error}</p>}

            {!data && !loading && !error && (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    Pulsa Actualizar para consultar las preferencias y la demanda agregada.
                </p>
            )}

            {data && !loading && (
                <>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                        {data.preferences.map((preference) => (
                            <div key={preference.dimension} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{preference.dimension}</p>
                                <p className="mt-1 text-xs font-bold text-slate-700">
                                    {preference.values.length > 0 ? preference.values.join(' / ') : 'Sin datos'}
                                </p>
                                {preference.values.length > 0 && (
                                    <p className="mt-1 text-[10px] text-slate-500">{preference.selections} selecciones</p>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                        <span>{data.studentsWithPreferences} alumnos con preferencias</span>
                        <span>{data.activeStudentsWithEnrollments} matrículas activas analizadas</span>
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-3">
                        <h3 className="text-[11px] font-black uppercase tracking-wide text-slate-500">Cursos con mayor puntuación</h3>
                        {data.courses.length === 0 ? (
                            <p className="text-[11px] italic text-slate-400">No hay preferencias ni matrículas activas suficientes.</p>
                        ) : (
                            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                                {data.courses.map((course, index) => (
                                    <div key={course.courseId} className="rounded-lg border border-slate-100 bg-white p-2.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-bold text-slate-700">{index + 1}. {course.title || 'Curso sin título'}</p>
                                                <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                                                    {course.professorAssigned ? <UserCheck size={12} className="text-emerald-600" /> : <UserX size={12} className="text-amber-600" />}
                                                    {course.professorAssigned ? `Profesor asignado: ${course.professorUsername || 'sin nombre'}` : 'Sin profesor asignado'}
                                                </p>
                                            </div>
                                            <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black text-indigo-700">{course.totalScore} puntos</span>
                                        </div>
                                        <p className="mt-1 text-[10px] text-slate-400">{course.activeEnrollments} matrículas activas</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </GenericCard>
    );
};

export default AdminStudentPreferencesPanel;
