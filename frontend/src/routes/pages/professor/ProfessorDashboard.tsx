import { useState, useEffect } from 'react'; // 1. Añadimos useEffect aquí
import { BookOpen, ArrowRight, Activity } from 'lucide-react';
import GenericCard from '../../../components/ui/genericCard/GenericCard';
import ProfessorLayout from '../../layouts/DashboardLayout';
import TaughtCoursesGrid from './components/TaughtCoursesGrid';

// Importación del componente core unificado según [ADR-13]
import GenericHeader from '../../../components/ui/genericHeader/GenericHeader';

// Importación del modal local corregido
import { CourseManagementModal } from './components/CourseManagementModal';

// IMPORTACIÓN CENTRALIZADA DE DOMINIOS [DRY]
import type { TaughtCourse, TeacherMetric } from '../../../services/userDomains';

// 2. Importamos el servicio para contar los alumnos de raíz
import { getActiveStudentsByCourse } from '../../../services/evaluationService';

const ProfessorDashboard = () => {
    // Estado reactivo unificado plano (NotebookLM) para controlar el modal
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

    // 1. ESTADO DE ASIGNATURAS IMPARTIDAS POR EL PROFESOR
    const [myCourses, setMyCourses] = useState<TaughtCourse[]>([
        { id: 1, title: "Desarrollo Backend con Spring Boot y Java", studentsCount: 0, averageProgress: 75, category: "Programación" },
        { id: 3, title: "Persistencia de Datos con PostgreSQL y Hibernate", studentsCount: 0, averageProgress: 60, category: "Bases de Datos" }
    ]);

    // 3. EFECTO DE CARGA INICIAL: Hidratar los contadores de alumnos reales nada más abrir la página
    useEffect(() => {
        const loadRealStudentCounts = async () => {
            try {
                // Mapeamos los cursos y traemos la longitud real de alumnos de cada uno en paralelo
                const updatedCourses = await Promise.all(
                    myCourses.map(async (course) => {
                        const studentsData = await getActiveStudentsByCourse(course.id);
                        return {
                            ...course,
                            studentsCount: studentsData.length // Reemplaza el valor estático por la cantidad real de la API
                        };
                    })
                );
                setMyCourses(updatedCourses);
            } catch (error) {
                console.error("Error cargando los contadores reales en el Dashboard:", error);
            }
        };

        loadRealStudentCounts();
        // Se ejecuta una sola vez al montar el componente de forma segura
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Función intermedia para actualizar el contador real enviado desde el modal (mantiene sincronía si hay cambios dentro)
    const handleSyncCount = (courseId: number, realCount: number) => {
        setMyCourses(prevCourses =>
            prevCourses.map(course =>
                course.id === courseId
                    ? { ...course, studentsCount: realCount }
                    : course
            )
        );
    };

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
                        <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
                            {myCourses.length}
                        </span>
                    </h2>

                    {/* Inyección del nuevo componente modularizado */}
                    <TaughtCoursesGrid
                        courses={myCourses}
                        onManageCourse={(id: number) => setSelectedCourseId(id)}
                        actionIcon={<ArrowRight size={14} />}
                    />
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

            {/* Inyección limpia del modal con la nueva propiedad añadida */}
            <CourseManagementModal
                courseId={selectedCourseId}
                isOpen={selectedCourseId !== null}
                onClose={() => setSelectedCourseId(null)}
                onSyncCount={handleSyncCount}
            />
        </ProfessorLayout>
    );
};

export default ProfessorDashboard;
