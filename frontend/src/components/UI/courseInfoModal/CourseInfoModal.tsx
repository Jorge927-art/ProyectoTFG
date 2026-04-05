import { useState } from "react";
import AuthModal from "../authModal/AuthModal";

// Datos estáticos (se mantienen igual)
const COURSE_CATEGORIES = [
    { id: 1, name: 'Tecnología y Software', desc: 'Desarrollo web, IA, Cloud Computing y Ciberseguridad.', total: '2.400+ cursos' },
    { id: 2, name: 'Negocios y Management', desc: 'Liderazgo, Finanzas, Marketing Digital y Ágil.', total: '1.800+ cursos' },
    { id: 3, name: 'Diseño y Creatividad', desc: 'UX/UI, Diseño Gráfico, Animación y Fotografía.', total: '1.100+ cursos' },
    { id: 4, name: 'Ciencias de Datos', desc: 'Big Data, Análisis Estadístico y Machine Learning.', total: '950+ cursos' },
    { id: 5, name: 'Salud y Bienestar', desc: 'Nutrición, Fitness, Mindfulness y Psicología.', total: '700+ cursos' },
    { id: 6, name: 'Idiomas', desc: 'Inglés, Español, Chino, Francés y más.', total: '1.200+ cursos' },
    { id: 7, name: 'Desarrollo Personal', desc: 'Habilidades blandas, Productividad y Coaching.', total: '850+ cursos' },
    { id: 8, name: 'Ciencias Sociales', desc: 'Sociología, Psicología Social y Política.', total: '500+ cursos' },
    { id: 9, name: 'Matemáticas y Lógica', desc: 'Álgebra, Cálculo, Lógica y Razonamiento.', total: '400+ cursos' },
    { id: 10, name: 'Artes y Humanidades', desc: 'Historia, Filosofía, Literatura y Música.', total: '600+ cursos' },
    { id: 11, name: 'Ciencias Físicas e Ingeniería', desc: 'Física, Química, Ingeniería Civil y Eléctrica.', total: '550+ cursos' },
    { id: 12, name: 'Emprendimiento e Innovación', desc: 'Startups, Innovación Disruptiva y Lean Startup.', total: '300+ cursos' },
];

interface CourseInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CourseInfoModal = ({ isOpen, onClose }: CourseInfoModalProps) => {
    // Estados para controlar el Modal de Autenticación desde aquí
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isLoginView, setIsLoginView] = useState(false);

    if (!isOpen && !isAuthModalOpen) return null;

    return (
        <>
            {/* Modal de Información de Cursos */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">

                        {/* Cabecera */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Catálogo de Especialidades</h2>
                                <p className="text-slate-500 text-sm">Contamos con más de 10,000 cursos activos.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                aria-label="Cerrar modal"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Cuerpo Informativo */}
                        <div className="flex-1 overflow-y-auto p-6 bg-white">
                            <div className="space-y-1">
                                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-slate-400 uppercase">
                                    <div className="col-span-4">Área de estudio</div>
                                    <div className="col-span-6">Enfoque principal</div>
                                    <div className="col-span-2 text-right">Oferta</div>
                                </div>
                                {COURSE_CATEGORIES.map((category) => (
                                    <div key={category.id} className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-slate-50 items-center text-sm">
                                        <div className="col-span-4 font-semibold text-slate-700">{category.name}</div>
                                        <div className="col-span-6 text-slate-500 leading-snug">{category.desc}</div>
                                        <div className="col-span-2 text-right text-slate-400 font-medium italic">{category.total}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pie: Acción de Registro */}
                        <div className="p-8 bg-blue-600 text-white text-center space-y-5">
                            <div className="space-y-1">
                                <p className="text-lg font-semibold">¿No tienes claro por dónde empezar?</p>
                                <p className="text-blue-100 text-sm opacity-90">
                                    Regístrate ahora y accede al cuestionario para obtener recomendaciones personalizadas.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsLoginView(false); // Asegurar que abra en "Registro"
                                    setIsAuthModalOpen(true); // Abrir AuthModal
                                    onClose(); // Cerrar este modal informativo
                                }}
                                className="px-8 py-3 bg-white text-blue-600 font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-all active:scale-95"
                            >
                                Registrarme y recibir recomendaciones
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Renderizado del AuthModal */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                isLoginView={isLoginView}
                setIsLoginView={setIsLoginView}
            />
        </>
    );
};

export default CourseInfoModal;
