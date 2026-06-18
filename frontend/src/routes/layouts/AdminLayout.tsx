// src/routes/layouts/AdminLayout.tsx
import { type ReactNode } from 'react';
import DashboardLayout from './DashboardLayout';

interface AdminLayoutProps {
    children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
    return (
        <DashboardLayout className="max-w-6xl mx-auto px-4 pt-24 pb-12">
            {/* Si el día de mañana añades un panel de control lateral o logs críticos para el Admin, irán aquí */}
            {children}
        </DashboardLayout>
    );
};

export default AdminLayout;
