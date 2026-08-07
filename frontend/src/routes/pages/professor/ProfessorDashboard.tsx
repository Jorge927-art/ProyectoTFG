import { useState, useCallback, useEffect, useRef } from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import { useAuth } from '../../../auth/useAuth';
import ProfessorLayout from '../../layouts/DashboardLayout';
import TaughtCoursesGrid from './components/TaughtCoursesGrid';

// Importación del componente core unificado según [ADR-13]
import GenericHeader from '../../../components/ui/genericHeader/GenericHeader';

// 1. Importación del nuevo buscador común adaptado al docente
import { ProfessorCoursePicker } from './components/ProfessorCoursePicker';

// Centro de Calificación: recepción de trabajos/exámenes y envío de notas
import { GradingCenter } from './components/GradingCenter';
import { TeachingMetricsPanel } from './components/TeachingMetricsPanel';
import { ProfessorDocumentManager } from './components/ProfessorDocumentManager';

// IMPORTACIÓN CENTRALIZADA DE DOMINIOS [DRY]
import type { TaughtCourse } from '../../../services/userDomains';
import type { DBModelCourse } from '../../../services/courseTypes';
import type { StudentPerformanceDTO } from '../../../services/evaluationService';
import { useLocation } from 'react-router-dom';

// 2. Importamos el servicio para contar los alumnos de raíz
import { getActiveStudentsByCourse, getProfessorAssignedCourses } from '../../../services/evaluationService';

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
    const location = useLocation();
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

    // Estado compartido entre Centro de Calificación y Métricas de Docencia.
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
    // 1. ESTADO DE ASIGNATURAS IMPARTIDAS POR EL PROFESOR
    const [myCourses, setMyCourses] = useState<TaughtCourse[]>([]);
    const focusParams = new URLSearchParams(location.search);
    const shouldFocusDocuments = focusParams.get('focus') === 'documents';
    const focusStudentIdParam = Number(focusParams.get('senderId'));
    const focusStudentUserId = Number.isFinite(focusStudentIdParam) && focusStudentIdParam > 0
        ? focusStudentIdParam
        : null;
    const focusDocumentIdParam = Number(focusParams.get('documentId'));
    const focusDocumentId = Number.isFinite(focusDocumentIdParam) && focusDocumentIdParam > 0
        ? focusDocumentIdParam
        : null;
    const effectiveSelectedCourseId = selectedCourseId
        ?? (shouldFocusDocuments && myCourses.length > 0 ? myCourses[0].id : null);

    const professorDocumentsRef = useRef<HTMLDivElement | null>(null);
    const senderCourseResolutionDoneRef = useRef(false);
    const studentsByCourseCacheRef = useRef<Map<number, StudentPerformanceDTO[]>>(new Map());
    const studentsByCoursePendingRef = useRef<Map<number, Promise<StudentPerformanceDTO[]>>>(new Map());

    const getStudentsForCourse = useCallback(async (courseId: number): Promise<StudentPerformanceDTO[]> => {
        const cached = studentsByCourseCacheRef.current.get(courseId);
        if (cached) {
            return cached;
        }

        const pending = studentsByCoursePendingRef.current.get(courseId);
        if (pending) {
            return pending;
        }

        const request = getActiveStudentsByCourse(courseId)
            .then((studentsData) => {
                studentsByCourseCacheRef.current.set(courseId, studentsData);
                return studentsData;
            })
            .finally(() => {
                studentsByCoursePendingRef.current.delete(courseId);
            });

        studentsByCoursePendingRef.current.set(courseId, request);
        return request;
    }, []);

    useEffect(() => {
        let cancelled = false;

        const hydrateAssignedCourses = async () => {
            try {
                const assignedCourses = await getProfessorAssignedCourses();

                const baseCourses = assignedCourses.map((course) => ({
                    id: course.course_id,
                    title: course.title,
                    category: normalizeCategory(course),
                    studentsCount: 0,
                    averageProgress: 0
                } as TaughtCourse));

                if (cancelled) return;
                setMyCourses(baseCourses);

                const coursesWithCounts = await Promise.all(
                    assignedCourses.map(async (course) => {
                        let studentsCount = 0;

                        try {
                            const studentsData = await getStudentsForCourse(course.course_id);
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
    }, [getStudentsForCourse]);

    useEffect(() => {
        if (!shouldFocusDocuments) {
            return;
        }

        professorDocumentsRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, [shouldFocusDocuments]);

    useEffect(() => {
        senderCourseResolutionDoneRef.current = false;
    }, [shouldFocusDocuments, focusStudentUserId]);

    useEffect(() => {
        if (!shouldFocusDocuments || !focusStudentUserId || myCourses.length === 0 || senderCourseResolutionDoneRef.current) {
            return;
        }

        let cancelled = false;

        const resolveCourseBySender = async () => {
            const prioritizedCourses = selectedCourseId
                ? [
                    ...myCourses.filter((course) => course.id === selectedCourseId),
                    ...myCourses.filter((course) => course.id !== selectedCourseId)
                ]
                : myCourses;

            const cachedMatch = prioritizedCourses.find((course) => {
                const students = studentsByCourseCacheRef.current.get(course.id);
                return Array.isArray(students) && students.some((student) => student.userId === focusStudentUserId);
            });

            if (cachedMatch) {
                if (selectedCourseId !== cachedMatch.id) {
                    setSelectedCourseId(cachedMatch.id);
                }
                senderCourseResolutionDoneRef.current = true;
                return;
            }

            const uncachedCourses = prioritizedCourses.filter((course) => !studentsByCourseCacheRef.current.has(course.id));

            if (uncachedCourses.length > 0) {
                const results = await Promise.allSettled(
                    uncachedCourses.map((course) => getStudentsForCourse(course.id))
                );

                if (cancelled) return;

                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        const failedCourse = uncachedCourses[index];
                        console.error(
                            `Error resolviendo asignatura para senderId ${focusStudentUserId} en curso ${failedCourse.id}:`,
                            result.reason
                        );
                    }
                });
            }

            const resolvedMatch = prioritizedCourses.find((course) => {
                const students = studentsByCourseCacheRef.current.get(course.id);
                return Array.isArray(students) && students.some((student) => student.userId === focusStudentUserId);
            });

            if (resolvedMatch && selectedCourseId !== resolvedMatch.id) {
                setSelectedCourseId(resolvedMatch.id);
            }

            senderCourseResolutionDoneRef.current = true;
        };

        void resolveCourseBySender();

        return () => {
            cancelled = true;
        };
    }, [focusStudentUserId, getStudentsForCourse, myCourses, selectedCourseId, shouldFocusDocuments]);

    /**
     * Maneja la selección de un nuevo curso desde el buscador y lo agrega a la lista de cursos impartidos.
     * @param newCourse Curso seleccionado del buscador
     * @returns Promise<void>
     */
    const handleCourseSelectionSuccess = useCallback(async (newCourse: DBModelCourse) => {
        let studentsCount = 0;

        try {
            const studentsData = await getStudentsForCourse(newCourse.course_id);
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
    }, [getStudentsForCourse]);

    return (
        <ProfessorLayout>
            <div className="mx-auto max-w-420 px-4 py-6 md:px-6 xl:px-8 2xl:px-10 space-y-8 xl:space-y-9">
                <GenericHeader
                    title="Panel de Control Docente"
                    titleSize="text-xl font-bold"
                    titleColor="text-slate-800"
                    textPadding="p-0"
                    containerClass="border-b border-slate-100 pb-4 mb-0"
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
                <div className="w-full block overflow-x-hidden">
                    <ProfessorCoursePicker
                        onSelectionSuccess={handleCourseSelectionSuccess}
                        initialAssignedCourseIds={myCourses.map((course) => course.id)}
                        currentProfessorAliases={professorAliases}
                    />
                </div>

                <div className="space-y-8 xl:space-y-9">
                    <section className="bg-white border border-slate-100 rounded-2xl p-4 xl:p-5 2xl:p-6 shadow-sm">
                        <div className="grid grid-cols-1 xl:grid-cols-[minmax(250px,0.78fr)_minmax(520px,1.42fr)] gap-4 xl:gap-5 items-stretch">
                            <div className="bg-slate-50/40 border border-slate-100 rounded-2xl p-5 min-h-104 xl:min-h-120">
                                <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <BookOpen size={18} className="text-blue-600" />
                                    <span>Tus asignaturas asignadas</span>
                                    <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
                                        {myCourses.length}
                                    </span>
                                </h2>

                                <TaughtCoursesGrid
                                    courses={myCourses}
                                />
                            </div>

                            <div className="min-h-104 xl:min-h-120">
                                <TeachingMetricsPanel
                                    selectedCourseId={effectiveSelectedCourseId}
                                    onCourseChange={setSelectedCourseId}
                                    availableCourses={myCourses}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="bg-white border border-slate-100 rounded-2xl p-4 xl:p-5 2xl:p-6 shadow-sm">
                        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)] gap-4 xl:gap-5 items-stretch xl:h-152">
                            <div className="min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                                <section id="grading-center">
                                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <GraduationCap size={20} className="text-blue-600" />
                                        <span>Centro de Calificación</span>
                                    </h2>

                                    <GradingCenter
                                        courseId={effectiveSelectedCourseId}
                                        availableCourses={myCourses}
                                        onCourseChange={setSelectedCourseId}
                                        autoFocusDocuments={shouldFocusDocuments}
                                        focusStudentUserId={focusStudentUserId}
                                        focusDocumentId={focusDocumentId}
                                    />
                                </section>
                            </div>

                            <div className="min-h-0" ref={professorDocumentsRef} id="professor-documents-panel">
                                <ProfessorDocumentManager
                                    availableCourses={myCourses}
                                    autoFocusDocuments={shouldFocusDocuments}
                                    focusDocumentId={focusDocumentId}
                                    className="h-full"
                                />
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </ProfessorLayout>
    );
};

export default ProfessorDashboard;
