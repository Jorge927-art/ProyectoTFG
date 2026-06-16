// src/routes/layouts/StudentLayout.tsx
import { type ReactNode } from 'react';
import DashboardLayout from './DashboardLayout';

interface StudentLayoutProps {
    children: ReactNode;
}

const StudentLayout = ({ children }: StudentLayoutProps) => {
    return (
        <DashboardLayout className="max-w-6xl mx-auto px-6 pt-24 pb-12">
            {/* Puedes añadir aquí cabeceras, sidebars o widgets exclusivos de alumnos en el futuro */}
            {children}
        </DashboardLayout>
    );
};

export default StudentLayout;
