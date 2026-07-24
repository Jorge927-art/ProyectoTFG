import { useMemo, useState } from 'react';
import { useAuth } from '../../../../auth/useAuth';
import { useCourseCatalog } from '../../../../services/useCourseCatalog';
import { CourseSearchEngine } from '../../../../components/ui/courseSearch/CourseSearchEngine';
import type { DBModelCourse } from '../../../../services/courseTypes';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import { Loader2, BookOpen, AlertCircle } from 'lucide-react';

interface ProfessorCoursePickerProps {
    onSelectionSuccess?: (course: DBModelCourse) => void;
    initialAssignedCourseIds?: readonly number[];
    currentProfessorAliases?: readonly string[];
}

export const ProfessorCoursePicker = ({
    onSelectionSuccess,
    initialAssignedCourseIds = [],
    currentProfessorAliases = []
}: ProfessorCoursePickerProps) => {
    const { user } = useAuth();
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [locallyAssignedCourseIds, setLocallyAssignedCourseIds] = useState<Set<number>>(() => new Set());

    const assignedCourseIds = useMemo(() => {
        const next = new Set(initialAssignedCourseIds);
        locallyAssignedCourseIds.forEach((id) => next.add(id));
        return next;
    }, [initialAssignedCourseIds, locallyAssignedCourseIds]);

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
        setLocallyAssignedCourseIds((prev) => {
            const next = new Set(prev);
            next.add(course.course_id);
            return next;
        });
        if (onSelectionSuccess) {
            onSelectionSuccess(course);
        }
    });

    const isCourseVacant = (course: DBModelCourse): boolean => {
        if (!course.instructors) return true;
        const text = course.instructors.trim().toLowerCase();
        return text === '' || text === 'por asignar';
    };

    const normalizedAliases = currentProfessorAliases
        .map((alias) => alias.trim().toLowerCase())
        .filter((alias) => alias.length > 0);

    const isOwnedByCurrentProfessor = (course: DBModelCourse): boolean => {
        const instructors = course.instructors?.trim();
        if (!instructors) return false;

        const aliasPool = new Set<string>(normalizedAliases);
        const username = user?.username?.trim().toLowerCase();
        if (username) {
            aliasPool.add(username);
        }

        const instructorTokens = instructors
            .split(',')
            .map((token) => token.trim().toLowerCase())
            .filter((token) => token.length > 0);

        return instructorTokens.some((token) => aliasPool.has(token));
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
                    const isAssigned = assignedCourseIds.has(course.course_id) || isOwnedByCurrentProfessor(course);
                    const isUnavailable = !vacant && !isAssigned;

                    const buttonLabel = isProcessing
                        ? 'Asignando...'
                        : isAssigned
                            ? 'Curso asignado'
                            : isUnavailable
                                ? 'Curso no disponible'
                                : 'Impartir Curso';

                    return (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full min-w-0">
                            {vacant ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide">
                                    🪹 Vacante
                                </span>
                            ) : (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-100 truncate max-w-full">
                                    👤 {course.instructors}
                                </span>
                            )}

                            <GenericButton
                                type="button"
                                disabled={isProcessing || isUnavailable || isAssigned}
                                onClick={() => handleSelectCourse(course.course_id)}
                                // Usamos estrictamente variantes reales de tu GenericButton
                                variant={isAssigned ? 'success' : 'primary'}
                                label={buttonLabel}
                                icon={isProcessing ? <Loader2 size={12} className="animate-spin" /> : <BookOpen size={12} />}
                                className="text-[10px]! py-1.5! px-3!"
                            />
                        </div>
                    );
                }}
            />
        </div>
    );
};
