import { useState, useEffect, useRef } from 'react';
import { Sparkles, SlidersHorizontal, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import GenericButton from '../../../components/ui/genericButton/GenericButton';

// Importación del componente core unificado según [ADR-13]
import GenericHeader from '../../../components/ui/genericHeader/GenericHeader';

// Importación del Layout unificado según [ADR-10]
import DashboardLayout from '../../layouts/DashboardLayout';

// Componentes atómicos del dominio de estudiante [ADR-20]
import { InterestsModal } from './InterestsModal';
import { StudentCoursePicker } from './components/StudentCoursePicker';
import { EnrolledCourses } from './components/EnrolledCourses';
import { SmartRecommendations } from './components/SmartRecommendations';

// Hooks de lógica distribuida para evitar el "God Component" [ADR-20]
import { useEnrolledCourses } from './components/useEnrolledCourses';
import { useSmartRecommendations } from './components/useSmartRecommendations';
import type { DBModelCourse } from '../../../services/courseTypes';
import { DocumentManager } from './components/DocumentManager';
import { EvaluationPanel } from './components/EvaluationPanel';
import { StudentStatsPanel } from './components/StudentStatsPanel';
import { useActiveEvaluations } from './components/useActiveEvaluations';
import { CourseAssignmentPanel } from './components/CourseAssignmentPanel';
import { useLocation } from 'react-router-dom';

const ENROLLMENTS_AUTO_REFRESH_MS = 45000;


const StudentDashboard = () => {
    const location = useLocation();
    // --- ESTADOS DE UI Y FEEDBACK ---
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const documentsPanelRef = useRef<HTMLDivElement | null>(null);
    const focusParams = new URLSearchParams(location.search);
    const shouldFocusDocuments = focusParams.get('focus') === 'documents';
    const focusDocumentIdParam = Number(focusParams.get('documentId'));
    const focusDocumentId = Number.isFinite(focusDocumentIdParam) && focusDocumentIdParam > 0
        ? focusDocumentIdParam
        : null;
    const focusCourseIdParam = Number(focusParams.get('courseId'));
    const focusCourseId = Number.isFinite(focusCourseIdParam) && focusCourseIdParam > 0
        ? focusCourseIdParam
        : null;

    /** 
     * HOOK DE ASIGNATURAS MATRICULADAS:
     * Gestiona de forma autónoma la carga desde el backend.
     */
    const { enrolledList, loadingEnrollments, enrollmentError, fetchStudentEnrollments } = useEnrolledCourses(successMessage);
    const { refreshPending } = useActiveEvaluations();
    useEffect(() => {
        if (refreshPending) {
            refreshPending();
        }
    }, [enrolledList?.length, refreshPending]);

    useEffect(() => {
        const handleWindowFocus = () => {
            fetchStudentEnrollments();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchStudentEnrollments();
            }
        };

        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchStudentEnrollments]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchStudentEnrollments();
            }
        }, ENROLLMENTS_AUTO_REFRESH_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [fetchStudentEnrollments]);

    useEffect(() => {
        if (!shouldFocusDocuments) {
            return;
        }

        documentsPanelRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, [shouldFocusDocuments]);

    /** 
     * HOOK DE RECOMENDACIONES ALGORÍTMICAS:
     * Consume dinámicamente el motor de filtrado basado en contenido de Spring Boot [ADR-30].
     */
    const { recommendations, loadingRecommendations, recommendationsError } = useSmartRecommendations(successMessage);

    /**
     * MANEJADOR DE ÉXITO EN MATRÍCULA:
     * Centraliza el feedback visual para el estudiante tras una acción exitosa.
     */
    const handleEnrollSuccess = (course: DBModelCourse) => {
        setSuccessMessage(`¡Éxito! Te has matriculado en: ${course.title}`);
        setError('');
        fetchStudentEnrollments(); // Refresca la lista de cursos matriculados tras la acción
        // Limpieza automática del banner de éxito tras 5 segundos
        setTimeout(() => setSuccessMessage(''), 5000);
    };

    /**
     * MANEJADOR DE GUARDADO DE INTERESES:
     */
    const handleSaveInterests = (preferences: {
        categories: string[];
        levels: string[];
        durations: string[];
        languages: string[];
        subtitles: string[];
    }) => {
        console.log("Preferencias del estudiante capturadas para el TFG:", preferences);
        setIsModalOpen(false);
        setSuccessMessage("¡Intereses guardados y actualizados correctamente!");
        setTimeout(() => setSuccessMessage(''), 5000);
    };

    // Evalúa dinámicamente el foco analítico dando prioridad a la selección del alumno [ADR-41]
    const activeCourseId = (() => {
        if (!enrolledList || enrolledList.length === 0) {
            return null;
        }

        if (shouldFocusDocuments && focusCourseId) {
            const focusedEnrollment = enrolledList.find((enrollment) => enrollment.course?.course_id === focusCourseId);
            if (focusedEnrollment?.course?.course_id) {
                return focusedEnrollment.course.course_id;
            }
        }

        return enrolledList[0].course?.course_id ?? null;
    })();

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-420 px-4 py-6 md:px-6 xl:px-8 2xl:px-10 space-y-6 xl:space-y-8">

                {/* CABECERA PRINCIPAL UNIFICADA REAL DE PRODUCCIÓN [ADR-13] */}
                <GenericHeader
                    title="Intereses del Estudiante"
                    titleSize="text-3xl font-bold tracking-tight"
                    titleColor="text-gray-900"
                    textPadding="p-0"
                    containerClass="border-b pb-5"
                    align="left"
                    description={
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full mt-1">
                            <p className="text-gray-500">
                                Configura tus intereses académicos para recibir sugerencias exclusivas y optimizar tu catálogo
                            </p>
                            <GenericButton
                                onClick={() => setIsModalOpen(true)}
                                variant="primary"
                                icon={<SlidersHorizontal className="h-4 w-4" />}
                                label="Configurar Intereses"
                                className="gap-2! px-4! py-2! text-sm! font-medium! rounded-lg! shadow-sm self-start md:self-auto shrink-0"
                            />
                        </div>
                    }
                />

                {/* Mensajes de Estado Operacionales */}
                {(error || enrollmentError || recommendationsError) && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-md flex items-start gap-3" role="alert">
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm font-medium text-red-700">
                            {error || enrollmentError || recommendationsError}
                        </p>
                    </div>
                )}

                {successMessage && (
                    <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-md flex items-start gap-3" role="alert">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        <p className="text-sm font-medium text-green-700">
                            {successMessage}
                        </p>
                    </div>
                )}

                {/* 
                    1. COMPONENTE SUPERIOR PANORÁMICO: 
                    "Recomendaciones para ti" ocupa todo el ancho por encima de los demás.
                */}
                <div className="bg-linear-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 xl:p-6 2xl:p-7 shadow-sm w-full">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Recomendaciones para ti</h2>
                    </div>
                    {loadingRecommendations ? (
                        <div className="p-4 flex justify-center items-center">
                            <Loader2 size={20} className="animate-spin text-blue-600" />
                        </div>
                    ) : (
                        <SmartRecommendations recommendations={recommendations} />
                    )}
                </div>

                {/* 
                    2. SECCIÓN UNIFICADA: "Tus asignaturas" + "Catálogo de Cursos Disponibles"
                    Mantiene el reparto horizontal 1/3 + 2/3 y unifica altura/tipografía.
                */}
                <section className="bg-white border border-slate-100 rounded-2xl p-4 xl:p-5 2xl:p-6 shadow-sm">
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(360px,1fr)_minmax(420px,1.25fr)] gap-4 xl:gap-5 2xl:gap-6 items-stretch">
                        <div className="xl:min-w-85 h-109 xl:h-112 2xl:h-120">
                            <EnrolledCourses
                                className="h-full"
                                enrolledList={enrolledList}
                                loadingEnrollments={loadingEnrollments}
                                onRefresh={() => {
                                    fetchStudentEnrollments();
                                    setSuccessMessage("¡Curso iniciado con éxito! Sincronizando cronómetro...");
                                    setTimeout(() => setSuccessMessage(''), 5000);
                                }}
                            />
                        </div>

                        <div className="h-109 xl:h-112 2xl:h-120 bg-slate-50/40 border border-slate-100 rounded-xl xl:rounded-2xl p-5 xl:p-6 overflow-y-auto">
                            <h2 className="text-base font-bold text-slate-800 mb-4">Catálogo de Cursos Disponibles</h2>
                            <StudentCoursePicker
                                enrolledList={enrolledList}
                                onEnrollSuccess={handleEnrollSuccess}
                                onSetGlobalError={setError}
                                onSetGlobalSuccess={setSuccessMessage}
                            />
                        </div>
                    </div>
                </section>

                {/* 
                    3. SECCIÓN UNIFICADA: "Gestión de Documentos Académicos" + "ASIGNATURAS"
                    Mantiene el reparto horizontal 1/3 + 2/3 y una lectura visual única.
                */}
                <section className="bg-white border border-slate-100 rounded-2xl p-4 xl:p-5 2xl:p-6 shadow-sm">
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(340px,1fr)_minmax(340px,1.1fr)] gap-4 xl:gap-5 2xl:gap-6 items-stretch">
                        <div
                            ref={documentsPanelRef}
                            id="documents-panel"
                            className="xl:min-w-85 h-109 xl:h-112 2xl:h-120"
                        >
                            <DocumentManager
                                autoFocusDocuments={shouldFocusDocuments}
                                focusDocumentId={focusDocumentId}
                            />
                        </div>

                        <div className="h-109 xl:h-112 2xl:h-120">
                            <CourseAssignmentPanel
                                activeCourseId={activeCourseId}
                                enrolledList={enrolledList}
                            />
                        </div>
                    </div>
                </section>

                {/* 
                    4. SECCIÓN UNIFICADA: "Rendimiento y Métricas del Curso" + "Evaluación académica"
                    Mantiene ambos paneles en un único bloque visual para cerrar el dashboard con simetría.
                */}
                <section className="bg-white border border-slate-100 rounded-2xl p-4 xl:p-5 2xl:p-6 shadow-sm">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-5 2xl:gap-6 items-stretch">
                        <div className="w-full xl:min-h-112 2xl:min-h-120">
                            <StudentStatsPanel activeCourseId={activeCourseId} enrolledList={enrolledList} />
                        </div>

                        <div className="w-full xl:min-h-112 2xl:min-h-120">
                            <EvaluationPanel hasEnrolledCourses={enrolledList.length > 0} />
                        </div>
                    </div>
                </section>

                {/* Modal de Configuración de Intereses */}
                <InterestsModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveInterests}
                />
            </div>
        </DashboardLayout>
    );
};

export default StudentDashboard;

