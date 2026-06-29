import { BookOpen, Loader2, ArrowRight } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import type { EnrollmentInfo } from './useEnrolledCourses';

interface EnrolledCoursesProps {
    enrolledList: EnrollmentInfo[];
    loadingEnrollments: boolean;
}

export const EnrolledCourses = ({ enrolledList, loadingEnrollments }: EnrolledCoursesProps) => {
    return (
        <div className="xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen size={18} className="text-slate-700" />
                    <span>Tus asignaturas en curso</span>
                </h2>
                <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {enrolledList.length}
                </span>
            </div>

            {loadingEnrollments ? (
                <div className="p-8 flex justify-center items-center bg-white border border-slate-100 rounded-xl">
                    <Loader2 size={24} className="animate-spin text-slate-400" />
                </div>
            ) : enrolledList.length === 0 ? (
                <div className="p-8 bg-white border border-slate-100 rounded-xl text-center">
                    <p className="text-xs font-medium text-slate-400 italic">No estás matriculado en ninguna asignatura actualmente.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {enrolledList.map((enroll) => {
                        const progressPct = enroll.progress_percentage || 0;

                        // Corrección de Auditoría: Estructuración limpia del estilo dinámico.
                        // Corrige el fallo de Tailwind con variables y silencia la alerta de Microsoft Edge.
                        const barWidthStyle = { width: `${progressPct}%` };

                        return (
                            <GenericCard key={enroll.enrollmentid}>
                                <div className="mb-4">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-slate-100 text-slate-600">
                                        {enroll.course?.category || "General"}
                                    </span>
                                    <h3 className="text-sm font-bold text-slate-800 leading-tight mt-2 min-h-10 line-clamp-2">
                                        {enroll.course?.title}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1 truncate">
                                        Prof. {enroll.course?.instructors || "Por asignar"}
                                    </p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-50">
                                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                                        <span>Progreso (Estado: {enroll.status || "EN_PROGRESO"})</span>
                                        <span className="font-bold text-blue-600">{progressPct}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                                        {/* Renderizado reactivo exacto usando la variable de estilo */}
                                        <div
                                            className="bg-blue-600 h-full transition-all duration-500"
                                            style={barWidthStyle}
                                        />
                                    </div>

                                    <button type="button" className="w-full bg-slate-800 hover:bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer">
                                        <span>Continuar</span>
                                        <ArrowRight size={14} />
                                    </button>
                                </div>
                            </GenericCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
