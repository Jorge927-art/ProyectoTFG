// src/routes/layouts/ProfessorLayout.tsx
import { type ReactNode } from 'react';
import DashboardLayout from './DashboardLayout';

interface ProfessorLayoutProps {
    children: ReactNode;
}

const ProfessorLayout = ({ children }: ProfessorLayoutProps) => {
    return (
        <DashboardLayout className="max-w-6xl mx-auto px-6 pt-24 pb-12">
            {/* Si en el futuro agregas un submenú docente o widgets específicos para profesores, irán aquí */}
            {children}
        </DashboardLayout>
    );
};

export default ProfessorLayout;
