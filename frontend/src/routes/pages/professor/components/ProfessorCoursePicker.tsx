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
    const [configModalCourse, setConfigModalCourse] = useState<DBModelCourse | null>(null);
    const [selectedDispatchParts, setSelectedDispatchParts] = useState<number>(1);
    const [locallyAssignedCourseIds, setLocallyAssignedCourseIds] = useState<Set<number>>(() => new Set());

    const assignedCourseIds = useMemo(() => {
        const next = new Set(initialAssignedCourseIds);
        locallyAssignedCourseIds.forEach((id) => next.add(id));
        return next;
    }, [initialAssignedCourseIds, locallyAssignedCourseIds]);

    const applyAssignmentSuccess = (course: DBModelCourse) => {
        setSuccessMessage(`¡Te has asignado correctamente como profesor del curso: "${course.title}"!`);
        setLocallyAssignedCourseIds((prev) => {
            const next = new Set(prev);
            next.add(course.course_id);
            return next;
        });
        if (onSelectionSuccess) {
            onSelectionSuccess(course);
        }
    };

    const {
        searchKeyword,
        setSearchKeyword,
        catalogCourses,
        loadingCatalog,
        actionExecutionId,
        catalogError,
        executeCourseAction
    } = useCourseCatalog();

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

    const suggestPartsByDuration = (duration?: number): number => {
        if (!duration || duration <= 0) return 1;
        if (duration <= 10) return 1;
        if (duration <= 50) return 2;
        if (duration <= 150) return 4;
        if (duration <= 500) return 5;
        return 10;
    };

    const getMaxSelectableParts = (duration?: number): number => {
        if (duration && duration > 0 && duration < 10) {
            return 1;
        }
        return 10;
    };

    const computeIntermediateCheckpoints = (parts: number): number[] => {
        if (parts <= 1) {
            return [];
        }
        const step = 90 / parts;
        return Array.from({ length: parts - 1 }, (_, index) => Number((step * (index + 1)).toFixed(1)));
    };

    const handleOpenConfigModal = (course: DBModelCourse) => {
        setSuccessMessage('');
        const suggested = suggestPartsByDuration(course.duration);
        setSelectedDispatchParts(suggested);
        setConfigModalCourse(course);
    };

    const handleSaveCourseAssignment = async () => {
        if (!configModalCourse) {
            return;
        }

        const courseToAssign = configModalCourse;
        const wasSaved = await executeCourseAction(
            configModalCourse.course_id,
            `/api/courses/${configModalCourse.course_id}/assign-teacher-with-alert-config`,
            'post',
            { dispatchParts: selectedDispatchParts }
        );

        if (wasSaved) {
            applyAssignmentSuccess(courseToAssign);
            setConfigModalCourse(null);
        }
    };

    const currentModalCheckpoints = computeIntermediateCheckpoints(selectedDispatchParts);
    const maxSelectableParts = getMaxSelectableParts(configModalCourse?.duration);

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
                                onClick={() => handleOpenConfigModal(course)}
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

            {configModalCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="dispatch-config-title"
                        className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden"
                    >
                        <div className="px-5 py-4 border-b border-slate-100">
                            <h3 id="dispatch-config-title" className="text-base font-bold text-slate-900">
                                Configuración obligatoria de avisos para impartir curso
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Curso: {configModalCourse.title}. El alta docente no se consolidará hasta guardar esta configuración.
                            </p>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                <p className="text-xs font-semibold text-slate-700 mb-2">
                                    Número de partes para repartir el envío de material (1 a {maxSelectableParts})
                                </p>
                                <input
                                    type="number"
                                    min={1}
                                    max={maxSelectableParts}
                                    value={selectedDispatchParts}
                                    onChange={(event) => {
                                        const parsed = Number(event.target.value);
                                        if (!Number.isFinite(parsed)) return;
                                        const safeValue = Math.max(1, Math.min(maxSelectableParts, parsed));
                                        setSelectedDispatchParts(safeValue);
                                    }}
                                    className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                                />
                                {maxSelectableParts === 1 && (
                                    <p className="text-[11px] text-amber-700 font-semibold mt-2">
                                        Curso corto (&lt; 10 horas): solo se permite 1 parte. No habrá avisos intermedios.
                                    </p>
                                )}
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                                    <p className="text-xs font-bold text-slate-700">Tabla de avisos intermedios (umbral 90%)</p>
                                </div>
                                {currentModalCheckpoints.length === 0 ? (
                                    <div className="px-3 py-3 text-xs text-slate-500">
                                        Ningún aviso intermedio. Solo aviso inicial de matrícula y aviso de examen al 90%.
                                    </div>
                                ) : (
                                    <div className="max-h-52 overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="text-left text-slate-500 border-b border-slate-100">
                                                    <th className="px-3 py-2 font-semibold">Orden</th>
                                                    <th className="px-3 py-2 font-semibold">Checkpoint de aviso</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentModalCheckpoints.map((checkpoint, index) => (
                                                    <tr key={`${checkpoint}-${index}`} className="border-b border-slate-100 last:border-b-0">
                                                        <td className="px-3 py-2 font-semibold text-slate-700">{index + 1}</td>
                                                        <td className="px-3 py-2 text-slate-700">{checkpoint}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {catalogError && (
                            <div className="px-5 py-3 border-t border-slate-100 bg-red-50 text-xs font-semibold text-red-700">
                                ⚠️ {catalogError}
                            </div>
                        )}

                        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-2">
                            <GenericButton
                                type="button"
                                onClick={() => setConfigModalCourse(null)}
                                disabled={actionExecutionId === configModalCourse.course_id}
                                variant="text"
                                label="Cancelar"
                                className="text-xs! py-2! px-4!"
                            />
                            <GenericButton
                                type="button"
                                onClick={() => void handleSaveCourseAssignment()}
                                disabled={actionExecutionId === configModalCourse.course_id}
                                variant="primary"
                                label={actionExecutionId === configModalCourse.course_id ? 'Guardando...' : 'Guardar'}
                                icon={actionExecutionId === configModalCourse.course_id ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
                                className="text-xs! py-2! px-4!"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
