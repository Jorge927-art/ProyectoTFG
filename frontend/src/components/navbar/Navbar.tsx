import { useRef, useState } from 'react';
import { Home, Search, LogIn } from 'lucide-react';
import GenericButton from '../ui/genericButton/GenericButton';
import AuthModal from '../ui/authModal/AuthModal';
import CourseInfoModal from '../ui/courseInfoModal/CourseInfoModal';

/**
 * Props del componente Navbar.
 * 
 * @interface NavbarProps
 */
interface NavbarProps {
    /**
     * Callback opcional ejecutado cuando el usuario completa un login exitoso.
     * 
     * Se dispara desde AuthModal (onSuccess) y propaga los datos del usuario al padre.
     * Típicamente el padre (MainNavbar) actualiza su estado de sesión global con esta información.
     * 
     * @param userData Objeto con datos del usuario autenticado
     * @param userData.username - Nombre de usuario
     * @param userData.photo - URL de la foto de perfil (opcional)
     * @returns void
     */
    onLoginSuccess?: (userData: { username: string; photo?: string }) => void;
}

/**
 * Barra de navegación principal (unauthenticated).
 * 
 * Renderiza la navbar fija superior con:
 * - Botón "Inicio" a la izquierda
 * - Título "GESTIÓN DE CURSOS ONLINE" en el centro
 * - Botones de búsqueda y autenticación a la derecha
 * 
 * GESTIÓN DE ESTADO:
 * Mantiene 3 estados locales independientes:
 * 1. isAuthModalOpen - Modal de login/registro
 * 2. isCourseInfoModalOpen - Modal de catálogo de cursos
 * 3. isLoginView - Bug 'Login' vs 'Registro' dentro de AuthModal
 * 
 * Estos estados son INDEPENDIENTES (no hay dependencias entre ellos) para evitar
 * renderizados en cascada y permitir que múltiples modales coexistan en el árbol de React.
 * 
 * FLUJOS:
 * 1. User_clicks "¿Qué deseas aprender?" → abre CourseInfoModal
 *    → User clickea "Registrarme" → cierra CourseInfoModal pero abre AuthModal
 * 2. User_clicks "Entrar / Registro" → abre AuthModal en modo Login (isLoginView=true)
 * 3. User completa login exitoso → AuthModal dispara onSuccess → padre actualiza estado global
 * 
 * LAYOUT:
 * - fixed top-0: navbar pegada al top (z-50 para estar encima)
 * - grid grid-cols-3: tres columnas iguales para distribuir contenido
 * - Columna 1: Botón "Inicio" (justify-start)
 * - Columna 2: Título centrado (justify-center)
 * - Columna 3: Botones secundarios (justify-end, gap-2)
 * 
 * PATRONES APLICADOS:
 * - Splitting de modales: cada modal es independiente, no depende de otro.
 * - Callback lifting: onLoginSuccess se propaga desde AuthModal hasta el padre (MainNavbar).
 * - Composición: reutiliza GenericButton para botones principales.
 * 
 * @component
 * @example
 * // Uso en MainNavbar con handler de login
 * <Navbar
 *   onLoginSuccess={(userData) => {
 *      setUser(userData);
 *      localStorage.setItem('user', JSON.stringify(userData));
 *   }}
 * />
 * 
 * @param {NavbarProps} props - Props del componente
 * @returns {JSX.Element} Fragment con navbar y modalidades (AuthModal, CourseInfoModal)
 */
const Navbar = ({ onLoginSuccess }: NavbarProps) => {
    const preventReopenUntilRef = useRef(0);
    /**
     * Control de visibilidad del modal de autenticación (login/registro).
     * Independiente de isCourseInfoModalOpen para permitir flujo de:
     * CourseInfoModal → AuthModal (cuando user clickea "Registrarme")
     */
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    /**
     * Control de visibilidad del modal de catálogo de cursos (especialidades).
     * Independiente de isAuthModalOpen para que cada modal sea autocontrolado.
     */
    const [isCourseInfoModalOpen, setIsCourseInfoModalOpen] = useState(false);

    /**
     * Determina qué formulario mostrar dentro de AuthModal.
     * - true: mostrar formulario de Login (para users con cuenta existente)
     * - false: mostrar formulario de Registro (para nuevos users)
     * 
     * Se inicializa en true porque el flujo principal es "Entrar / Registro" (botón del navbar).
     * Cuando se abre desde CourseInfoModal, el padre lo cambia a false.
     */
    const [isLoginView, setIsLoginView] = useState(true);

    return (
        <>
            {/* 
                Navbar fija principal.
                - fixed top-0: pegada al top de la ventana
                - z-50: por encima del contenido principal
                - bg-white/80 backdrop-blur-md: fondo blanco transparente con blur (efecto moderno)
                - border-b border-gray-100: línea separadora sutil
            */}
            <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3 z-50">
                {/* 
                    Contenedor principal con layout grid de 3 columnas.
                    - grid grid-cols-3: tres columnas iguales
                    - items-center: alinea verticalmente en el eje transversal
                    - h-16: altura fija (64px) para mantener proporciones
                */}
                <div className="w-full px-6 grid grid-cols-3 items-center h-16">
                    {/* 
                        Columna 1: Botón "Inicio".
                        - flex justify-start: botón alineado a la izquierda
                        - scroll al top con smooth behavior
                    */}
                    <div className="flex justify-start">
                        <GenericButton
                            label="Inicio"
                            icon={<Home size={18} />}
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        />
                    </div>

                    {/* 
                        Columna 2: Título principal centrado.
                        - flex justify-center items-center: centra completamente
                        - font-bold text-gray-600: estilo semibold y color discreto
                        - text-3xl: tamaño grande pero no dominante
                    */}
                    <div className="flex justify-center items-center font-bold text-gray-600">
                        <span className="text-3xl">GESTIÓN DE CURSOS ONLINE</span>
                    </div>

                    {/* 
                        Columna 3: Botones secundarios (búsqueda y autenticación).
                        - flex justify-end gap-2: alinea a la derecha con separación
                    */}
                    <div className="flex justify-end gap-2">
                        {/* 
                            Botón "¿Qué deseas aprender?" (búsqueda).
                            - variant="search": forma redondeada (rounded-full)
                            - Abre CourseInfoModal con catálogo de especialidades
                        */}
                        <GenericButton
                            label="¿Qué deseas aprender?"
                            variant="search"
                            icon={<Search size={20} className="text-gray-500" />}
                            onClick={() => setIsCourseInfoModalOpen(true)}
                        />

                        {/* 
                            Botón "Entrar / Registro".
                            - Abre AuthModal en modo LOGIN (isLoginView=true)
                            - Si user quiere registrarse, puede dar clic en "¿No tengo cuenta?" dentro del modal
                        */}
                        <GenericButton
                            label="Entrar / Registro"
                            icon={<LogIn size={18} />}
                            onClick={() => {
                                if (Date.now() < preventReopenUntilRef.current) {
                                    return;
                                }
                                setIsLoginView(true);  // Mostrar formulario Login por defecto
                                setIsAuthModalOpen(true);
                            }}
                        />
                    </div>
                </div>
            </nav>

            {/* 
                Modal de autenticación (login/registro).
                - isOpen={isAuthModalOpen}: controlado por estado local
                - onClose={() => setIsAuthModalOpen(false)}: cierra el modal
                - isLoginView y setIsLoginView: controlan qué formulario mostrar
                - onSuccess={onLoginSuccess}: propaga user autenticado al padre
                
                NOTA: Renderizado siempre en el árbol de React, solo se muestra si isOpen=true.
                Esto evita destruir/recrear el componente en cada open/close.
            */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                isLoginView={isLoginView}
                setIsLoginView={setIsLoginView}
                onSuccess={(userData) => {
                    // Evita reaperturas por rebote justo despues de cerrar por login exitoso.
                    preventReopenUntilRef.current = Date.now() + 700;
                    setIsAuthModalOpen(false);
                    onLoginSuccess?.(userData);
                }}
            />

            {/* 
                Modal de catálogo de cursos (especialidades).
                - isOpen={isCourseInfoModalOpen}: controlado por estado local
                - onClose={() => setIsCourseInfoModalOpen(false)}: cierra el modal
                
                NOTA: Independiente de AuthModal. Si user clickea "Registrarme" dentro,
                CourseInfoModal se cierra pero AuthModal se abre, sin conflictos.
            */}
            <CourseInfoModal
                isOpen={isCourseInfoModalOpen}
                onClose={() => setIsCourseInfoModalOpen(false)}
            />
        </>
    );
};

export default Navbar;
