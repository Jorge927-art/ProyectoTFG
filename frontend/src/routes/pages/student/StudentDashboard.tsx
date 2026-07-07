import { useState } from 'react';
import { Sparkles, SlidersHorizontal, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

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

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Cabecera Principal */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-5">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Intereses del Estudiante</h1>
                        <p className="text-gray-500 mt-1">Configura tus intereses académicos para recibir sugerencias exclusivas y optimizar tu catálogo</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm self-start md:self-auto"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        <span>Configurar Intereses</span>
                    </button>
                </div>

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
                   GRID SINCRONIZADO ORIGINAL RESTAURADO AL 100% [ADR-19]:
                   - Recuperamos tus bordes exteriores exactos y tu alineación superior perfecta.
                */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    {/* COLUMNA 1 (IZQUIERDA): Tu contenedor máster intacto que funciona a la perfección */}
                    <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-6">
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
                    </div>

                    {/* COLUMNA 2 Y 3 (DERECHA): Catálogo arriba y Evaluación abajo */}
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

                        {/* Tarjeta de la Evaluación Académica Dual */}
                        <div className="bg-white border rounded-2xl p-6 shadow-sm">
                            <EvaluationPanel />
                        </div>
                    </div>

                </div> {/* Cierre correcto del div grid principal */}

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
