import { X, Users, BookOpen, FileText } from 'lucide-react';
import { useCourseManagement } from './useCourseManagement';

interface CourseManagementModalProps {
    courseId: number | null;
    isOpen: boolean;
    onClose: () => void;
}

export const CourseManagementModal = ({ courseId, isOpen, onClose }: CourseManagementModalProps) => {
    // Extraemos el estado y el Lazy Loading del hook personalizado
    const {
        activeTab,
        setActiveTab,
        students,
        metrics,
        loading,
        fileError,
        handleFileChange
    } = useCourseManagement(courseId, isOpen);

    if (!isOpen || courseId === null) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-100">

                {/* Cabecera de la Consola */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h2 className="text-base font-bold text-slate-800">Consola de Gestión de Asignatura</h2>
                        <p className="text-xs text-slate-400">Control operativo y seguimiento del Curso ID: {courseId}</p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar gestión del curso"
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Selectores de la Consola */}
                <div className="flex border-b border-slate-100 bg-white px-4 gap-2">
                    <button
                        onClick={() => setActiveTab('alumnado')}
                        className={`flex items-center gap-1.5 py-3 px-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'alumnado' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Users size={14} />
                        Alumnado y Rendimiento
                    </button>
                    <button
                        onClick={() => setActiveTab('trabajos')}
                        className={`flex items-center gap-1.5 py-3 px-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'trabajos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <FileText size={14} />
                        Trabajos y Exámenes
                    </button>
                    <button
                        onClick={() => setActiveTab('metricas')}
                        className={`flex items-center gap-1.5 py-3 px-2 text-xs font-bold border-b-2 transition-colors ${activeTab === 'metricas' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <BookOpen size={14} />
                        Métricas Globales
                    </button>
                </div>
                {/* Cuerpo Contenedor de la Consola */}
                <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1 min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-slate-400 font-medium">Hidratando datos mediante Lazy Loading por pestaña...</p>
                        </div>
                    ) : (
                        <>
                            {/* PESTAÑA PRINCIPAL: ALUMNADO Y RENDIMIENTO [GRID-COLS-2 CON MICRO-GRÁFICAS DUALES] */}
                            {activeTab === 'alumnado' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {students.length === 0 ? (
                                        <p className="text-xs text-slate-400 col-span-2 text-center py-8">No hay alumnos activos registrados en esta asignatura.</p>
                                    ) : (
                                        students.map((student) => (
                                            <div key={student.studentId} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                                                <div className="mb-4">
                                                    <h4 className="text-xs font-bold text-slate-800 tracking-tight">{student.fullName}</h4>
                                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{student.email}</p>
                                                </div>

                                                {/* SISTEMA DE MICRO-GRÁFICAS DUALES COMPARATIVAS NATIIVAS */}
                                                <div className="space-y-3 pt-3 border-t border-slate-100">
                                                    {/* Dimensión 1: Progreso en Plataforma */}
                                                    <div>
                                                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                                            <span className="font-medium">Progreso Individual</span>
                                                            <span className="font-bold text-blue-600">{student.progressPercentage}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
                                                            <div
                                                                className="bg-blue-600 h-full rounded-full transition-all duration-500 absolute top-0 left-0"
                                                                style={{ width: `${student.progressPercentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    {/* Dimensión 2: Calificación Física vs Media del Grupo */}
                                                    <div>
                                                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                                            <span className="font-medium">Nota Individual (Color) vs Media Grupo (Gris)</span>
                                                            <span className="font-bold text-emerald-600">{(student.averageScore ?? 0).toFixed(1)} / 10</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
                                                            {/* Barra de Fondo Gris Tenue que representa la Media del Grupo (ej: 65% como línea base de control) */}
                                                            <div
                                                                className="bg-slate-300/60 h-full absolute top-0 left-0 transition-all duration-500"
                                                                style={{ width: `${(metrics?.groupAverageScore ?? 6.5) * 10}%` }}
                                                            />
                                                            {/* Barra de Color Superior del Alumno */}
                                                            <div
                                                                className="bg-emerald-500 h-full rounded-full transition-all duration-500 absolute top-0 left-0 mix-blend-multiply md:mix-blend-normal"
                                                                style={{ width: `${(student.averageScore ?? 0) * 10}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                            {/* PESTAÑA: TRABAJOS Y EXÁMENES [DOCUMENT MANAGER SENDER + VALIDACIÓN PDF ADR-25] */}
                            {activeTab === 'trabajos' && (
                                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm max-w-xl mx-auto">
                                    <div className="mb-5">
                                        <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                                            Document Manager (Sender Mode)
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Emite y publica guías, enunciados de exámenes o proyectos académicos directamente al tablón oficial de la asignatura.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                                                Seleccionar Documento Académico Oficial
                                            </label>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={handleFileChange}
                                                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors border border-slate-200 rounded-lg p-1 bg-slate-50"
                                            />
                                        </div>

                                        {fileError && (
                                            <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-600 font-medium">
                                                ⚠ {fileError}
                                            </div>
                                        )}

                                        <button
                                            disabled={!!fileError}
                                            className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            Transmitir y Publicar Documento
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PESTAÑA: MÉTRICAS GLOBALES */}
                            {activeTab === 'metricas' && (
                                <div className="max-w-md mx-auto bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
                                    <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                                        Rendimiento Consolidado del Grupo
                                    </h3>
                                    {metrics ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Media General</p>
                                                <p className="text-lg font-extrabold text-slate-800 mt-1">
                                                    {((metrics as unknown as { groupAverageGrade: number }).groupAverageGrade ?? 0).toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Alumnos Activos</p>
                                                <p className="text-lg font-extrabold text-slate-800 mt-1">
                                                    {metrics.activeStudentsCount}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg col-span-2">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Entregas Pendientes de Revisión</p>
                                                <p className="text-lg font-extrabold text-amber-600 mt-1">
                                                    {((metrics as unknown as { pendingSubmissionsCount: number }).pendingSubmissionsCount ?? 0)} tareas
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 text-center py-4">No se pudieron recuperar las métricas globales del curso.</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
