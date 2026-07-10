import { useState } from 'react';
import { Star, MessageSquare, UserCheck, Loader2, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import { useActiveEvaluations } from './useActiveEvaluations';
import type { EvaluationInput } from '../../../../services/evaluationService';

/**
 * Componente de Evaluación Académica [ADR-37].
 * Permite calificar de forma asimétrica la asignatura y al profesorado.
 * Implementa un contenedor de scroll controlado para mantener la simetría visual [ADR-19].
 */
export const EvaluationPanel = () => {
    const {
        pendingList,
        loadingPending,
        isSubmitting,
        evaluationError,
        submitEvaluation
    } = useActiveEvaluations();

    // Estado local para gestionar el formulario activo de cada tarjeta
    const [formStates, setFormStates] = useState<Record<number, Partial<EvaluationInput>>>({});

    const handleRatingChange = (enrollmentId: number, field: keyof EvaluationInput, value: number | string) => {
        setFormStates(prev => ({
            ...prev,
            [enrollmentId]: { ...prev[enrollmentId], [field]: value }
        }));
    };

    const handleSend = async (enrollmentId: number, courseId: number) => {
        const state = formStates[enrollmentId];
        // Cortocircuito de seguridad: Evita el envío si el estado no existe o si ambos campos están vacíos
        if (!state || (!state.course_score && !state.instructor_score)) return;

        await submitEvaluation({
            course_id: courseId,
            course_score: state.course_score || 0, // Envía 0 si el alumno decide ignorar el curso
            course_comment: state.course_comment || '',
            instructor_score: state.instructor_score || 0, // Envía 0 si el alumno decide ignorar al profesor
            instructor_comment: state.instructor_comment || ''
        });
    };

    return (
        /* ALINEACIÓN GEOMÉTRICA: h-92 para nivelar con Asignaturas + Documentos */
        <GenericCard className="h-90 flex flex-col shadow-sm border-slate-200">
            <div className="flex items-center gap-2 mb-6">
                <div className="bg-amber-50 p-2 rounded-lg">
                    <Star className="text-amber-500 fill-amber-500" size={20} />
                </div>
                <div>
                    <h2 className="text-base font-black text-slate-800 leading-tight">
                        Evaluación académica
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Docentes y asignaturas activas
                    </p>
                </div>
            </div>

            {/* CONTENEDOR DE SCROLL [ADR-19][ADR-36] */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                {loadingPending ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 className="animate-spin mb-2" size={24} />
                        <p className="text-xs font-bold">Consultando red académica...</p>
                    </div>
                ) : pendingList.length === 0 && !evaluationError ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-100 rounded-2xl p-8 text-center">
                        <CheckCircle2 className="mx-auto text-emerald-400 mb-2" size={32} />
                        <p className="text-slate-500 text-xs font-bold">¡Todo al día! No tienes evaluaciones pendientes.</p>
                    </div>
                ) : (
                    pendingList.map((item) => {
                        // DIRECTION NOTEBOOKLM: Definición estricta del rango exigido en la recomendación
                        const RATING_RANGE = Array.from({ length: 5 }, (_, i) => i + 1);
                        const state = formStates[item.enrollmentid] || {};
                        const canSubmit = (state.course_score || state.instructor_score) && !isSubmitting;

                        return (
                            <div key={item.enrollmentid} className="p-4 bg-white border border-slate-100 rounded-xl shadow-xs space-y-4 transition-all hover:border-blue-100">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-[11px] font-black text-slate-800 uppercase leading-tight">
                                            {item.course.title}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <UserCheck size={12} className="text-blue-500" />
                                            <span className="text-[10px] text-slate-500 font-bold italic">
                                                Prof: {item.course.instructors}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Rating Asimétrico [ADR-37] */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Calidad del curso</label>
                                        <div className="flex gap-1">
                                            {RATING_RANGE.map((star) => (
                                                <GenericButton
                                                    key={star}
                                                    type="button" // DIRECTION NOTEBOOKLM: Evita comportamientos por defecto
                                                    title={`Calificar curso con ${star} estrellas`}
                                                    onClick={() => handleRatingChange(item.enrollmentid, 'course_score', star)}
                                                    variant="text"
                                                    ariaLabel={`Calificar curso con ${star} estrellas`}
                                                    icon={<Star size={16} fill={(state.course_score || 0) >= star ? "currentColor" : "none"} />}
                                                    className={`p-0! gap-0! bg-transparent! shadow-none! transition-transform! active:scale-125! ${(state.course_score || 0) >= star ? 'text-amber-400!' : 'text-slate-200!'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Desempeño docente</label>
                                        <div className="flex gap-1">
                                            {RATING_RANGE.map((star) => (
                                                <GenericButton
                                                    key={star}
                                                    type="button" // DIRECTION NOTEBOOKLM: Evita comportamientos de formulario por defecto
                                                    title={`Calificar profesor con ${star} estrellas`}
                                                    onClick={() => handleRatingChange(item.enrollmentid, 'instructor_score', star)}
                                                    variant="text"
                                                    ariaLabel={`Calificar profesor con ${star} estrellas`}
                                                    icon={<Star size={16} fill={(state.instructor_score || 0) >= star ? "currentColor" : "none"} />}
                                                    className={`p-0! gap-0! bg-transparent! shadow-none! transition-all! transform! active:scale-150! ${(state.instructor_score || 0) >= star ? 'text-blue-400!' : 'text-slate-200!'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Comentarios granulares */}
                                <div className="relative">
                                    <MessageSquare size={12} className="absolute left-3 top-3 text-slate-300" />
                                    <textarea
                                        placeholder="Escribe un comentario opcional..."
                                        className="w-full bg-slate-50 border-none rounded-lg p-2 pl-8 text-[10px] font-medium focus:ring-1 focus:ring-blue-200 outline-none resize-none"
                                        rows={2}
                                        onChange={(e) => handleRatingChange(item.enrollmentid, 'course_comment', e.target.value)}
                                    />
                                </div>

                                <GenericButton
                                    variant="dark"
                                    disabled={!canSubmit}
                                    onClick={() => handleSend(item.enrollmentid, item.course.course_id)}
                                    className="w-full text-[10px] font-black uppercase tracking-wider py-2"
                                    label={isSubmitting ? "Enviando..." : "ENVIAR EVALUACIÓN"}
                                    icon={isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                />

                            </div>
                        );
                    })
                )}
            </div>

            {evaluationError && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-[10px] font-bold animate-pulse">
                    <AlertCircle size={14} />
                    {evaluationError}
                </div>
            )}
        </GenericCard>
    );
};

export default EvaluationPanel;
