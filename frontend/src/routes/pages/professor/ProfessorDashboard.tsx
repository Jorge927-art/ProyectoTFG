import { useState } from 'react';
import { BookOpen, ArrowRight, Activity } from 'lucide-react';
import GenericCard from '@/components/ui/genericCard/GenericCard';

interface TaughtCourse {
    id: number;
    title: string;
    studentsCount: number;
    averageProgress: number;
    category: string;
}

interface TeacherMetric {
    id: number;
    title: string;
    value: string | number;
    description: string;
    type: string;
}

const ProfessorDashboard = () => {
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
        <div className="min-h-screen bg-slate-50 font-sans pb-12">
            {/* 
                La Navbar ya NO se incluye aquí porque index.tsx (AppRoutes) 
                la renderiza de forma global para toda la aplicación.
            */}
            <main className="max-w-6xl mx-auto px-6 pt-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* COLUMNA IZQUIERDA: ASIGNATURAS QUE IMPARTE */}
                    <div className="lg:col-span-2">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <BookOpen size={20} className="text-blue-600" />
                            <span>Tus asignaturas asignadas</span>
                            <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">{myCourses.length}</span>
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {myCourses.map((course) => (
                                <GenericCard
                                    key={course.id}
                                    tag={course.category}
                                    title={course.title}
                                    subtitle={`Total: ${course.studentsCount} alumnos matriculados`}
                                    footerChildren={
                                        <>
                                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                <span>Progreso medio del grupo</span>
                                                <span className="font-bold text-blue-600">{course.averageProgress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                                                <div className="bg-blue-600 h-full" style={{ width: `${course.averageProgress}%` }} />
                                            </div>
                                            <button className="w-full bg-slate-800 hover:bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1">
                                                <span>Gestionar Curso</span>
                                                <ArrowRight size={14} />
                                            </button>
                                        </>
                                    }
                                />
                            ))}
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
                                <GenericCard
                                    key={metric.id}
                                    tag={metric.type === 'actividad' ? "Rendimiento" : "Correcciones"}
                                    tagColorClass={metric.type === 'actividad' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}
                                    title={metric.title}
                                    subtitle="Estado actual"
                                    extraHeaderElement={
                                        <div className="flex items-center gap-0.5 text-slate-800 text-base font-extrabold">
                                            <span>{metric.value}</span>
                                        </div>
                                    }
                                    footerChildren={
                                        <p className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                            📊 {metric.description}
                                        </p>
                                    }
                                />
                            ))}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default ProfessorDashboard;
