// frontend/src/routes/pages/admin/AdminDashboard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';

vi.mock('../../../auth/useAuth', () => ({
    useAuth: () => ({ user: { username: 'root_admin', role: 'ADMIN' } })
}));

vi.mock('../../layouts/DashboardLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-admin-layout">{children}</div>
}));

vi.mock('../../../components/ui/genericHeader/GenericHeader', () => ({
    default: ({ title, description }: { title: string; description: React.ReactNode }) => (
        <div data-testid="mock-generic-header">
            <h2>{title}</h2>
            <div>{description}</div>
        </div>
    )
}));

vi.mock('../../../components/admin/UserScrollList', () => ({
    UserScrollList: () => <div data-testid="mock-user-scroll-list" />
}));

vi.mock('./components/UserSearchPanel', () => ({
    UserSearchPanel: ({ currentAdminUsername }: { currentAdminUsername: string }) => (
        <div data-testid="mock-user-search-panel">{currentAdminUsername}</div>
    )
}));

vi.mock('./components/AdminDocumentInbox', () => ({
    AdminDocumentInbox: () => <div data-testid="mock-admin-document-inbox" />
}));

describe('AdminDashboard - Orquestación de paneles', () => {
    it('renderiza la cabecera institucional y ambos paneles', () => {
        render(<AdminDashboard />);

        expect(screen.getByTestId('mock-admin-layout')).toBeInTheDocument();
        expect(screen.getByTestId('mock-generic-header')).toBeInTheDocument();
        expect(screen.getByText('Panel de Administración')).toBeInTheDocument();
        expect(screen.getByTestId('mock-user-search-panel')).toBeInTheDocument();
        expect(screen.getByTestId('mock-user-scroll-list')).toBeInTheDocument();
        expect(screen.getByTestId('mock-admin-document-inbox')).toBeInTheDocument();
    });

    it('inyecta el username del administrador autenticado en UserSearchPanel', () => {
        render(<AdminDashboard />);

        expect(screen.getByTestId('mock-user-search-panel')).toHaveTextContent('root_admin');
    });
});
