import { useState } from 'react'; // Añadido useEffect para capturar la estampa de tiempo
import { BookOpen, Loader2, ArrowRight, Clock } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import type { EnrollmentInfo } from '../../../../services/courseTypes';
import { apiClient } from '../../../../services/apiClient';

/**
 * Componente de asignaturas matriculadas del estudiante con alineación geométrica y activación en caliente
 *  [ADR-19][ADR-34].
 */
interface EnrolledCoursesProps {
    enrolledList: EnrollmentInfo[];
    loadingEnrollments: boolean;
    onRefresh: () => void;
}

/**
 * Componente de asignaturas en curso con alineación geométrica y activación en caliente [ADR-19][ADR-34].
 * Sincroniza de forma milimétrica la altura total del contenedor con la del catálogo.
 */
export const EnrolledCourses = ({ enrolledList, loadingEnrollments, onRefresh }: EnrolledCoursesProps) => {
    // Estado local para evitar clics concurrentes que corrompan el DOM virtual durante la red
    const [mutatingId, setMutatingId] = useState<number | null>(null);

    /**
     * Dispara la mutación asíncrona en el backend para iniciar el cronómetro del curso.
     * Valida de forma segura el ID de matrícula bajo el token JWT activo.
     */
    const handleStartCourse = async (enrollmentId: number) => {
        if (!enrollmentId || mutatingId !== null) return;

        setMutatingId(enrollmentId); // Bloquea la tarjeta actual
        try {
            // Petición POST al endpoint seguro que blindamos en UserController
            await apiClient.post(`/api/auth/enrollment/${enrollmentId}/start`);
            onRefresh(); // Notifica al Dashboard padre para recargar las horas desde PostgreSQL
        } catch (err) {
            console.error("Error al iniciar el cronómetro del curso:", err);
        } finally {
            setMutatingId(null); // Libera el bloqueo global
        }
    };

    return (
        /* 
           ALINEACIÓN GEOMÉTRICA CONSOLIDADA COMPOSICIÓN PURA [ADR-13]:
           - Se utiliza GenericCard como contenedor raíz puro pasándole únicamente la prop 'className'.
           - Toda la estructura interna (Cabecera + Contenido) se inyecta vía 'children'.
        */
        <GenericCard className="bg-emerald-100/40 mt-6 mb-8 h-109 flex flex-col p-5">

            {/* CABECERA DE LA SECCIÓN (Alineación horizontal compacta: Título + Contador) */}
            <div className="flex items-center gap-2 mb-4 shrink-0">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen size={18} className="text-emerald-700" />
                    <span>Tus asignaturas</span>
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                    {enrolledList.length}
                </span>
            </div>

            {/* SCROLL DINÁMICO AUTO-AJUSTABLE [ADR-19] */}
            <div className="overflow-y-auto pr-1 p-1 custom-scrollbar space-y-3 flex-1">
                {loadingEnrollments ? (
                    <div className="h-full flex flex-col justify-center items-center bg-white border border-slate-200 rounded-xl text-slate-400">
                        <Loader2 size={24} className="animate-spin mb-2 text-emerald-600" />
                        <p className="text-xs font-medium text-slate-500">Sincronizando con PostgreSQL...</p>
                    </div>
                ) : enrolledList.length === 0 ? (
                    <div className="p-8 bg-white/80 border border-slate-200 rounded-xl text-center">
                        <p className="text-xs font-medium text-slate-400 italic">No estás matriculado en ninguna asignatura todavía.</p>
                    </div>
                ) : (
                    enrolledList.map((enroll) => {
                        const progressPct = enroll.progress_percentage || 0;
                        const isStarted = enroll.started_at !== null;
                        const isThisMutating = mutatingId === enroll.enrollmentid;
                        const durationInDays = Math.ceil((enroll.course?.duration || 0) / 24);


                        return (
                            /* Tarjetas internas adaptadas con border-slate-200 según Auditoría UI y Composición Pura */
                            <GenericCard key={enroll.enrollmentid} className="border-slate-200 shadow-sm bg-white p-0 overflow-hidden">
                                {/* CONTENEDOR INTERACTIVO NATIVO DE HTML [ADR-41] */}
                                <div className="p-4 w-full h-full">
                                    {/* CUERPO DE DATOS */}
                                    <div className="flex justify-between items-start gap-4">

                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-slate-100 text-slate-600">
                                                {enroll.course?.category || "General"}
                                            </span>
                                            <h3 className="text-sm font-bold text-slate-800 leading-tight mt-1.5 truncate">
                                                {enroll.course?.title}
                                            </h3>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Clock size={11} className="text-slate-400" />
                                                <p className="text-[11px] text-slate-400 font-medium">
                                                    Duración: {durationInDays} días | Prof. {enroll.course?.instructors || "Por asignar"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* VENTANA INFORMATIVA DE CALIFICACIONES (Contrato anticipado con el módulo docente) */}
                                    <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100/80">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">
                                                Calificaciones Académicas
                                            </span>
                                        </div>
                                        <div className="space-y-1.5">
                                            {enroll.grades && enroll.grades.length > 0 ? (
                                                enroll.grades.map((grade, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-[11px] bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm">
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
                                    {/* BARRA DE PROGRESO DE ALTA PRECISIÓN Y BOTÓN INFERIOR */}
                                    <div className="mt-3 pt-2 border-t border-slate-100">
                                        <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-semibold">
                                            <span className={isStarted ? "text-blue-600 font-bold" : "text-slate-400"}>
                                                {isStarted ? "En curso (24h/día)" : "Pendiente de inicio"}
                                            </span>
                                            <span className="font-bold text-emerald-600">{progressPct}%</span>
                                        </div>

                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                                            <div
                                                className="bg-emerald-600 h-full transition-all duration-1000"
                                                {...{ style: { width: `${progressPct}%` } }}
                                            />
                                        </div>

                                        {/* CONDICIONAL: Si no está iniciado, pinta el botón azul de acción */}
                                        {!isStarted ? (
                                            <button
                                                type="button"
                                                disabled={mutatingId !== null}
                                                onClick={() => handleStartCourse(enroll.enrollmentid)}
                                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                                            >
                                                {isThisMutating ? (
                                                    <>
                                                        <Loader2 size={14} className="animate-spin" />
                                                        <span>Iniciando...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Iniciar curso</span>
                                                        <ArrowRight size={14} />
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            /* Si ya está en curso, se despliega un estado deshabilitado elegante en tono esmeralda */
                                            <div className="w-full bg-emerald-50 text-emerald-700 text-xs font-bold py-2 px-3 rounded-lg border border-emerald-100 flex items-center justify-center gap-1 text-center select-none">
                                                <span>✓ Estudiando asignatura</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </GenericCard>
                        );
                    })
                )}
            </div >
        </GenericCard >
    );
};
