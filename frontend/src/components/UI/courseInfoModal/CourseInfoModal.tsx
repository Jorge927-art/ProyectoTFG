import { useState } from "react";
import AuthModal from "../authModal/AuthModal";

interface CourseCategory {
    /** Identificador único de la categoría. */
    id: number;
    /** Nombre de la especialidad o área de estudio. */
    name: string;
    /** Resumen del enfoque de la especialidad. */
    desc: string;
    /** Cantidad aproximada de cursos disponibles. */
    total: string;
}

/**
 * Datos estáticos de especialidades de cursos.
 * Se define como constante fuera del componente para evitar recrear el arreglo en cada render,
 * mejorando el rendimiento en renders sucesivos.
 */
const COURSE_CATEGORIES: CourseCategory[] = [
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
    /** Control de visibilidad del modal informativo de cursos. */
    isOpen: boolean;
    /** Callback ejecutado al cerrar el modal informativo. */
    onClose: () => void;
}

/**
 * Modal de catálogo de especialidades para descubrimiento de cursos.
 * Renderiza una tabla con 12 categorías y las opciones para navegar al registro.
 * Mantiene independientemente abierto el modal de autenticación para permitir
 * que el usuario continúe el flujo de registro tras cerrar este modal informativo.
 *
 * FLUJO DE COMPONENTES:
 * 1. CourseInfoModal abre con botón "¿Qué deseas aprender?" en Navbar.
 * 2. Usuario clickea "Registrarme y recibir recomendaciones".
 * 3. Se cierra este modal PERO se abre el AuthModal para continuar el registro.
 * 4. El usuario puede completar el registro sin perder contexto.
 */
const CourseInfoModal = ({ isOpen, onClose }: CourseInfoModalProps) => {
    // Estado independiente para controlar si el modal de autenticación está abierto.
    // Se usa aquí porque el flujo de registro debe continuar incluso cuando
    // el usuario cierra el modal informativo de cursos.
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    // Estado para indicar si el AuthModal debe mostrar el formulario de Login o Registro.
    // - false = mostrar formulario de REGISTRO (crear cuenta nueva)
    // - true = mostrar formulario de LOGIN (acceder con cuenta existente)
    // 
    // Se inicializa en false porque los usuarios que llegan aquí vienen del descubrimiento
    // de cursos y típicamente quieren crear una cuenta nueva, no iniciar sesión.
    // (Si el usuario ya tiene cuenta, puede hacer clic en "Tengo cuenta" para cambiar a login)
    const [isLoginView, setIsLoginView] = useState(false);

    // LÓGICA DE RENDERIZADO:
    // Esta condición es MÁS COMPLEJA de lo que parece. Devolvemos null en dos casos:
    // - Si isOpen es false Y isAuthModalOpen es false: No renderizar nada (ambos modales cerrados).
    // - Si isOpen es true O isAuthModalOpen es true: Seguir renderizando (al menos uno está abierto).
    //
    // Esto permite que:
    // 1. El usuario cierre este modal (isOpen = false)
    // 2. El AuthModal se abra (isAuthModalOpen = true)
    // 3. Este componente SIG UERÁ RENDERIZADO porque al menos isAuthModalOpen es true
    // 4. El usuario complete el registro sin perder el árbol de React
    if (!isOpen && !isAuthModalOpen) return null;

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">

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

                        <div className="p-8 bg-blue-600 text-white text-center space-y-5">
                            <div className="space-y-1">
                                <p className="text-lg font-semibold">¿No tienes claro por dónde empezar?</p>
                                <p className="text-blue-100 text-sm opacity-90">
                                    Regístrate ahora y accede al cuestionario para obtener recomendaciones personalizadas.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    // PASO 1: Cerrar el modal informativo de cursos.
                                    // El usuario ha visto el catálogo y está listo para avanzar al siguiente paso.
                                    onClose();

                                    // PASO 2: Establecer isLoginView en false para mostrar el formulario de REGISTRO.
                                    // (false = registro, true = login). El usuario viene del descubrimiento de cursos,
                                    // así que lógicamente quiere crear una cuenta nueva, no iniciar sesión.
                                    setIsLoginView(false);

                                    // PASO 3: Abrir el modal de autenticación.
                                    // Este cambio de estado dispara un re-render del componente.
                                    // IMPORTANTE: Aunque isOpen sigue siendo false, la condición de renderizado
                                    // (!isOpen && !isAuthModalOpen) AHORA es false (porque isAuthModalOpen = true),
                                    // entonces el componente continúa renderizado y muestra el AuthModal.
                                    setIsAuthModalOpen(true);

                                    // FLUJO VISUAL RESULTANTE:
                                    // 1. El usuario ve el catálogo dentro de CourseInfoModal
                                    // 2. Clickea el botón
                                    // 3. El modal informativo se "oculta" (isOpen = false) pero el componente sigue vivo
                                    // 4. El AuthModal aparece encima, permitiendo el registro
                                    // 5. Tras registrarse, el usuario puede volver a ver el catálogo si lo desea
                                    //
                                    // NOTA: El orden de estos 3 pasos es CRÍTICO. Si ejecutáramos
                                    // setIsAuthModalOpen(true) primero, React intentaría renderizar ambos
                                    // modales simultáneamente, causando conflictos visuales.
                                }}
                                className="px-8 py-3 bg-white text-blue-600 font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-all active:scale-95"
                            >
                                Registrarme y recibir recomendaciones
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 
                Modal de autenticación independiente controlado desde este componente.
                
                ¿POR QUÉ ESTÁ AQUÍ?
                Este modal es "hijo" de CourseInfoModal porque representan un flujo conectado:
                - Usuario explora cursos (CourseInfoModal abierto)
                - Usuario clickea "Registrarme y recibir recomendaciones"
                - Se abre el AuthModal para continuar el registro SIN cerrar este componente
                
                ¿CÓMO FUNCIONA?
                1. CourseInfoModal gestiona dos estados de apertura: isOpen (para sí mismo) e isAuthModalOpen (para el hijo)
                2. Cuando isOpen = false pero isAuthModalOpen = true, la condición de renderizado al inicio
                   (!isOpen && !isAuthModalOpen) devuelve false, así que SIGUE RENDERIZANDO
                3. El AuthModal se muestra en el JSX porque isAuthModalOpen = true
                4. De esta forma, el componente CourseInfoModal es "contenedor" del flujo de registro completo
                
                ¿QUÉ PASA CON LA ESTRUCTURA DEL DOM?
                - El <> (Fragment) al inicio mantiene ambos modales en el árbol de React
                - El primer hijo (div con isOpen &&) solo renderiza el modal informativo si isOpen = true
                - El segundo hijo (AuthModal) solo renderiza si se cumple su condición isOpen={isAuthModalOpen}
                - React no reconstruye ni destruye el AuthModal cuando CourseInfoModal se cierra/abre,
                  solo cambia su prop "isOpen", lo que es mucho más eficiente
            */}
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
