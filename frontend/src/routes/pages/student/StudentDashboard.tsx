import { useState, useEffect } from 'react';
import { Sparkles, SlidersHorizontal, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import GenericButton from '../../../components/ui/genericButton/GenericButton';

// Importación del componente core unificado según [ADR-13]
import GenericHeader from '../../../components/ui/genericHeader/GenericHeader';

// Importación del Layout unificado según [ADR-10]
import DashboardLayout from '../../layouts/DashboardLayout';

// Componentes atómicos del dominio de estudiante [ADR-20]
import { InterestsModal } from './InterestsModal';
import { CourseCatalog } from './components/CourseCatalog';
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


const StudentDashboard = () => {
    // --- ESTADOS DE UI Y FEEDBACK ---
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

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
    const activeCourseId = enrolledList && enrolledList.length > 0 ? enrolledList[0].course?.course_id : null;

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">

                {/* 
                   CABECERA PRINCIPAL UNIFICADA [ADR-13]:
                   Sustitución del div cableado por el componente core GenericHeader utilizando
                   composición limpia mediante la prop 'description' para inyectar la acción.
                */}
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

                {/* Sección de Recomendaciones Inteligentes */}
                <div className="bg-linear-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="h-5 w-5 text-amber-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Recomendaciones para ti</h2>
                    </div>

                    {loadingRecommendations ? (
                        <div className="p-4 flex justify-center items-center">
                            <Loader2 size={20} className="animate-spin text-amber-600" />
                        </div>
                    ) : (
                        <SmartRecommendations recommendations={recommendations} />
                    )}
                </div>

                {/* 
   GRID SINCRONIZADO MODIFICADO:
   - Se cambia 'items-start' por 'items-stretch' para igualar alturas de columnas
          */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">

                    {/* COLUMNA 1 (IZQUIERDA): Se añade 'flex flex-col' para poder controlar el estiramiento interno */}
                    <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-6 h-full flex flex-col">
                        <EnrolledCourses
                            enrolledList={enrolledList}
                            loadingEnrollments={loadingEnrollments}
                            onRefresh={() => {
                                fetchStudentEnrollments();
                                setSuccessMessage("¡Curso iniciado con éxito! Sincronizando cronómetro...");
                                setTimeout(() => setSuccessMessage(''), 5000);
                            }}
                        />
                        <DocumentManager />

                        {/* Tarjeta de la Evaluación Académica Dual: Se añade 'flex-1 flex flex-col' para que se estire al máximo */}
                        <div className="pt-4 flex-1 flex flex-col">
                            <EvaluationPanel />
                        </div>
                    </div>

                    {/* COLUMNA 2 Y 3 (DERECHA): Distribución estratégica de componentes */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Tarjeta del Catálogo de Cursos Disponibles */}
                        <div className="bg-white border rounded-2xl p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Catálogo de Cursos Disponibles</h2>
                            <CourseCatalog
                                enrolledList={enrolledList}
                                onEnrollSuccess={handleEnrollSuccess}
                                onSetGlobalError={setError}
                                onSetGlobalSuccess={setSuccessMessage}
                            />
                        </div>

                        {/* Tarjeta del Panel de Seguimiento de Asignatura [ADR-47] */}
                        <div className="bg-white border rounded-2xl p-6 shadow-sm">
                            <CourseAssignmentPanel
                                activeCourseId={activeCourseId}
                                enrolledList={enrolledList}
                            />
                        </div>

                        {/* PANEL ANALÍTICO ESTADÍSTICO REACTIVO COMPENSADO [ADR-41] */}
                        <div className="bg-white border rounded-2xl p-6 shadow-sm">
                            <StudentStatsPanel activeCourseId={activeCourseId} enrolledList={enrolledList} />
                        </div>
                    </div>
                </div>

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
