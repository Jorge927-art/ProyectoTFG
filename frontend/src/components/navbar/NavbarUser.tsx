import type { ReactNode } from 'react';
import { Home, User, LogOut, GraduationCap } from 'lucide-react'; // <-- Añadido GraduationCap
import GenericButton from "../ui/genericButton/GenericButton";

/**
 * Props del componente NavbarUser.
 */
interface NavbarUserProps {
    username: string;
    userPhoto?: string;
    onLogout?: () => void;
    onProfileClick?: () => void;
}

/**
 * Barra de navegación optimizada, estrecha y con indicador de Modo Alumno central.
 */
const NavbarUser = ({ username, userPhoto, onLogout, onProfileClick }: NavbarUserProps) => {

    const avatarIcon: ReactNode = userPhoto ? (
        <img
            src={userPhoto}
            alt={`Perfil de ${username}`}
            className="w-7 h-7 rounded-full object-cover border border-blue-200"
        />
    ) : (
        <div className="bg-blue-50 p-1 rounded-full text-blue-500">
            <User size={18} />
        </div>
    );

    return (
        <nav className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-1.5 z-50 flex justify-between items-center">

            {/* 1. SECCIÓN IZQUIERDA: Botón "Inicio" */}
            <div className="w-1/4 flex justify-start">
                <GenericButton
                    label="Inicio"
                    icon={<Home size={16} />}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />
            </div>

            {/* 2. SECCIÓN CENTRAL: Indicador del modo dinámico */}
            <div className="flex items-center justify-center">
                <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5 text-blue-800 font-bold text-[11px] uppercase tracking-wider shadow-sm">
                    <GraduationCap size={14} className="text-blue-600" />
                    <span>Modo Alumno</span>
                </div>
            </div>

            {/* 3. SECCIÓN DERECHA: Perfil + Logout */}
            <div className="w-1/4 flex items-center justify-end gap-4">
                <GenericButton
                    onClick={onProfileClick}
                    variant="white"
                    label={username}
                    icon={avatarIcon}
                />

                <button
                    onClick={onLogout}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Cerrar sesión"
                    aria-label="Cerrar sesión"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </nav>
    );
};

export default NavbarUser;
