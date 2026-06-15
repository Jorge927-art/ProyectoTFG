import { useState } from 'react';
import { BookOpen, ArrowRight, Sparkles, Star } from 'lucide-react';
import GenericCard from '../../../components/ui/genericCard/GenericCard';

interface Course {
    id: number;
    title: string;
    instructor: string;
    progress: number;
    category: string;
}

interface RecommendedCourse {
    id: number;
    title: string;
    instructor: string;
    category: string;
    rating: number;
    reason: string;
}

const StudentDashboard = () => {
    // 1. ESTADO DE ASIGNATURAS MATRICULADAS (Datos de prueba para el Alumno)
    const [courses] = useState<Course[]>([
        { id: 1, title: "Desarrollo Backend con Spring Boot y Java", instructor: "Carlos Mendoza", progress: 75, category: "Programación" },
        { id: 2, title: "Arquitecturas SPA Modernas con React y TypeScript", instructor: "Elena Rostova", progress: 40, category: "Frontend" }
    ]);

    // 2. ESTADO DE RECOMENDACIONES DE IA PARA EL ALUMNO
    const [recommendations] = useState<RecommendedCourse[]>([
        { id: 101, title: "Microservicios con Spring Cloud", instructor: "Carlos Mendoza", category: "Arquitectura", rating: 4.9, reason: "Basado en tu avance en Spring Boot" },
        { id: 102, title: "Gestión de Estados Avanzada en React (Zustand)", instructor: "Elena Rostova", category: "Frontend", rating: 4.8, reason: "Ideal para tus proyectos SPA" }
    ]);

    return (
        /* 
            🛠️ AJUSTE DE ALTURA CON LA NAVBAR COMPACTA:
            - Se añade pt-4 (padding top sutil) para que el contenido empiece inmediatamente 
              debajo de la nueva barra de navegación estrecha sin dejar huecos en blanco.
        */
        <div className="min-h-screen bg-slate-50 font-sans pt-4 pb-12">

            {/* 🛡️ CABECERA ELIMINADA CON ÉXITO PARA MINIMALISMO ABSOLUTO */}

            <main className="max-w-6xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* COLUMNA IZQUIERDA: ASIGNATURAS EN CURSO */}
                    <div className="lg:col-span-2">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <BookOpen size={20} className="text-blue-600" />
                            <span>Tus asignaturas en curso</span>
                            <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">{courses.length}</span>
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {courses.map((course) => (
                                <GenericCard
                                    key={course.id}
                                    tag={course.category}
                                    title={course.title}
                                    subtitle={`Prof. ${course.instructor}`}
                                    footerChildren={
                                        <>
                                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                <span>Progreso</span>
                                                <span className="font-bold text-blue-600">{course.progress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                                                <div className="bg-blue-600 h-full" style={{ width: `${course.progress}%` }} />
                                            </div>
                                            <button className="w-full bg-slate-800 hover:bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1">
                                                <span>Continuar</span>
                                                <ArrowRight size={14} />
                                            </button>
                                        </>
                                    }
                                />
                            ))}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: RECOMENDACIONES INTELIGENTES */}
                    <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-100 shadow-sm h-fit">
                        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Sparkles size={18} className="text-amber-500" />
                            <span>Recomendados para ti</span>
                        </h2>

                        <div className="flex flex-col gap-3">
                            {recommendations.map((rec) => (
                                <GenericCard
                                    key={rec.id}
                                    tag={rec.category}
                                    tagColorClass="bg-blue-50 text-blue-700"
                                    title={rec.title}
                                    subtitle={`Prof. ${rec.instructor}`}
                                    extraHeaderElement={
                                        <div className="flex items-center gap-0.5 text-amber-500 text-xs font-bold">
                                            <Star size={10} fill="currentColor" />
                                            <span>{rec.rating}</span>
                                        </div>
                                    }
                                    footerChildren={
                                        <p className="text-[10px] text-amber-800 bg-amber-50/50 p-2 rounded border border-amber-100/30">
                                            💡 {rec.reason}
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

export default StudentDashboard;

