import { useMemo } from 'react';
import { Loader2, PlusCircle, CheckCircle2 } from 'lucide-react';
import { useCourseCatalog } from '../../../../services/useCourseCatalog';
import type { DBModelCourse } from '../../../../services/courseTypes';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import { useAuth } from '../../../../auth/useAuth';
import type { EnrollmentInfo } from '../../../../services/courseTypes';

// Importación del motor de búsqueda compartido unificado
import { CourseSearchEngine } from '../../../../components/ui/courseSearch/CourseSearchEngine';

interface StudentCoursePickerProps {
    enrolledList: EnrollmentInfo[];
    onEnrollSuccess: (course: DBModelCourse) => void;
    onSetGlobalError: (message: string) => void;
    onSetGlobalSuccess: (message: string) => void;
}

export const StudentCoursePicker = ({
    enrolledList,
    onEnrollSuccess,
    onSetGlobalError,
    onSetGlobalSuccess
}: StudentCoursePickerProps) => {
    // Consumimos el contexto global de sesión hidratado desde el backend (ADR-28)
    const { user } = useAuth();

    // Conectamos al nuevo hook genérico común pasándole la función de éxito correspondiente
    const {
        searchKeyword,
        setSearchKeyword,
        catalogCourses,
        loadingCatalog,
        actionExecutionId,  // Nombre unificado genérico
        catalogError,
        executeCourseAction // Nombre unificado genérico
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

    /**
     * Lógica de matriculación que ataca al backend con el endpoint del alumno
     */
    const handleEnrollStudent = async (courseId: number) => {
        await executeCourseAction(courseId, `/api/courses/enroll/${courseId}`, 'post');
    };

    return (
        /* 
           INYECCIÓN DEL MOTOR COMPARTIDO PARAMETRIZADO:
           Hereda toda la maquetación externa e interna, inyectando el botón específico del estudiante.
        */
        <CourseSearchEngine
            title="Catálogo Global de Cursos"
            subtitle="Encuentra asignaturas de forma aproximada por título o categoría temática"
            searchKeyword={searchKeyword}
            setSearchKeyword={setSearchKeyword}
            visibleCourses={visibleCatalogCourses}
            loadingCatalog={loadingCatalog}
            renderAction={(course: DBModelCourse) => {
                const enrolled = isUserEnrolled(course);
                const isProcessing = actionExecutionId === course.course_id;

                if (enrolled) {
                    return (
                        <GenericButton
                            type="button"
                            disabled
                            variant="success"
                            label="✓ Inscrito"
                            icon={<CheckCircle2 size={12} className="text-emerald-600" />}
                            className="bg-emerald-50! text-emerald-700! text-[10px]! font-bold! py-1.5! px-3! rounded-lg! border border-emerald-200! cursor-not-allowed! w-fit! gap-1!"
                        />
                    );
                }

                return (
                    <GenericButton
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleEnrollStudent(course.course_id)}
                        variant="primary"
                        label="Matricularme"
                        icon={isProcessing ? <Loader2 size={12} className="animate-spin" /> : <PlusCircle size={12} />}
                        className="bg-blue-600! hover:bg-blue-700! text-white! text-[10px]! font-bold! py-1.5! px-3! rounded-lg! transition-colors! cursor-pointer! disabled:bg-slate-300!"
                    />
                );
            }}
        />
    );
};

