import { type ReactNode } from 'react';
import NavbarUser from '../../components/navbar/NavbarUser';
import { useAuth } from '../../auth/useAuth';

interface DashboardLayoutProps {
    children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const { user, logout } = useAuth();

    // Auditoría NotebookLM: Parametrización inteligente por rol en un único archivo.
    // Si el usuario es ADMINISTRADOR, se aplica px-4. Para cualquier otro, px-6.
    const isAdmin = user?.role === 'ADMIN';
    const paddingX = isAdmin ? 'px-4' : 'px-6';

    const containerClasses = `max-w-6xl mx-auto ${paddingX} pt-24 pb-12`;

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Navbar única inyectada automáticamente desde la sesión */}
            <NavbarUser
                username={user?.username || 'Usuario'}
                onLogout={logout}
            />

            {/* Contenedor central parametrizado */}
            <div className={containerClasses}>
                {children}
            </div>
        </div>
    );
};

export default DashboardLayout;
