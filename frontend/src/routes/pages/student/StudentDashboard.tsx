import { useState } from 'react';
import { BookOpen, ArrowRight, Sparkles, Star, SlidersHorizontal } from 'lucide-react';
import GenericCard from '../../../components/ui/genericCard/GenericCard';
import StudentLayout from '../../layouts/StudentLayout';
import GenericButton from '../../../components/ui/genericButton/GenericButton';
import { InterestsModal } from './InterestsModal';

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
    // 1. CONTROL DE APERTURA DEL MODAL DE INTERESES
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    // 2. ESTADO DE ASIGNATURAS MATRICULADAS (Datos de prueba para el Alumno)
    const [courses] = useState<Course[]>([
        { id: 1, title: "Desarrollo Backend con Spring Boot y Java", instructor: "Carlos Garcia", progress: 75, category: "Programación" },
        { id: 2, title: "Arquitecturas SPA Modernas con React y TypeScript", instructor: "Elena Rostova", progress: 40, category: "Frontend" }
    ]);

    // 3. ESTADO DE RECOMENDACIONES INTELIGENTES (Datos de prueba para el Alumno)
    const [recommendations] = useState<RecommendedCourse[]>([
        { id: 101, title: "Microservicios con Spring Cloud", instructor: "Carlos Garcia", category: "Arquitectura", rating: 4.9, reason: "Basado en tu avance en Spring Boot" },
        { id: 102, title: "Gestión de Estados Avanzada en React", instructor: "Elena Perez", category: "Frontend", rating: 4.8, reason: "Ideal para tus proyectos SPA" }
    ]);

    // 4. MANEJADOR GENÉRICO PARA SALVAR LAS PREFERENCIAS (Simula la futura llamada a Spring Boot)
    const handleSavePreferences = (preferences: { categories: string[]; levels: string[]; durations: string[] }) => {
        console.log("Preferencias recolectadas de forma genérica para enviar a PostgreSQL:", preferences);
        // Aquí conectaremos mañana el apiClient.post('/api/recommendations/preferences', preferences)
    };
    return (
        <StudentLayout>
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
                            /* PRIMERA REFRACTORIZACIÓN: Tarjeta genérica pura por composición */
                            <GenericCard key={course.id}>
                                {/* Encabezado semántico */}
                                <div className="mb-4">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-slate-100 text-slate-600">
                                        {course.category}
                                    </span>
                                    <h3 className="text-base font-bold text-slate-800 leading-tight mt-2">
                                        {course.title}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Prof. {course.instructor}
                                    </p>
                                </div>

                                {/* Cuerpo y barra de progreso sin estilos inline */}
                                <div className="mt-4 pt-3 border-t border-slate-50">
                                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                                        <span>Progreso</span>
                                        <span className="font-bold text-blue-600">{course.progress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                                        <div
                                            className={`bg-blue-600 h-full transition-all duration-500 w-[${course.progress}%]`}
                                        />
                                    </div>
                                    <button className="w-full bg-slate-800 hover:bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1">
                                        <span>Continuar</span>
                                        <ArrowRight size={14} />
                                    </button>
                                </div>
                            </GenericCard>
                        ))}
                    </div>
                </div>

                {/* COLUMNA DERECHA: SECCIÓN DE INTERESES Y RECOMENDACIONES */}
                <div className="lg:col-span-1 flex flex-col gap-4">

                    {/* INTEGRACIÓN DEL BOTÓN DE INTERESES REUTILIZABLE */}
                    <div className="w-full flex">
                        <GenericButton
                            label="Mis intereses"
                            icon={<SlidersHorizontal size={14} />}
                            onClick={() => setIsModalOpen(true)} // <-- Cambiado: Abre el modal de forma reactiva
                            variant="white"
                        />
                    </div>

                    {/* BLOQUE DE RECOMENDACIONES INTELIGENTES */}
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm h-fit">
                        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Sparkles size={18} className="text-amber-500" />
                            <span>Recomendados para ti</span>
                        </h2>

                        <div className="flex flex-col gap-3">
                            {recommendations.map((rec) => (
                                /* SEGUNDA REFRACTORIZACIÓN: Tarjeta elástica orientada al contenido */
                                <GenericCard key={rec.id}>
                                    {/* Encabezado flexible con puntuación */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-blue-50 text-blue-700">
                                                {rec.category}
                                            </span>
                                            <div className="flex items-center gap-0.5 text-amber-500 text-xs font-bold">
                                                <Star size={10} fill="currentColor" />
                                                <span>{rec.rating}</span>
                                            </div>
                                        </div>
                                        <h3 className="text-base font-bold text-slate-800 leading-tight">
                                            {rec.title}
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Prof. {rec.instructor}
                                        </p>
                                    </div>

                                    {/* Pie de recomendación semántico */}
                                    <div className="mt-4 pt-3 border-t border-slate-50">
                                        <p className="text-[10px] text-amber-800 bg-amber-50/50 p-2 rounded border border-amber-100/30">
                                            {rec.reason}
                                        </p>
                                    </div>
                                </GenericCard>
                            ))}
                        </div>
                    </div>

                </div>

            </div>

            {/* RENDERING CONDICIONAL DEL MODAL DE INTERESES */}
            <InterestsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSavePreferences}
            />

        </StudentLayout>
    );
};

export default StudentDashboard;
