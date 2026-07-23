import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import StudentProfilePage from './StudentProfilePage';

// --- AISLAMIENTO PERIMETRAL ESTRICTO: MOCK DE LAYOUTS Y SUBCOMPONENTES ---
vi.mock('../../layouts/DashboardLayout', () => ({
    default: ({ children }: { children: ReactNode }) => (
        <div data-testid="mock-dashboard-layout">
            {children}
        </div>
    ),
}));

vi.mock('../../../components/ui/profileSettings/ProfileSettings', () => ({
    default: () => <div data-testid="mock-profile-settings" />,
}));

describe('StudentProfilePage - Suite de Pruebas Unitarias Completa', () => {
    it('debe orquestar e integrar la jerarquía estructural correcta de la página', () => {
        render(<StudentProfilePage />);

        // 1. Verificar la inicialización del layout contenedor general
        const dashboardLayout = screen.getByTestId('mock-dashboard-layout');
        expect(dashboardLayout).toBeInTheDocument();

        // 2. Verificar que el componente de configuración de perfil se renderiza dentro del layout
        const profileSettings = screen.getByTestId('mock-profile-settings');
        expect(profileSettings).toBeInTheDocument();
        expect(dashboardLayout).toContainElement(profileSettings);
    });
});
