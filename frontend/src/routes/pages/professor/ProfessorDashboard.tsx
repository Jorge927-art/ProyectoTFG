import { useState } from 'react';
import { BookOpen, ArrowRight, Activity } from 'lucide-react';
import GenericButton from '../../../components/ui/genericButton/GenericButton';
import GenericCard from '../../../components/ui/genericCard/GenericCard';
import ProfessorLayout from '../../layouts/DashboardLayout';

// Importación del componente core unificado según [ADR-13]
import GenericHeader from '../../../components/ui/genericHeader/GenericHeader';

// Importación del modal local corregido
import { CourseManagementModal } from './components/CourseManagementModal';

// IMPORTACIÓN CENTRALIZADA DE DOMINIOS [DRY]
import type { TaughtCourse, TeacherMetric } from '../../../services/userDomains';

const ProfessorDashboard = () => {
    // Estado reactivo unificado plano (NotebookLM) para controlar el modal
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

    // 1. ESTADO DE ASIGNATURAS IMPARTIDAS POR EL PROFESOR
    const [myCourses] = useState<TaughtCourse[]>([
        { id: 1, title: "Desarrollo Backend con Spring Boot y Java", studentsCount: 45, averageProgress: 75, category: "Programación" },
        { id: 3, title: "Persistencia de Datos con PostgreSQL y Hibernate", studentsCount: 28, averageProgress: 60, category: "Bases de Datos" }
    ]);

    // 2. ESTADO DE MÉTRICAS Y CONTROL DE ALUMNOS
    const [metrics] = useState<TeacherMetric[]>([
        { id: 201, title: "Alumnos Activos esta semana", value: "68 / 73", description: "93% de participación en plataforma", type: "actividad" },
        { id: 202, title: "Tareas pendientes de revisión", value: 12, description: "Proyectos finales del módulo Backend", type: "tareas" }
    ]);

    return (
        <ProfessorLayout>
            <GenericHeader
                title="Panel de Control Docente"
                titleSize="text-xl font-bold"
                titleColor="text-slate-800"
                textPadding="p-0"
                containerClass="border-b border-slate-100 pb-4 mb-6"
                align="left"
                description={
                    <p className="text-xs text-slate-400 mt-0.5">
                        Gestiona el progreso de tus asignaturas asignadas y revisa las entregas
                    </p>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* COLUMNA IZQUIERDA: ASIGNATURAS QUE IMPARTE */}
                <div className="lg:col-span-2">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <BookOpen size={20} className="text-blue-600" />
                        <span>Tus asignaturas asignadas</span>
                        <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">{myCourses.length}</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {myCourses.map((course) => {
                            const progressPct = course.averageProgress;
                            let tailwindWidthClass = 'w-0';

                            if (progressPct >= 100) tailwindWidthClass = 'w-full';
                            else if (progressPct >= 90) tailwindWidthClass = 'w-11/12';
                            else if (progressPct >= 80) tailwindWidthClass = 'w-4/5';
                            else if (progressPct >= 75) tailwindWidthClass = 'w-3/4';
                            else if (progressPct >= 70) tailwindWidthClass = 'w-8/12';
                            else if (progressPct >= 60) tailwindWidthClass = 'w-3/5';
                            else if (progressPct >= 50) tailwindWidthClass = 'w-1/2';
                            else if (progressPct >= 40) tailwindWidthClass = 'w-2/5';
                            else if (progressPct >= 30) tailwindWidthClass = 'w-3/12';
                            else if (progressPct >= 25) tailwindWidthClass = 'w-1/4';
                            else if (progressPct >= 20) tailwindWidthClass = 'w-2/12';
                            else if (progressPct >= 10) tailwindWidthClass = 'w-1/12';

                            return (
                                <GenericCard key={course.id}>
                                    <div className="mb-4">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-slate-100 text-slate-600">
                                            {course.category}
                                        </span>
                                        <h3 className="text-base font-bold text-slate-800 leading-tight mt-2">
                                            {course.title}
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Total: {course.studentsCount} alumnos matriculados
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-50">
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>Progreso medio del grupo</span>
                                            <span className="font-bold text-blue-600">{course.averageProgress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                                            <div className={`bg-blue-600 h-full transition-all duration-500 ${tailwindWidthClass}`} />
                                        </div>
                                        <GenericButton
                                            variant="dark"
                                            label="Gestionar Curso"
                                            icon={<ArrowRight size={14} />}
                                            className="w-full flex-row-reverse! gap-1! text-xs! font-bold! py-2! px-3! rounded-lg! justify-center"
                                            onClick={() => setSelectedCourseId(course.id)}
                                        />
                                    </div>
                                </GenericCard>
                            );
                        })}
                    </div>
                </div>

                {/* COLUMNA DERECHA: RESUMEN DE MÉTRICAS */}
                <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-100 shadow-sm h-fit">
                    <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-blue-600" />
                        <span>Métricas de Docencia</span>
                    </h2>

                    <div className="flex flex-col gap-3">
                        {metrics.map((metric) => (
                            <GenericCard key={metric.id}>
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${metric.type === 'actividad' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                                            }`}>
                                            {metric.type === 'actividad' ? "Rendimiento" : "Correcciones"}
                                        </span>
                                        <div className="flex items-center gap-0.5 text-slate-800 text-base font-extrabold">
                                            <span>{metric.value}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-base font-bold text-slate-800 leading-tight">
                                        {metric.title}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">Estado actual</p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-50">
                                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                        📊 {metric.description}
                                    </p>
                                </div>
                            </GenericCard>
                        ))}
                    </div>
                </div>

            </div>

            {/* Inyección limpia del modal con sus propiedades exactas */}
            <CourseManagementModal
                courseId={selectedCourseId}
                isOpen={selectedCourseId !== null}
                onClose={() => setSelectedCourseId(null)}
            />
        </ProfessorLayout>
    );
};

export default ProfessorDashboard;
