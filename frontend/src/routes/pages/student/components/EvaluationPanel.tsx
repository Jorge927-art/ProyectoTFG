import { useState } from 'react';
import { Star, MessageSquare, Award, UserCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import { useActiveEvaluations } from './useActiveEvaluations';

export const EvaluationPanel = () => {
    const {
        pendingList,
        loadingPending,
        isSubmitting,
        evaluationError,
        setEvaluationError,
        submitEvaluation
    } = useActiveEvaluations();

    // --- ESTADOS INTERACTIVOS DEL FORMULARIO ---
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | null>(null);
    const [courseScore, setCourseScore] = useState<number>(0);
    const [courseComment, setCourseComment] = useState<string>('');
    const [instructorScore, setInstructorScore] = useState<number>(0);
    const [instructorComment, setInstructorComment] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Estados auxiliares para el efecto hover visual de las estrellas
    const [hoverCourse, setHoverCourse] = useState<number>(0);
    const [hoverInstructor, setHoverInstructor] = useState<number>(0);

    const activeEnrollment = pendingList.find(e => e.enrollmentid === selectedEnrollmentId);

    const resetForm = () => {
        setSelectedEnrollmentId(null);
        setCourseScore(0);
        setCourseComment('');
        setInstructorScore(0);
        setInstructorComment('');
        setHoverCourse(0);
        setHoverInstructor(0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeEnrollment) return;

        if (courseScore === 0 || instructorScore === 0) {
            setEvaluationError("Por favor, asigna una puntuación de estrellas tanto a la asignatura como al profesor.");
            return;
        }

        const payload = {
            course_id: activeEnrollment.course.course_id,
            course_score: courseScore,
            course_comment: courseComment.trim() || "",
            instructor_score: instructorScore,
            instructor_comment: instructorComment.trim() || ""
        };

        const success = await submitEvaluation(payload);
        if (success) {
            setSuccessMessage(`¡Evaluación enviada con éxito para: ${activeEnrollment.course.title}!`);
            resetForm();
            setTimeout(() => setSuccessMessage(''), 5000);
        }
    };

    const starsArray = [1, 2, 3, 4, 5];

    return (
        /* ALINEACIÓN GEOMÉTRICA CONSOLIDADA: Mantiene simetría con h-109 */
        <GenericCard className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-109">
            {/* CABECERA DEL COMPONENTE */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Award size={18} className="text-amber-600" />
                    <span>Evaluación Académica de Docentes y Cursos</span>
                </h2>
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingList.length} pendientes
                </span>
            </div>

            {/* ALERT BOXES DE FEEDBACK DE RED */}
            {evaluationError && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2 shrink-0">
                    <AlertCircle size={14} className="shrink-0" />
                    <p className="truncate">{evaluationError}</p>
                </div>
            )}

            {successMessage && (
                <div className="mb-3 p-2.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-lg flex items-center gap-2 shrink-0">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <p className="truncate">{successMessage}</p>
                </div>
            )}
            {/* CONTENEDOR DINÁMICO ASÍNCRONO */}
            <div className="flex-1 flex flex-col min-h-0">
                {loadingPending ? (
                    <div className="h-full flex flex-col justify-center items-center bg-white border border-slate-100 rounded-xl text-slate-400 p-4">
                        <Loader2 size={24} className="animate-spin mb-2 text-amber-600" />
                        <p className="text-xs font-medium text-slate-500">Sincronizando asignaturas matriculadas...</p>
                    </div>
                ) : pendingList.length === 0 ? (
                    <div className="p-6 bg-white/80 border border-slate-100 rounded-xl text-center flex flex-col justify-center h-full">
                        <p className="text-xs font-medium text-slate-400 italic">Has evaluado todas tus asignaturas vigentes. ¡Buen trabajo!</p>
                    </div>
                ) : !selectedEnrollmentId ? (

                    /* VISTA 1: LISTADO DE ASIGNATURAS POR EVALUAR [SCROLL CONTROLADO] */
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                        <p className="text-[11px] text-slate-400 font-medium mb-2">Selecciona una asignatura activa para calificar su contenido y a su docente:</p>
                        {pendingList.map((enroll) => (
                            <div
                                key={enroll.enrollmentid}
                                className="flex justify-between items-center p-3 bg-white border border-slate-100 hover:border-amber-300 hover:bg-amber-50/20 rounded-xl shadow-sm transition-all group"
                            >
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xs font-bold text-slate-700 truncate">{enroll.course.title}</h3>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Docente: {enroll.course.instructors || "Por asignar"}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setEvaluationError(''); setSelectedEnrollmentId(enroll.enrollmentid); }}
                                    className="ml-3 px-3 py-1.5 bg-slate-100 hover:bg-amber-600 hover:text-white text-slate-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer shadow-xs"
                                >
                                    Evaluar
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (

                    /* VISTA 2: FORMULARIO INTERACTIVO GRANULAR DE RATING DUAL */
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between min-h-0 bg-transparent overflow-y-auto custom-scrollbar">
                        <div className="space-y-4">
                            {/* Cabecera del Curso bajo Evaluación */}
                            <div className="border-b pb-2">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded uppercase">Cuestionario Activo</span>
                                <h3 className="text-xs font-bold text-slate-800 truncate mt-1">{activeEnrollment?.course.title}</h3>
                            </div>

                            {/* DIMENSIÓN 1: EVALUACIÓN DE LA ASIGNATURA */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                                    <MessageSquare size={13} className="text-blue-500" />
                                    <span>1. Calidad del Contenido del Curso</span>
                                </label>
                                <div className="flex items-center gap-1 mb-2">
                                    {starsArray.map((star: number) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setCourseScore(star)}
                                            onMouseEnter={() => setHoverCourse(star)}
                                            onMouseLeave={() => setHoverCourse(0)}
                                            className="text-slate-200 hover:scale-110 transition-transform cursor-pointer"
                                            aria-label={`Calificar curso con ${star} estrellas`}
                                            title={`Calificar curso con ${star} estrellas`}
                                        >
                                            <Star
                                                size={18}
                                                className={(hoverCourse || courseScore) >= star ? "fill-amber-400 text-amber-400" : "text-slate-300"}
                                            />
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={courseComment}
                                    onChange={(e) => setCourseComment(e.target.value)}
                                    placeholder="¿Qué opinas del material didáctico y las prácticas? (Opcional)"
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:border-amber-500 focus:outline-hidden custom-scrollbar h-12 resize-none"
                                    maxLength={300}
                                />
                            </div>

                            {/* DIMENSIÓN 2: EVALUACIÓN DEL PROFESOR / INSTRUCTOR */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                                    <UserCheck size={13} className="text-emerald-500" />
                                    <span>2. Desempeño del Docente ({activeEnrollment?.course.instructors || "Profesor"})</span>
                                </label>
                                <div className="flex items-center gap-1 mb-2">
                                    {starsArray.map((star: number) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setInstructorScore(star)}
                                            onMouseEnter={() => setHoverInstructor(star)}
                                            onMouseLeave={() => setHoverInstructor(0)}
                                            className="text-slate-200 hover:scale-110 transition-transform cursor-pointer"
                                            aria-label={`Calificar docente con ${star} estrellas`}
                                            title={`Calificar docente con ${star} estrellas`}
                                        >
                                            <Star
                                                size={18}
                                                className={(hoverInstructor || instructorScore) >= star ? "fill-amber-400 text-amber-400" : "text-slate-300"}
                                            />
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={instructorComment}
                                    onChange={(e) => setInstructorComment(e.target.value)}
                                    placeholder="¿Cómo valoras las explicaciones y tutorías del docente? (Opcional)"
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:border-amber-500 focus:outline-hidden custom-scrollbar h-12 resize-none"
                                    maxLength={300}
                                />
                            </div>
                        </div>

                        {/* ACCIONES DEL FORMULARIO */}
                        <div className="flex gap-3 pt-3 border-t mt-4 shrink-0">
                            <button
                                type="button"
                                onClick={resetForm}
                                disabled={isSubmitting}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                            >
                                Volver
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <span>Enviar Calificación</span>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </GenericCard>
    );
};
