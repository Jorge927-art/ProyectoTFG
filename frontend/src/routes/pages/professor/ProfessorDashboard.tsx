import { useState, useCallback, useEffect } from 'react';
import { BookOpen, ArrowRight, Activity } from 'lucide-react';
import { useAuth } from '../../../auth/useAuth';
import GenericCard from '../../../components/ui/genericCard/GenericCard';
import ProfessorLayout from '../../layouts/DashboardLayout';
import TaughtCoursesGrid from './components/TaughtCoursesGrid';

// Importación del componente core unificado según [ADR-13]
import GenericHeader from '../../../components/ui/genericHeader/GenericHeader';

// Importación del modal local corregido
import { CourseManagementModal } from './components/CourseManagementModal';

// 1. Importación del nuevo buscador común adaptado al docente
import { ProfessorCoursePicker } from './components/ProfessorCoursePicker';

// IMPORTACIÓN CENTRALIZADA DE DOMINIOS [DRY]
import type { TaughtCourse, TeacherMetric } from '../../../services/userDomains';
import type { DBModelCourse } from '../../../services/courseTypes';

// 2. Importamos el servicio para contar los alumnos de raíz
import { getActiveStudentsByCourse, getProfessorAssignedCourses } from '../../../services/evaluationService';

const DASHBOARD_METRICS: TeacherMetric[] = [
    { id: 201, title: "Alumnos Activos esta semana", value: "68 / 73", description: "93% de participación en plataforma", type: "actividad" },
    { id: 202, title: "Tareas pendientes de revisión", value: 12, description: "Proyectos finales del módulo Backend", type: "tareas" }
];

const normalizeCategory = (course: DBModelCourse): string => {
    const category = (course.category || '').trim();
    const subCategory = (course.subCategory || '').trim();
    const courseType = (course.courseType || '').trim();

    // Si la categoría principal es demasiado genérica, priorizamos una etiqueta más específica.
    if (category.toLowerCase() === 'general') {
        if (subCategory.length > 0) return subCategory;
        if (courseType.length > 0) return courseType;
    }

    if (category.length > 0) return category;
    if (subCategory.length > 0) return subCategory;
    if (courseType.length > 0) return courseType;

    return 'General';
};

const ProfessorDashboard = () => {
    const { user } = useAuth();

    const professorAliases = [
        user?.username,
        user?.email,
        user?.email?.split('@')[0],
        ...(user?.username ? user.username.split(/[\s._@-]+/) : [])
    ]
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

    // Estado reactivo unificado plano (NotebookLM) para controlar el modal
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

    // 1. ESTADO DE ASIGNATURAS IMPARTIDAS POR EL PROFESOR
    const [myCourses, setMyCourses] = useState<TaughtCourse[]>([]);

    useEffect(() => {
        let cancelled = false;

        const hydrateAssignedCourses = async () => {
            try {
                const assignedCourses = await getProfessorAssignedCourses();

                const coursesWithCounts = await Promise.all(
                    assignedCourses.map(async (course) => {
                        let studentsCount = 0;

                        try {
                            const studentsData = await getActiveStudentsByCourse(course.course_id);
                            studentsCount = studentsData.length;
                        } catch (error) {
                            console.error(`Error cargando el conteo de alumnos para el curso ${course.course_id}:`, error);
                        }

                        return {
                            id: course.course_id,
                            title: course.title,
                            category: normalizeCategory(course),
                            studentsCount,
                            averageProgress: 0
                        } as TaughtCourse;
                    })
                );

                if (cancelled) return;
                setMyCourses(coursesWithCounts);
            } catch (error) {
                console.error('Error hidratando asignaturas asignadas del profesor:', error);
            }
        };

        hydrateAssignedCourses();

        return () => {
            cancelled = true;
        };
    }, []);

    // Función intermedia para actualizar el contador real enviado desde el modal (mantiene sincronía si hay cambios dentro)
    const handleSyncCount = useCallback((courseId: number, realCount: number) => {
        setMyCourses(prevCourses => {
            let changed = false;

            const nextCourses = prevCourses.map(course => {
                if (course.id !== courseId) return course;
                if (course.studentsCount === realCount) return course;

                changed = true;
                return { ...course, studentsCount: realCount };
            });

            return changed ? nextCourses : prevCourses;
        });

    }, []);

    /**
     * Callback reactivo que se dispara cuando el buscador común confirma la asignación exitosa en el backend.
     * Transforma el modelo canónico DBModelCourse al dominio local TaughtCourse para inyectarlo en caliente.
     */
    const handleCourseSelectionSuccess = useCallback(async (newCourse: DBModelCourse) => {
        let studentsCount = 0;

        try {
            const studentsData = await getActiveStudentsByCourse(newCourse.course_id);
            studentsCount = studentsData.length;
        } catch (error) {
            console.error("Error cargando el conteo inicial de alumnos para el curso asignado:", error);
        }

        const adaptedCourse: TaughtCourse = {
            id: newCourse.course_id,
            title: newCourse.title,
            category: normalizeCategory(newCourse),
            studentsCount,
            averageProgress: 0
        };

        setMyCourses(prevCourses => {
            // Evitamos duplicar en el array local si por alguna razón ya existía en la lista
            if (prevCourses.some(c => c.id === adaptedCourse.id)) return prevCourses;
            return [...prevCourses, adaptedCourse];
        });
    }, []);

    // 2. ESTADO DE MÉTRICAS Y CONTROL DE ALUMNOS
    const metrics = DASHBOARD_METRICS;

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

            {/* 
               1. EL BUSCADOR EN ANCHO COMPLETO PANORÁMICO (FUERA DEL GRID): 
               Ocupa de forma independiente todo el ancho horizontal superior sin deformar las columnas.
            */}
            <div className="w-full block mb-8 overflow-x-hidden">
                <ProfessorCoursePicker
                    onSelectionSuccess={handleCourseSelectionSuccess}
                    initialAssignedCourseIds={myCourses.map((course) => course.id)}
                    currentProfessorAliases={professorAliases}
                />
            </div>

            {/* 2. REJILLA INDEPENDIENTE: SEPARACIÓN DE CONTENIDOS EN 3 COLUMNAS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* COLUMNA IZQUIERDA: ASIGNATURAS QUE IMPARTE (TOMA 2 DE LAS 3 COLUMNAS) */}
                <div className="lg:col-span-2">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <BookOpen size={20} className="text-blue-600" />
                        <span>Tus asignaturas asignadas</span>
                        <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
                            {myCourses.length}
                        </span>
                    </h2>

                    {/* Rejilla interna modularizada de asignaturas */}
                    <TaughtCoursesGrid
                        courses={myCourses}
                        onManageCourse={(id: number) => setSelectedCourseId(id)}
                        actionIcon={<ArrowRight size={14} />}
                    />
                </div>

                {/* COLUMNA DERECHA: RESUMEN DE MÉTRICAS (TOMA 1 DE LAS 3 COLUMNAS) */}
                <div className="lg:col-span-1">
                    {/* Consumo estricto de GenericCard para unificar el fondo visual y limpiar alertas de ESLint */}
                    <GenericCard className="h-fit">
                        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-blue-600" />
                            <span>Métricas de Docencia</span>
                        </h2>

                        <div className="flex flex-col gap-3">
                            {metrics.map((metric) => (
                                <GenericCard key={metric.id} className="p-4 border-slate-100 shadow-none hover:shadow-none bg-slate-50/30">
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

                                    <div className="mt-4 pt-3 border-t border-slate-100">
                                        <p className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100">
                                            📊 {metric.description}
                                        </p>
                                    </div>
                                </GenericCard>
                            ))}
                        </div>
                    </GenericCard>
                </div>

            </div>

            {/* Inyección operativa del modal con sincronía reactiva de alumnos */}
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
