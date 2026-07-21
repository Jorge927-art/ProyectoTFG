import { useState } from 'react';
import { useCourseCatalog } from '../../../../services/useCourseCatalog';
import { CourseSearchEngine } from '../../../../components/ui/courseSearch/CourseSearchEngine';
import type { DBModelCourse } from '../../../../services/courseTypes';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import { Loader2, BookOpen, AlertCircle } from 'lucide-react';

interface ProfessorCoursePickerProps {
    onSelectionSuccess?: (course: DBModelCourse) => void;
}

export const ProfessorCoursePicker = ({ onSelectionSuccess }: ProfessorCoursePickerProps) => {
    const [successMessage, setSuccessMessage] = useState<string>('');

    const {
        searchKeyword,
        setSearchKeyword,
        catalogCourses,
        loadingCatalog,
        actionExecutionId,
        catalogError,
        executeCourseAction
    } = useCourseCatalog((course) => {
        setSuccessMessage(`¡Te has asignado correctamente como profesor del curso: "${course.title}"!`);
        if (onSelectionSuccess) {
            onSelectionSuccess(course);
        }
    });

    const isCourseVacant = (course: DBModelCourse): boolean => {
        if (!course.instructors) return true;
        const text = course.instructors.trim().toLowerCase();
        return text === '' || text === 'por asignar';
    };

    const handleSelectCourse = async (courseId: number) => {
        setSuccessMessage('');
        await executeCourseAction(courseId, `/api/courses/${courseId}/assign-teacher`, 'post');
    };

    return (
        <div className="w-full flex flex-col">
            {catalogError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-medium text-red-600 flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{catalogError}</span>
                </div>
            )}

            {successMessage && (
                <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-xs font-bold text-green-700 flex items-center gap-2">
                    <span>✓</span>
                    <span>{successMessage}</span>
                </div>
            )}

            <CourseSearchEngine
                title="Panel de Selección de Asignaturas Docentes"
                subtitle="Busca y asóciate a los cursos del catálogo general para tomar el control operativo de las actas"
                searchKeyword={searchKeyword}
                setSearchKeyword={setSearchKeyword}
                visibleCourses={catalogCourses}
                loadingCatalog={loadingCatalog}
                renderAction={(course: DBModelCourse) => {
                    const vacant = isCourseVacant(course);
                    const isProcessing = actionExecutionId === course.course_id;

                    return (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full mt-2">
                            {vacant ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide">
                                    🪹 Vacante
                                </span>
                            ) : (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-30 truncate">
                                    👤 {course.instructors}
                                </span>
                            )}

                            <GenericButton
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleSelectCourse(course.course_id)}
                                // Usamos estrictamente variantes reales de tu GenericButton
                                variant={vacant ? "primary" : "white"}
                                label={isProcessing ? "Asignando..." : "Impartir Curso"}
                                icon={isProcessing ? <Loader2 size={12} className="animate-spin" /> : <BookOpen size={12} />}
                                className={`text-[10px]! py-1.5! px-3! ${vacant
                                    ? "bg-indigo-600! hover:bg-indigo-700!"
                                    : "bg-white! text-gray-700! border border-gray-200!"
                                    }`}
                            />
                        </div>
                    );
                }}
            />
        </div>
    );
};
