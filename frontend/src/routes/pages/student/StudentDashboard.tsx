import { useState, useEffect } from 'react';
import { BookOpen, ArrowRight, Sparkles, Star, SlidersHorizontal, Loader2, Search, PlusCircle } from 'lucide-react';
import GenericCard from '../../../components/ui/genericCard/GenericCard';
import StudentLayout from '../../layouts/StudentLayout';
import GenericButton from '../../../components/ui/genericButton/GenericButton';
import { InterestsModal } from './InterestsModal';
import { apiClient } from '@/services/apiClient';
import axios from 'axios';

// Interfaz adaptada al modelo relacional Enrollment de tu backend
interface EnrollmentInfo {
    enrollmentId: number;
    enrolledAt: string;
    status: string;
    progressPercentage: number;
    course: DBModelCourse;
}

// Interfaz unificada estrictamente con las propiedades de tu entidad Courses.java de PostgreSQL
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
    // 1. CONTROL DE APERTURA DEL MODAL DE INTERESES Y ESTADOS DE CARGA
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // 2. ESTADOS PARA LAS ASIGNATURAS MATRICULADAS REALES DESDE EL BACKEND
    const [enrolledList, setEnrolledList] = useState<EnrollmentInfo[]>([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState<boolean>(false);

    // 3. ESTADOS PARA EL BUSCADOR PREDICTIVO DEL CATÁLOGO DE CURSOS
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [catalogCourses, setCatalogCourses] = useState<DBModelCourse[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);
    const [enrollingId, setEnrollingId] = useState<number | null>(null);

    // 4. ESTADO DE RECOMENDACIONES INTELIGENTES (Datos de prueba para el Alumno)
    const [recommendations] = useState<RecommendedCourse[]>([
        { id: 101, title: "Microservicios con Spring Cloud", instructor: "Carlos Garcia", category: "Arquitectura", rating: 4.9, reason: "Basado en tu avance en Spring Boot" },
        { id: 102, title: "Gestión de Estados Avanzada en React", instructor: "Elena Perez", category: "Frontend", rating: 4.8, reason: "Ideal para tus proyectos SPA" }
    ]);

    // 5. EFECTO CON DEBOUNCE: Escucha la barra de búsqueda y hace peticiones predictivas a Spring Boot
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchCatalogData(searchKeyword);
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchKeyword]);

    // 6. EFECTO DE CONTROL CENTRALIZADO: Sincroniza y recarga las matrículas reales al arrancar o cambiar el estado
    useEffect(() => {
        const fetchStudentEnrollments = async () => {
            setLoadingEnrollments(true);
            try {
                const authUser = localStorage.getItem('auth_user');
                if (!authUser) return;
                const username = JSON.parse(authUser).username;

                const response = await apiClient.get(`/api/auth/${username}`);
                if (response.status === 200 && response.data.enrollments) {
                    setEnrolledList(response.data.enrollments as EnrollmentInfo[]);
                }
            } catch (err) {
                console.error("Error al recuperar el historial de matrículas:", err);
            } finally {
                setLoadingEnrollments(false);
            }
        };

        fetchStudentEnrollments();
    }, [successMessage]);

    // 7. FUNCIÓN ASÍNCRONA: Obtiene los cursos filtrados (máximo 10 gracias a la paginación del Backend)
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
    // 8. CONEXIÓN CON EL BACKEND: Guarda los intereses multidimensionales
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

    // 9. MATRÍCULA TRANSACCIONAL: Llama de forma segura al endpoint POST
    const handleEnrollCourse = async (courseId: number) => {
        setEnrollingId(courseId);
        setError('');
        setSuccessMessage('');

        try {
            const response = await apiClient.post(`/api/courses/enroll/${courseId}`);
            if (response.status === 200) {
                setSuccessMessage(response.data.message || "¡Te has matriculado en el curso correctamente!");
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
            {/* ALERTAS VISUALES DE SISTEMA STATELESS */}
            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-3.5 rounded-xl text-xs font-semibold mb-6 animate-in fade-in duration-200">
                    ⚠️ {error}
                </div>
            )}
            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-3.5 rounded-xl text-xs font-semibold mb-6 animate-in fade-in duration-200">
                    ✅ {successMessage}
                </div>
            )}

            {/* SECCIÓN BUSCADOR: OPTIMIZADO CON TOP 12 PARA EL TFG */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <Search size={18} className="text-blue-600" />
                            <span>Catálogo Global de Cursos</span>
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">Encuentra asignaturas de forma aproximada por título, categoría o habilidades</p>
                    </div>
                </div>

                <div className="relative w-full max-w-xl">
                    <input
                        type="text"
                        placeholder="Escribe para buscar (ej. Java, Python, Frontend...)"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    />
                    <div className="absolute left-3 top-3.5 text-slate-400">
                        {loadingCatalog ? <Loader2 size={14} className="animate-spin text-blue-600" /> : <Search size={14} />}
                    </div>
                </div>
                {/* Renderizado dinámico de la cuadrícula filtrada - Caja exterior con menos altura fijada a 240px */}
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
                                        <button
                                            type="button"
                                            disabled={enrollingId === course.course_id}
                                            onClick={() => handleEnrollCourse(course.course_id)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                                        >
                                            {enrollingId === course.course_id ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                <PlusCircle size={12} />
                                            )}
                                            <span>Matricularme</span>
                                        </button>
                                    </div>
                                </div>
                            </GenericCard>
                        ))
                    )}
                </div>

            </div>
            {/* CUERPO PRINCIPAL DEL DASHBOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* COLUMNA IZQUIERDA: ASIGNATURAS EN CURSO REALES */}
                <div className="lg:col-span-2">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <BookOpen size={20} className="text-blue-600" />
                        <span>Tus asignaturas en curso</span>
                        <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
                            {enrolledList.length}
                        </span>
                    </h2>

                    {loadingEnrollments ? (
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 py-4">
                            <Loader2 size={16} className="animate-spin text-blue-600" />
                            <span>Consultando tus asignaturas en PostgreSQL...</span>
                        </div>
                    ) : enrolledList.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl text-center">
                            <p className="text-xs font-medium text-slate-500 italic">No estás matriculado en ninguna asignatura actualmente.</p>
                            <p className="text-[11px] text-slate-400 mt-1">Utiliza el Catálogo Global de arriba para buscar y matricularte en tu primer curso.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {enrolledList.map((enroll) => (
                                <GenericCard key={enroll.enrollmentId}>
                                    <div className="mb-4">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-slate-100 text-slate-600">
                                            {enroll.course?.category || "General"}
                                        </span>
                                        <h3 className="text-base font-bold text-slate-800 leading-tight mt-2 min-h-10 line-clamp-2">
                                            {enroll.course?.title}
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1 truncate">
                                            Prof. {enroll.course?.instructors || "Por asignar"}
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-50">
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>Progreso (Estado: {enroll.status})</span>
                                            <span className="font-bold text-blue-600">{enroll.progressPercentage}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                                            <div
                                                className={`bg-blue-600 h-full transition-all duration-500 w-[${enroll.progressPercentage}%]`}
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

                {/* COLUMNA DERECHA: SECCIÓN DE INTERESES Y RECOMENDACIONES */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="w-full flex">
                        <GenericButton
                            label={saving ? "Guardando..." : "Mis intereses"}
                            icon={saving ? <Loader2 size={14} className="animate-spin" /> : <SlidersHorizontal size={14} />}
                            onClick={() => setIsModalOpen(true)}
                            variant="white"
                        />
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm h-fit">
                        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Sparkles size={18} className="text-amber-500" />
                            <span>Recomendados para ti</span>
                        </h2>
                        <div className="flex flex-col gap-3">
                            {recommendations.map((rec) => (
                                <GenericCard key={rec.id}>
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
                                        <p className="text-xs text-slate-400 mt-1">Prof. {rec.instructor}</p>
                                    </div>
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
