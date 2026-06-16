// src/routes/layouts/DashboardLayout.tsx
import { type ReactNode } from 'react';
import NavbarUser from '../../components/navbar/NavbarUser';
import { useAuth } from '../../auth/useAuth';

interface DashboardLayoutProps {
    children: ReactNode;
    className?: string; // Permite inyectar estilos de rejilla desde fuera
}

const DashboardLayout = ({ children, className = "" }: DashboardLayoutProps) => {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Navbar única inyectada automáticamente desde la sesión */}
            <NavbarUser
                username={user?.username || 'Usuario'}
                onLogout={logout}
            />
            {/* Contenedor sin restricciones de ancho fijadas a fuego */}
            <div className={className}>
                {children}
            </div>
        </div>
    );
};

export default DashboardLayout;
