import { useState } from 'react';
import { Sparkles, SlidersHorizontal } from 'lucide-react';
import StudentLayout from '../../layouts/DashboardLayout';
import { InterestsModal } from './InterestsModal';

import { CourseCatalog } from './components/CourseCatalog';
import { EnrolledCourses } from './components/EnrolledCourses';
import { SmartRecommendations } from './components/SmartRecommendations';
import { useEnrolledCourses } from './components/useEnrolledCourses';
import type { DBModelCourse } from './components/useCourseCatalog';

// Auditoría NotebookLM: Añadido 'export' para que sea la única fuente de verdad compartida.
export interface RecommendedCourse {
    id: number;
    title: string;
    instructor: string;
    category: string;
    rating: number;
    reason: string;
}

const StudentDashboard = () => {
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    const {
        enrolledList,
        loadingEnrollments,
        enrollmentError,
        injectLocalEnrollment
    } = useEnrolledCourses(successMessage);

    if (enrollmentError && !error) {
        setError(enrollmentError);
    }

    const [recommendations] = useState<RecommendedCourse[]>([
        { id: 101, title: "Microservicios con Spring Cloud", instructor: "Carlos Garcia", category: "Arquitectura", rating: 4.9, reason: "Basado en tu avance en Spring Boot" },
        { id: 102, title: "Gestión de Estados Avanzada en React", instructor: "Elena Perez", category: "Frontend", rating: 4.8, reason: "Ideal para tus proyectos SPA" }
    ]);

    const handleEnrollSuccessFromCatalog = (course: DBModelCourse) => {
        injectLocalEnrollment(course);
        setSuccessMessage("¡Te has matriculado en el curso correctamente!");
    };

    return (
        <StudentLayout>
            <div className="p-6 max-w-7xl mx-auto min-h-screen bg-slate-50/50">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <span>Panel de Aprendizaje</span>
                            <Sparkles size={20} className="text-amber-500 fill-currentColor" />
                        </h1>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Sincronización académica transaccional en tiempo real</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-2 border border-slate-200 shadow-sm transition-all cursor-pointer"
                    >
                        <SlidersHorizontal size={14} className="text-slate-500" />
                        <span>Configurar Intereses</span>
                    </button>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                        <span>⚠️ {error}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                        <span>✓ {successMessage}</span>
                    </div>
                )}

                <CourseCatalog
                    enrolledList={enrolledList}
                    onEnrollSuccess={handleEnrollSuccessFromCatalog}
                    onSetGlobalError={setError}
                    onSetGlobalSuccess={setSuccessMessage}
                />

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                    <EnrolledCourses
                        enrolledList={enrolledList}
                        loadingEnrollments={loadingEnrollments}
                    />
                    <SmartRecommendations
                        recommendations={recommendations}
                    />
                </div>
            </div>

            <InterestsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={async () => {
                    setSuccessMessage("Preferencias guardadas con éxito en PostgreSQL.");
                }}
            />
        </StudentLayout>
    );
};

export default StudentDashboard;
