import { useState } from 'react';
import { Sparkles, SlidersHorizontal, AlertCircle, CheckCircle2 } from 'lucide-react';

// Importación del Layout unificado según [ADR-10]
import DashboardLayout from '../../layouts/DashboardLayout';

// Componentes atómicos del dominio de estudiante [ADR-20]
import { InterestsModal } from './InterestsModal';
import { CourseCatalog } from './components/CourseCatalog';
import { EnrolledCourses } from './components/EnrolledCourses';
import { SmartRecommendations } from './components/SmartRecommendations';

// Hooks de lógica distribuida para evitar el "God Component" [ADR-20]
import { useEnrolledCourses } from './components/useEnrolledCourses';
import type { DBModelCourse } from '../../../services/courseTypes';
import type { RecommendedCourse } from '../../../services/userDomains';


const StudentDashboard = () => {
    // --- ESTADOS DE UI Y FEEDBACK ---
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    /** 
     * HOOK DE ASIGNATURAS MATRICULADAS:
     * Gestiona de forma autónoma la carga desde el backend.
     * El 'successMessage' actúa como trigger para refrescar la lista tras matricularse [6, 7].
     */
    const { enrolledList, loadingEnrollments, enrollmentError } = useEnrolledCourses(successMessage);

    /** 
     * MOCK DE RECOMENDACIONES:
     * En la fase final del TFG, este estado se alimentará del RecommendationService
     * basado en Filtrado por Contenido [ADR-30].
     */
    const [recommendations] = useState<RecommendedCourse[]>([
        {
            id: 101,
            title: "Machine Learning Avanzado",
            instructor: "Dr. Aranda",
            category: "Ciencia de Datos",
            rating: 4.9,
            reason: "Basado en tu interés por Python"
        }
    ]);

    /**
     * MANEJADOR DE ÉXITO EN MATRÍCULA:
     * Centraliza el feedback visual para el estudiante tras una acción exitosa.
     */
    const handleEnrollSuccess = (course: DBModelCourse) => {
        setSuccessMessage(`¡Éxito! Te has matriculado en: ${course.title}`);
        setError('');
        // Limpieza automática del banner de éxito tras 5 segundos
        setTimeout(() => setSuccessMessage(''), 5000);
    };

    /**
     * MANEJADOR DE GUARDADO DE INTERESES:
     * Satisface el contrato estricto exigido por InterestsModalProps.
     */
    const handleSaveInterests = (preferences: {
        categories: string[];
        levels: string[];
        durations: string[];
        languages: string[];
        subtitles: string[];
    }) => {
        // En fases posteriores se sincronizará con la persistencia en PostgreSQL
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
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Panel del Estudiante</h1>
                        <p className="text-gray-500 mt-1">Gestiona tus matrículas, explora el catálogo y descubre recomendaciones.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm self-start md:self-auto"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        <span>Configurar Intereses</span>
                    </button>
                </div>

                {/* Mensajes de Estado Operacionales (Evaluación directa y declarativa solicitada) */}
                {(error || enrollmentError) && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-md flex items-start gap-3" role="alert">
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm font-medium text-red-700">
                            {error || enrollmentError}
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
                    <SmartRecommendations recommendations={recommendations} />
                </div>

                {/* Grid de Cursos Matriculados y Catálogo */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Sección: Mis Cursos */}
                    <div className="bg-white border rounded-2xl p-6 shadow-sm">
                        <EnrolledCourses
                            enrolledList={enrolledList}
                            loadingEnrollments={loadingEnrollments}
                        />
                    </div>

                    {/* Sección: Catálogo de Cursos Disponibles */}
                    <div className="lg:col-span-2 bg-white border rounded-2xl p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Catálogo de Cursos Disponibles</h2>
                        <CourseCatalog
                            enrolledList={enrolledList}
                            onEnrollSuccess={handleEnrollSuccess}
                            onSetGlobalError={setError}
                            onSetGlobalSuccess={setSuccessMessage}
                        />
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
