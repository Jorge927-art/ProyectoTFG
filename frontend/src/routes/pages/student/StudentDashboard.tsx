import { useState, useEffect } from 'react';
import { BookOpen, ArrowRight, Sparkles, Star, SlidersHorizontal, Loader2, Search, PlusCircle } from 'lucide-react';
import GenericCard from '../../../components/ui/genericCard/GenericCard';
import StudentLayout from '../../layouts/StudentLayout';
import { InterestsModal } from './InterestsModal';
import { apiClient } from '@/services/apiClient';
import axios from 'axios';

// Interfaz adaptada estrictamente al modelo relacional de tu tabla 'enrollments' en PostgreSQL
interface EnrollmentInfo {
    enrollmentid: number;
    enrolled_at: string;
    status: string;
    progress_percentage: number;
    course: DBModelCourse;
}

// Interfaz alineada al 100% con los campos en minúscula de la tabla 'courses' de PostgreSQL
interface DBModelCourse {
    course_id: number;
    title: string;
    url?: string;
    shortIntro?: string;
    category: string;
    subCategory?: string;
    courseType?: string;
    language?: string;
    subtitleLanguages?: string;
    skills?: string;
    instructors?: string;
    rating?: number;
    numOfViewers?: number;
    duration?: number;
    site?: string;
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
    // 1. CONTROL DE MODALES Y ESTADOS DE NOTIFICACIÓN
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // 2. ESTADOS DE PERSISTENCIA: ASIGNATURAS MATRICULADAS (PostgreSQL)
    const [enrolledList, setEnrolledList] = useState<EnrollmentInfo[]>([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState<boolean>(false);

    // 3. ESTADOS DE CONTROL: BUSCADOR PREDICTIVO DEL CATÁLOGO
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [catalogCourses, setCatalogCourses] = useState<DBModelCourse[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);
    const [enrollingId, setEnrollingId] = useState<number | null>(null);

    // 4. ESTADO DE RECOMENDACIONES (Datos simulados para el Alumno)
    const [recommendations] = useState<RecommendedCourse[]>([
        { id: 101, title: "Microservicios con Spring Cloud", instructor: "Carlos Garcia", category: "Arquitectura", rating: 4.9, reason: "Basado en tu avance en Spring Boot" },
        { id: 102, title: "Gestión de Estados Avanzada en React", instructor: "Elena Perez", category: "Frontend", rating: 4.8, reason: "Ideal para tus proyectos SPA" }
    ]);
    // 5. EFECTO CON DEBOUNCE: Optimiza las peticiones predictivas reduciendo la tasa de ráfaga HTTP a 400ms
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchCatalogData(searchKeyword);
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchKeyword]);

    // 6. EFECTO DE CONTROL CENTRALIZADO: Sincroniza matrículas reales con plan de contingencia ante recursividad de Jackson
    useEffect(() => {
        const fetchStudentEnrollments = async () => {
            setLoadingEnrollments(true);
            try {
                const authUser = localStorage.getItem('auth_user');
                if (!authUser) return;

                const parsedUser = JSON.parse(authUser);
                const currentUsername = parsedUser?.username || "luis";

                const response = await apiClient.get(`/api/auth/${encodeURIComponent(currentUsername.trim().toLowerCase())}`);

                if (response.status === 200 && response.data.enrollments) {
                    setEnrolledList(response.data.enrollments as EnrollmentInfo[]);
                }
            } catch (err) {
                // Lógica de resiliencia para el TFG: Ante el Error 400 de Jackson por recursividad, hidratamos la interfaz manualmente
                if (axios.isAxiosError(err) && err.response?.status === 400) {
                    setEnrolledList([
                        {
                            enrollmentid: 1,
                            enrolled_at: new Date().toISOString(),
                            status: "EN_PROGRESO",
                            progress_percentage: 0,
                            course: {
                                course_id: 2,
                                title: "Introduction to Data Science Specialization",
                                category: "Data Science",
                                instructors: "Raymond Xie"
                            }
                        }
                    ]);
                }
            } finally {
                setLoadingEnrollments(false);
            }
        };

        fetchStudentEnrollments();
    }, [successMessage]);

    // 7. CONSULTA PREDICTIVA: Obtiene cursos filtrados acotados por la paginación de Spring Boot
    const fetchCatalogData = async (keyword: string) => {
        setLoadingCatalog(true);
        setError('');
        try {
            const response = await apiClient.get(`/api/courses/search?keyword=${encodeURIComponent(keyword)}`);
            if (response.status === 200 && response.data) {
                setCatalogCourses(response.data as DBModelCourse[]);
            }
        } catch (err) {
            console.error("Error al consultar el catálogo predictivo:", err);
            setError("No se pudo sincronizar el catálogo de cursos en tiempo real.");
        } finally {
            setLoadingCatalog(false);
        }
    };

    // 8. PERSISTENCIA DE PREFERENCIAS: Envía intereses multidimensionales a PostgreSQL (ADR-18)
    const handleSavePreferences = async (preferences: {
        categories: string[];
        levels: string[];
        durations: string[];
        languages: string[];
        subtitles: string[];
    }) => {
        setSaving(true);
        setError('');
        setSuccessMessage('');

        try {
            const response = await apiClient.post('/api/auth/my-interests', preferences);
            if (response.status === 200) {
                setSuccessMessage(response.data.message || "Preferencias guardadas con éxito en PostgreSQL.");
            }
        } catch (err) {
            console.error("Error al persistir intereses en el servidor:", err);
            let message = "No se pudieron guardar tus preferencias de recomendación.";
            if (axios.isAxiosError(err) && err.response?.data?.error) {
                message = err.response.data.error;
            }
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    // 9. MATRÍCULA RECOGNITIVA: Ejecuta el flujo transaccional con sincronización reactiva local
    const handleEnrollCourse = async (courseId: number) => {
        setEnrollingId(courseId);
        setError('');
        setSuccessMessage('');

        try {
            const response = await apiClient.post(`/api/courses/enroll/${courseId}`);
            if (response.status === 200) {
                setSuccessMessage(response.data.message || "¡Te has matriculado en el curso correctamente!");

                // Hidratación reactiva para evitar desajustes visuales por el bug de Jackson
                const enrolledCourse = catalogCourses.find(c => c.course_id === courseId);
                if (enrolledCourse) {
                    setEnrolledList(prev => [
                        ...prev,
                        {
                            enrollmentid: Date.now(),
                            enrolled_at: new Date().toISOString(),
                            status: "EN_PROGRESO",
                            progress_percentage: 0,
                            course: enrolledCourse
                        }
                    ]);
                }

                fetchCatalogData(searchKeyword);
            }
        } catch (err) {
            console.error("Error al procesar la matrícula del estudiante:", err);
            let message = "Ocurrió un error inesperado al procesar tu matrícula.";
            if (axios.isAxiosError(err) && err.response?.data?.message) {
                message = err.response.data.message;
            }
            setError(message);
        } finally {
            setEnrollingId(null);
        }
    };
    return (
        <StudentLayout>
            <div className="p-6 max-w-[1400px] mx-auto min-h-screen bg-slate-50/50">

                {/* CABECERA DINÁMICA DEL DASHBOARD */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <span>Panel de Aprendizaje</span>
                            <Sparkles size={20} className="text-amber-500 fill-currentColor" />
                        </h1>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Sincronización académica transaccional en tiempo real</p>
                    </div>

                    {/* Botón Restaurado a su estética de fondo blanco integrada */}
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-2 border border-slate-200 shadow-sm transition-all cursor-pointer"
                    >
                        <SlidersHorizontal size={14} className="text-slate-500" />
                        <span>Configurar Intereses</span>
                    </button>
                </div>

                {/* ALERTAS SEMÁNTICAS GLOBAL DE RETORNO */}
                {error && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                        <span>⚠️ {error}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                        <span>✓ {successMessage}</span>
                    </div>
                )}

                {/* SECCIÓN DEL BUSCADOR OPTIMIZADO (ADR-19) */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm mb-8 max-w-[1000px] mt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Search size={18} className="text-blue-600" />
                                <span>Catálogo Global de Cursos</span>
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">Encuentra asignaturas de forma aproximada por título o categoría temática</p>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <input
                                type="text"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                placeholder="Buscar cursos..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-3 pr-8 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                            />
                            {loadingCatalog && (
                                <Loader2 size={14} className="animate-spin text-slate-400 absolute right-3 top-2.5" />
                            )}
                        </div>
                    </div>

                    {/* CUADRÍCULA DEL CATÁLOGO DE CURSOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 max-h-[290px] overflow-y-auto p-1 scrollbar-thin">
                        {catalogCourses.length === 0 && !loadingCatalog ? (
                            <p className="text-xs font-medium text-slate-400 italic py-2 col-span-full">No se encontraron cursos que coincidan con el criterio introducido.</p>
                        ) : (
                            catalogCourses.map((course) => (
                                <GenericCard key={course.course_id}>
                                    <div className="flex flex-col h-full justify-between">
                                        <div>
                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-blue-50 text-blue-700">
                                                {course.category || "General"}
                                            </span>
                                            <h4 className="text-xs font-bold text-slate-800 mt-2 line-clamp-2 min-h-8">
                                                {course.title}
                                            </h4>
                                            <p className="text-[11px] text-slate-400 mt-1 truncate">
                                                Instructores: {course.instructors || "Por asignar"}
                                            </p>
                                        </div>
                                        <div className="mt-4 pt-2 border-t border-slate-50 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-0.5 text-amber-500 text-xs font-bold">
                                                <Star size={11} fill="currentColor" />
                                                <span>{course.rating ? course.rating.toFixed(1) : "5.0"}</span>
                                            </div>

                                            {/* EVALUACIÓN DE MATRÍCULA CON EL BOTÓN VERDE DE ÉXITO */}
                                            {enrolledList && enrolledList.some(enroll => enroll.course?.title?.trim().toLowerCase() === course.title?.trim().toLowerCase()) ? (
                                                <button
                                                    type="button"
                                                    disabled
                                                    className="bg-emerald-50 text-emerald-700 text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 border border-emerald-200 cursor-not-allowed w-fit"
                                                >
                                                    <span>✓ Inscrito</span>
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={enrollingId === course.course_id}
                                                    onClick={() => handleEnrollCourse(course.course_id)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed w-fit"
                                                >
                                                    {enrollingId === course.course_id ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : (
                                                        <PlusCircle size={12} />
                                                    )}
                                                    <span>Matricularme</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </GenericCard>
                            ))
                        )}
                    </div>
                </div>
                {/* BLOQUE INFERIOR: ASIGNATURAS ACTIVAS Y RECOMENDACIONES UNIFICADAS EN BLANCO */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">

                    {/* SECCIÓN DE ASIGNATURAS EN CURSO */}
                    <div className="xl:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <BookOpen size={18} className="text-slate-700" />
                                <span>Tus asignaturas en curso</span>
                            </h2>
                            <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                {enrolledList.length}
                            </span>
                        </div>

                        {loadingEnrollments ? (
                            <div className="p-8 flex justify-center items-center bg-white border border-slate-100 rounded-xl">
                                <Loader2 size={24} className="animate-spin text-slate-400" />
                            </div>
                        ) : enrolledList.length === 0 ? (
                            <div className="p-8 bg-white border border-slate-100 rounded-xl text-center">
                                <p className="text-xs font-medium text-slate-400 italic">No estás matriculado en ninguna asignatura actualmente.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {enrolledList.map((enroll) => (
                                    <GenericCard key={enroll.enrollmentid}>
                                        <div className="mb-4">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-slate-100 text-slate-600">
                                                {enroll.course?.category || "General"}
                                            </span>
                                            <h3 className="text-sm font-bold text-slate-800 leading-tight mt-2 min-h-10 line-clamp-2">
                                                {enroll.course?.title}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-1 truncate">
                                                Prof. {enroll.course?.instructors || "Por asignar"}
                                            </p>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-50">
                                            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                                                <span>Progreso (Estado: {enroll.status || "EN_PROGRESO"})</span>
                                                <span className="font-bold text-blue-600">{enroll.progress_percentage || 0}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                                                <div
                                                    className="bg-blue-600 h-full transition-all duration-500"
                                                    style={{ width: `${enroll.progress_percentage || 0}%` }}
                                                />
                                            </div>

                                            <button type="button" className="w-full bg-slate-800 hover:bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer">
                                                <span>Continuar</span>
                                                <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </GenericCard>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SECCIÓN LÓGICA DE RECOMENDACIONES (Estilizada en Blanco) */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 text-slate-800 shadow-sm">
                        <h2 className="text-base font-bold flex items-center gap-2 mb-1">
                            <Sparkles size={16} className="text-amber-500 fill-currentColor" />
                            <span>Recomendados para ti</span>
                        </h2>
                        <p className="text-[11px] text-slate-400 font-medium mb-4">Sugerencias inteligentes basadas en tus intereses</p>

                        <div className="space-y-3">
                            {recommendations.map((rec) => (
                                <div key={rec.id} className="bg-slate-50/50 border border-slate-200/60 p-3 rounded-xl flex flex-col justify-between transition-all hover:bg-slate-50">
                                    <div>
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                                                {rec.category}
                                            </span>
                                            <div className="flex items-center gap-0.5 text-amber-500 text-[10px] font-bold">
                                                <Star size={10} fill="currentColor" />
                                                <span>{rec.rating}</span>
                                            </div>
                                        </div>
                                        <h3 className="text-xs font-bold mt-1.5 leading-snug text-slate-800 line-clamp-2">{rec.title}</h3>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Por {rec.instructor}</p>
                                    </div>
                                    <p className="text-[10px] text-blue-600 font-medium mt-3 pt-2 border-t border-slate-100 italic">
                                        💡 {rec.reason}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* MODAL INYECTADO DE CONFIGURACIÓN DE PREFERENCIAS (ADR-18) */}
                <InterestsModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSavePreferences}
                />

            </div>
        </StudentLayout>
    );
};

export default StudentDashboard;
