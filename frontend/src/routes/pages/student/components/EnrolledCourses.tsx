import { useState } from 'react';
import { ArrowRight, BookOpen, Clock, Loader2 } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import type { EnrollmentInfo } from '../../../../services/courseTypes';
import { apiClient } from '../../../../services/apiClient';

interface EnrolledCoursesProps {
    enrolledList: EnrollmentInfo[];
    loadingEnrollments: boolean;
    onRefresh: () => void;
    className?: string;
}

const formatCourseDuration = (durationHours?: number): string => {
    const safeHours = typeof durationHours === 'number' && Number.isFinite(durationHours) ? durationHours : 0;

    if (safeHours <= 0) {
        return '0 horas';
    }

    if (safeHours > 24) {
        const durationInDays = Math.ceil(safeHours / 24);
        return durationInDays === 1 ? '1 día' : `${durationInDays} días`;
    }

    const roundedHours = Math.ceil(safeHours);
    return roundedHours === 1 ? '1 hora' : `${roundedHours} horas`;
};

const clampProgress = (value: number | null | undefined): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round(value)));
};

export const EnrolledCourses = ({ enrolledList, loadingEnrollments, onRefresh, className = '' }: EnrolledCoursesProps) => {
    const [mutatingEnrollmentId, setMutatingEnrollmentId] = useState<number | null>(null);

    const handleStartCourse = async (enrollmentId: number) => {
        if (!enrollmentId || mutatingEnrollmentId !== null) {
            return;
        }

        setMutatingEnrollmentId(enrollmentId);
        try {
            await apiClient.post(`/api/auth/enrollment/${enrollmentId}/start`);
            onRefresh();
        } catch (error) {
            console.error('Error al iniciar el cronómetro del curso:', error);
        } finally {
            setMutatingEnrollmentId(null);
        }
    };

    return (
        <GenericCard className={`bg-emerald-100/40 flex flex-col p-5 ${className}`.trim()}>
            <div className="flex items-center gap-2 mb-4 shrink-0">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen size={18} className="text-emerald-700" />
                    <span>Tus asignaturas</span>
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                    {enrolledList.length}
                </span>
            </div>

            <div className="overflow-y-auto pr-1 p-1 custom-scrollbar space-y-3 flex-1">
                {loadingEnrollments && (
                    <div className="h-full flex flex-col justify-center items-center bg-white border border-slate-200 rounded-xl text-slate-400">
                        <Loader2 size={24} className="animate-spin mb-2 text-emerald-600" />
                        <p className="text-xs font-medium text-slate-500">Sincronizando con PostgreSQL...</p>
                    </div>
                )}

                {!loadingEnrollments && enrolledList.length === 0 && (
                    <div className="p-8 bg-white/80 border border-slate-200 rounded-xl text-center">
                        <p className="text-xs font-medium text-slate-400 italic">No estás matriculado en ninguna asignatura todavía.</p>
                    </div>
                )}

                {!loadingEnrollments && enrolledList.length > 0 && enrolledList.map((enrollment) => {
                    const enrollmentId = enrollment.enrollmentid;
                    const isStarted = enrollment.started_at !== null;
                    const isMutatingThisCard = mutatingEnrollmentId === enrollmentId;
                    const progressPct = clampProgress(enrollment.progress_percentage);
                    const durationLabel = formatCourseDuration(enrollment.course?.duration);
                    const categoryLabel = enrollment.course?.category || 'General';
                    const instructorLabel = enrollment.course?.instructors || 'Por asignar';

                    return (
                        <GenericCard key={enrollmentId} className="border-slate-200 shadow-sm bg-white p-0 overflow-hidden">
                            <div className="p-4 w-full h-full">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-green-50 text-green-700 border border-green-100">
                                            {categoryLabel}
                                        </span>
                                        <h3 className="text-sm font-bold text-slate-800 leading-tight mt-1.5 truncate">
                                            {enrollment.course?.title}
                                        </h3>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Clock size={11} className="text-slate-400" />
                                            <p className="text-[11px] text-slate-400 font-medium">
                                                Duración: {durationLabel} | Prof. {instructorLabel}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100/80">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">
                                            Calificaciones Académicas
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {enrollment.grades && enrollment.grades.length > 0 ? (
                                            enrollment.grades.map((grade, index) => (
                                                <div key={`${enrollmentId}-${index}`} className="flex justify-between items-center text-[11px] bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm">
                                                    <span className="font-bold text-slate-600 truncate pr-2">{grade.title}</span>
                                                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-black text-[10px] shrink-0">
                                                        {grade.score}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-[10px] text-slate-400 font-medium italic pl-0.5">
                                                Aún no hay calificaciones publicadas por el docente.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 pt-2 border-t border-slate-100">
                                    <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-semibold">
                                        <span className={isStarted ? 'text-blue-600 font-bold' : 'text-slate-400'}>
                                            {isStarted ? 'En curso' : 'Listo para iniciar'}
                                        </span>
                                        <span className="font-bold text-emerald-600">{progressPct}%</span>
                                    </div>

                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                                        <div className="bg-emerald-600 h-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
                                    </div>

                                    {!isStarted ? (
                                        <GenericButton
                                            type="button"
                                            disabled={mutatingEnrollmentId !== null}
                                            onClick={() => handleStartCourse(enrollmentId)}
                                            variant="primary"
                                            label={isMutatingThisCard ? 'Iniciando...' : 'Iniciar curso'}
                                            icon={isMutatingThisCard ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                                            className="w-full gap-1! text-xs! font-bold! py-2! px-3! rounded-lg! transition-all! active:scale-[0.98]! justify-center! shrink-0! cursor-pointer! disabled:cursor-not-allowed!"
                                        />
                                    ) : (
                                        <div className="w-full bg-emerald-50 text-emerald-700 text-xs font-bold py-2 px-3 rounded-lg border border-emerald-100 flex items-center justify-center gap-1 text-center select-none">
                                            <span>✓ Estudiando asignatura</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </GenericCard>
                    );
                })}
            </div>
        </GenericCard>
    );
};
