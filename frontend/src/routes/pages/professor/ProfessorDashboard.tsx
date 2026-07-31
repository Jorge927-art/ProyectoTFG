import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
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

// IMPORTACIÓN CENTRALIZADA DE DOMINIOS [DRY]
import type { TaughtCourse } from '../../../services/userDomains';
import type { DBModelCourse } from '../../../services/courseTypes';
import type { StudentPerformanceDTO } from '../../../services/evaluationService';

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
    const [metricsColumnMinHeight, setMetricsColumnMinHeight] = useState<number>(0);
    const focusSearch = typeof window !== 'undefined' ? window.location.search : '';
    const focusParams = new URLSearchParams(focusSearch);
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

    const leftColumnRef = useRef<HTMLDivElement | null>(null);
    const gradingCenterRef = useRef<HTMLElement | null>(null);
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

    useLayoutEffect(() => {
        const node = leftColumnRef.current;
        if (!node) return;

        const syncHeight = () => {
            const shouldSync = window.innerWidth >= 1024;
            setMetricsColumnMinHeight(shouldSync ? Math.ceil(node.getBoundingClientRect().height) : 0);
        };

        syncHeight();

        const resizeObserver = new ResizeObserver(() => {
            syncHeight();
        });
        resizeObserver.observe(node);

        window.addEventListener('resize', syncHeight);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', syncHeight);
        };
    }, [myCourses, selectedCourseId]);

    useEffect(() => {
        if (!shouldFocusDocuments) {
            return;
        }

        gradingCenterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

            {/* 2. REJILLA PRINCIPAL: columna izquierda apilada + panel de métricas a la derecha */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

                {/* COLUMNA IZQUIERDA: ASIGNATURAS + CENTRO DE CALIFICACIÓN APILADOS */}
                <div ref={leftColumnRef} className="lg:col-span-2 space-y-12">
                    <section>
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
                        />
                    </section>

                    <section ref={gradingCenterRef} id="grading-center">
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

                {/* COLUMNA DERECHA: RESUMEN DE MÉTRICAS */}
                <div
                    className="lg:col-span-1 lg:sticky lg:top-20 lg:self-stretch lg:flex h-full"
                    style={metricsColumnMinHeight > 0 ? { minHeight: `${metricsColumnMinHeight}px` } : undefined}
                >
                    <TeachingMetricsPanel
                        selectedCourseId={effectiveSelectedCourseId}
                        onCourseChange={setSelectedCourseId}
                        availableCourses={myCourses}
                    />
                </div>
            </div>

        </ProfessorLayout>
    );
};

export default ProfessorDashboard;
