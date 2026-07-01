import { Search, Loader2, Star, PlusCircle, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';
import { useCourseCatalog } from './useCourseCatalog';
import type { DBModelCourse } from './useCourseCatalog';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import { useAuth } from '../../../../auth/useAuth';

interface EnrollmentInfo {
    course: {
        course_id?: number;
        title: string;
        category?: string;
        instructors?: string;
    };
}


interface CourseCatalogProps {
    enrolledList: EnrollmentInfo[];
    onEnrollSuccess: (course: DBModelCourse) => void;
    onSetGlobalError: (message: string) => void;
    onSetGlobalSuccess: (message: string) => void;
}

export const CourseCatalog = ({
    enrolledList,
    onEnrollSuccess,
    onSetGlobalError,
    onSetGlobalSuccess
}: CourseCatalogProps) => {
    // Consumimos el contexto global de sesión hidratado desde el backend (ADR-28)
    const { user } = useAuth();

    const {
        searchKeyword,
        setSearchKeyword,
        catalogCourses,
        loadingCatalog,
        enrollingId,
        catalogError,
        handleEnrollCourse
    } = useCourseCatalog((course) => {
        onEnrollSuccess(course);
        onSetGlobalSuccess("¡Te has matriculado en el curso correctamente!");
    });

    if (catalogError) {
        onSetGlobalError(catalogError);
    }

    const visibleCatalogCourses = useMemo(() => {
        const byId = new Map<number, DBModelCourse>();

        catalogCourses.forEach((course) => {
            byId.set(course.course_id, course);
        });

        enrolledList.forEach((enroll) => {
            if (enroll.course?.course_id && !byId.has(enroll.course.course_id)) {
                byId.set(enroll.course.course_id, {
                    course_id: enroll.course.course_id,
                    title: enroll.course.title,
                    category: enroll.course.category || 'General',
                    instructors: enroll.course.instructors,
                });
            }
        });

        return Array.from(byId.values());
    }, [catalogCourses, enrolledList]);

    /**
     * Evalúa de forma determinista O(1) si el alumno está matriculado en el curso.
     * Implementa una validación dual estricta: por ID numérico (fuente de verdad global)
     * y por nombre de cadena en la lista local (compatibilidad reactiva).
     */
    const isUserEnrolled = (course: DBModelCourse): boolean => {
        // 1. Validación prioritaria por ID indexado en la sesión JWT
        if (user?.enrolledCourseIds?.includes(course.course_id)) {
            return true;
        }
        // 2. Validación secundaria por coincidencia de títulos para mutaciones en caliente de la vista
        if (enrolledList && enrolledList.length > 0) {
            return enrolledList.some(enroll =>
                enroll.course?.course_id === course.course_id ||
                enroll.course?.title?.trim().toLowerCase() === course.title?.trim().toLowerCase()
            );
        }
        return false;
    };

    return (
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm mb-8 max-w-5xl mt-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 max-h-72 overflow-y-auto p-1 scrollbar-thin">
                {visibleCatalogCourses.length === 0 && !loadingCatalog ? (
                    <p className="text-xs font-medium text-slate-400 italic py-2 col-span-full">No se encontraron cursos que coincidan con el criterio introducido.</p>
                ) : (
                    visibleCatalogCourses.map((course) => {
                        const enrolled = isUserEnrolled(course);

                        return (
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

                                        {enrolled ? (
                                            <button
                                                type="button"
                                                disabled
                                                className="bg-emerald-50 text-emerald-700 text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 border border-emerald-200 cursor-not-allowed w-fit"
                                            >
                                                <CheckCircle2 size={12} className="text-emerald-600" />
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
                        );
                    })
                )}
            </div>
        </div>
    );
};
