import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, User, LogOut, GraduationCap, ShieldAlert, BookOpen } from 'lucide-react';
import GenericButton from "../ui/genericButton/GenericButton";
import { useAuth } from '../../auth';
// Auditoría NotebookLM: Importación de la constante centralizada para mitigar hardcoding de roles.
import { ROLES } from '../../auth/authTypes';
import { resolveAvatarUrl } from '../../auth/avatarUrl';
import NotificationBell from '../ui/globalNotificationBell/GlobalNotificationBell';


/**
 * Props del componente NavbarUser.
 */
interface NavbarUserProps {
    username: string;
    userPhoto?: string;
    onLogout?: () => void;
}

/**
 * Barra de navegación inteligente con indicador dinámico de modo.
 */
const NavbarUser = ({ username, userPhoto, onLogout }: NavbarUserProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const currentRole = user?.role?.toUpperCase().trim() || ROLES.STUDENT;

    // FUNCIÓN DE REDIRECCIÓN INTERNA AUTÓNOMA MULTIRROL OPTIMIZADA
    const handleProfileRedirect = () => {
        const roleCleaned = currentRole.trim().toUpperCase();
        console.log("[NAVBAR]: Redirigiendo perfil para rol ->", roleCleaned);

        // Auditoría NotebookLM: Mapeo de rutas indexado mediante claves del objeto ROLES
        const profileRoutes: Record<string, string> = {
            [ROLES.STUDENT]: '/student/profile',
            [ROLES.PROFESSOR]: '/professor/profile',
            [ROLES.ADMIN]: '/admin/profile'
        };

        const targetPath = profileRoutes[roleCleaned] || '/student/profile';
        navigate(targetPath);
    };

    const resolvedAvatarUrl = resolveAvatarUrl(userPhoto);

    const avatarIcon: ReactNode = resolvedAvatarUrl ? (
        <img
            src={resolvedAvatarUrl}
            alt={`Perfil de ${username}`}
            className="w-7 h-7 rounded-full object-cover border border-blue-200"
        />
    ) : (
        <div className="bg-blue-50 p-1 rounded-full text-blue-500">
            <User size={18} />
        </div>
    );

    return (
        <nav className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-1.5 z-50 flex justify-between items-center h-16">

            {/* 1. SECCIÓN IZQUIERDA */}
            <div className="w-1/3 flex justify-start">
                <GenericButton
                    label="Inicio"
                    icon={<Home size={16} />}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />
            </div>

            {/* 2. SECCIÓN CENTRAL - CONTROL DE INSIGNIAS POR ROL CON RIESGO CERO */}
            <div className="w-1/3 flex items-center justify-center">
                {(() => {
                    if (currentRole === ROLES.ADMIN) {
                        return (
                            <div className="bg-red-50 px-3 py-1 rounded-full border border-red-100 flex items-center gap-1.5 text-red-800 font-bold text-[11px] uppercase tracking-wider shadow-sm animate-in fade-in duration-300">
                                <ShieldAlert size={14} className="text-red-600" />
                                <span>Administrador</span>
                            </div>
                        );
                    } else if (currentRole === ROLES.PROFESSOR) {
                        return (
                            <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] uppercase tracking-wider shadow-sm animate-in fade-in duration-300">
                                <BookOpen size={14} className="text-emerald-600" />
                                <span>Profesor</span>
                            </div>
                        );
                    } else {
                        return (
                            <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5 text-blue-800 font-bold text-[11px] uppercase tracking-wider shadow-sm animate-in fade-in duration-300">
                                <GraduationCap size={14} className="text-blue-600" />
                                <span>Alumno</span>
                            </div>
                        );
                    }
                })()}
            </div>

            {/* 3. SECCIÓN DERECHA */}
            <div className="w-1/3 flex items-center justify-end gap-4">

                {/* ELIMINA LA CONDICIONAL ANTERIOR Y DEJA SOLO LA CAMPANA GLOBAL: */}
                <NotificationBell />

                <GenericButton
                    onClick={handleProfileRedirect}
                    variant="white"
                    label={username}
                    icon={avatarIcon}
                />

                <GenericButton
                    onClick={onLogout}
                    variant="text"
                    ariaLabel="Cerrar sesión"
                    icon={<LogOut size={18} />}
                    className="p-2! text-gray-400! hover:text-red-500! bg-transparent! shadow-none!"
                />
            </div>

        </nav>
    );
};

export default NavbarUser;
