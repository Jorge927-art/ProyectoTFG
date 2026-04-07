
import type { ReactNode } from 'react';
import { Home, User, LogOut } from 'lucide-react';
import GenericButton from "../ui/genericButton/GenericButton";

/**
 * Props del componente NavbarUser.
 * 
 * Define el contrato para una barra de navegación personalizada cuando el usuario está autenticado.
 * Incluye información de perfil (nombre y foto) y acciones (logout, perfil).
 * 
 * @interface NavbarUserProps
 */
interface NavbarUserProps {
    /**
     * Nombre de usuario a mostrar en el botón de perfil.
     * Renderizado como label en GenericButton.
     * Requerido.
     */
    username: string;

    /**
     * URL de la foto de perfil del usuario.
     * Si no se proporciona, muestra un avatar por defecto azul con icono User.
     * Renderizado como <img> con object-cover para mantener proporciones.
     * Optional.
     */
    userPhoto?: string;

    /**
     * Callback ejecutado al hacer clic en el botón de logout (LogOut icon).
     * Típicamente ejecuta limpieza de sesión, despacha acciones de auth, etc.
     * Optional.
     */
    onLogout?: () => void;

    /**
     * Callback ejecutado al hacer clic en el botón de perfil (nombre + foto).
     * Típicamente abre modal de perfil o navega a página de settings.
     * Optional.
     */
    onProfileClick?: () => void;
}

/**
 * Barra de navegación para usuarios autenticados.
 * 
 * Renderiza una navbar fija en la parte superior con:
 * - Botón "Inicio" a la izquierda (scroll al top)
 * - Botón de perfil a la derecha (nombre + foto/avatar)
 * - Botón de logout (icono LogOut)
 * 
 * LAYOUT:
 * - fixed top-0: navbar fija adherida al top (z-50 para estar encima de contenido)
 * - w-full: ocupa ancho completo
 * - bg-white/80 backdrop-blur-md: fondo blanco semi-transparente con blur (efecto moderno)
 * - border-b border-gray-100: línea separadora sutil
 * - Dos secciones: flex justify-start a la izquierda, flex items-center gap-4 a la derecha
 * 
 * COMPONENTES:
 * 1. Botón "Inicio": GenericButton reutilizable con icono Home
 * 2. Botón "Perfil": GenericButton con nombre de usuario + foto/avatar
 *    - Si no hay foto: avatar placeholder azul con icono User
 * 3. Botón "Logout": Botón nativo simple con icono LogOut
 * 
 * ESTILO DE LOGOUT:
 * Botón gris por defecto, rojo al hover. Transición suave.
 * Pequeño y discreto (p-2) para no distraer.
 * 
 * @component
 * @example
 * // Navbar con foto de perfil
 * <NavbarUser
 *   username="Juan Pérez"
 *   userPhoto="/profiles/juan.jpg"
 *   onProfileClick={() => navigate('/perfil')}
 *   onLogout={() => handleLogout()}
 * />
 * 
 * @example
 * // Navbar sin foto (muestra avatar default)
 * <NavbarUser
 *   username="María García"
 *   onLogout={() => dispatch(logoutAction())}
 * />
 * 
 * @param {NavbarUserProps} props - Props del componente
 * @returns {JSX.Element} Elemento <nav> con estructura de navbar
 */
const NavbarUser = ({ username, userPhoto, onLogout, onProfileClick }: NavbarUserProps) => {
    /**
     * Renderiza el icono/foto del perfil según disponibilidad.
     * 
     * LÓGICA:
     * - Si userPhoto existe: renderiza <img> circular con foto de perfil.
     * - Si no: renderiza avatar placeholder azul con icono User.
     * 
     * RAZÓN DE EXTRAER A VARIABLE:
     * El valor es ReactNode complejo (condicional entre img y div),
     * mejora legibilidad sacarlo del JSX principal.
     */
    const avatarIcon: ReactNode = userPhoto ? (
        // OPCIÓN 1: Foto real
        // object-cover: recorta imagen manteniendo proporciones (no pierde calidad)
        // border border-blue-200: borde sutil azul para resalte
        <img
            src={userPhoto}
            alt={`Perfil de ${username}`}
            className="w-8 h-8 rounded-full object-cover border border-blue-200"
        />
    ) : (
        // OPCIÓN 2: Avatar placeholder
        // bg-blue-50: fondo muy claro (casi blanco)
        // text-blue-500: icono azul (contraste visual)
        // p-1.5: padding interno para que icono no toque bordes
        <div className="bg-blue-50 p-1.5 rounded-full text-blue-500">
            <User size={20} />
        </div>
    );

    return (
        <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3 z-50">
            {/* 
                Sección izquierda: Botón "Inicio" para scroll al top.
                - flex justify-start: alinea a la izquierda
                - Ejecuta window.scrollTo con smooth behavior para UX fluida
            */}
            <div className="flex justify-start">
                <GenericButton
                    label="Inicio"
                    icon={<Home size={18} />}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />
            </div>

            {/* 
                Sección derecha: Perfil + Logout.
                - flex items-center gap-4: alinea horizontalmente con separación
            */}
            <div className="flex items-center gap-4">
                {/* 
                    Botón de perfil con nombre de usuario e icono/foto.
                    - onClick={onProfileClick}: navega a perfil o abre modal (definido por parent)
                    - variant="white": estilos default de GenericButton
                    - label={username}: nombre obtenido de sesión
                    - icon={avatarIcon}: foto o avatar placeholder (extraído a variable)
                */}
                <GenericButton
                    onClick={onProfileClick}
                    variant="white"
                    label={username}
                    icon={avatarIcon}
                />

                {/* 
                    Botón de logout iconográfico (sin label).
                    - Botón nativo <button> simple (no reutilizamos GenericButton)
                    - p-2: padding pequeño, mantiene botón compacto
                    - text-gray-400: color neutro por defecto
                    - hover:text-red-500: cambia a rojo al pasar mouse (indicador de danger)
                    - transition-colors: anima cambio de color suavemente
                    - title="Cerrar sesión": tooltip al hover (accesibilidad)
                */}
                <button
                    onClick={onLogout}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Cerrar sesión"
                    aria-label="Cerrar sesión"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </nav>
    );
};

export default NavbarUser;
