// frontend/src/routes/pages/admin/AdminDashboard.test.tsx
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';

vi.mock('react-router-dom', () => ({
    useLocation: () => ({ search: '' })
}));

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

vi.mock('./components/AdminCourseProfessorReassignmentPanel', () => ({
    AdminCourseProfessorReassignmentPanel: () => <div data-testid="mock-admin-course-reassignment-panel" />
}));

vi.mock('./components/AdminDocumentInbox', () => ({
    AdminDocumentInbox: () => <div data-testid="mock-admin-document-inbox" />
}));

vi.mock('./components/AdminCourseCatalogPanel', () => ({
    AdminCourseCatalogPanel: () => <div data-testid="mock-admin-course-catalog-panel" />
}));

vi.mock('./components/AdminStudentPreferencesPanel', () => ({
    AdminStudentPreferencesPanel: () => <div data-testid="mock-admin-student-preferences-panel" />
}));

vi.mock('./components/CourseInsightPanel', () => ({
    CourseInsightPanel: () => <div data-testid="mock-course-insight-panel" />
}));

vi.mock('./components/GlobalStatisticsPanel', () => ({
    GlobalStatisticsPanel: () => <div data-testid="mock-global-statistics-panel" />
}));

describe('AdminDashboard - Orquestación de paneles', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renderiza la cabecera institucional y ambos paneles', () => {
        render(<AdminDashboard />);

        expect(screen.getByTestId('mock-admin-layout')).toBeInTheDocument();
        expect(screen.getByTestId('mock-generic-header')).toBeInTheDocument();
        expect(screen.getByText('Panel de Administración')).toBeInTheDocument();
        expect(screen.getByTestId('mock-user-search-panel')).toBeInTheDocument();
        expect(screen.getByTestId('mock-user-scroll-list')).toBeInTheDocument();
        expect(screen.getByTestId('mock-admin-course-catalog-panel')).toBeInTheDocument();
        expect(screen.getByTestId('mock-admin-student-preferences-panel')).toBeInTheDocument();
        expect(screen.getByTestId('mock-admin-course-reassignment-panel')).toBeInTheDocument();
        expect(screen.getByTestId('mock-admin-document-inbox')).toBeInTheDocument();
        expect(screen.getByTestId('mock-global-statistics-panel')).toBeInTheDocument();
    });

    it('inyecta el username del administrador autenticado en UserSearchPanel', () => {
        render(<AdminDashboard />);

        expect(screen.getByTestId('mock-user-search-panel')).toHaveTextContent('root_admin');
    });

    it('renderiza el panel de catálogo antes que la bandeja de documentos', () => {
        render(<AdminDashboard />);

        const courseCatalog = screen.getByTestId('mock-admin-course-catalog-panel');
        const inbox = screen.getByTestId('mock-admin-document-inbox');

        const position = courseCatalog.compareDocumentPosition(inbox);
        expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('renderiza preferencias de alumnos entre usuarios y catálogo de cursos', () => {
        render(<AdminDashboard />);

        const preferences = screen.getByTestId('mock-admin-student-preferences-panel');
        const catalog = screen.getByTestId('mock-admin-course-catalog-panel');

        expect(preferences.compareDocumentPosition(catalog) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('renderiza el panel de reasignación antes que la bandeja de documentos', () => {
        render(<AdminDashboard />);

        const reassignment = screen.getByTestId('mock-admin-course-reassignment-panel');
        const inbox = screen.getByTestId('mock-admin-document-inbox');

        const position = reassignment.compareDocumentPosition(inbox);
        expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('renderiza la bandeja de documentos antes que el panel estadístico de cursos', () => {
        render(<AdminDashboard />);

        const inbox = screen.getByTestId('mock-admin-document-inbox');
        const courseInsight = screen.getByTestId('mock-course-insight-panel');

        const position = inbox.compareDocumentPosition(courseInsight);
        expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('renderiza el panel estadístico global debajo del panel estadístico de cursos', () => {
        render(<AdminDashboard />);

        const courseInsight = screen.getByTestId('mock-course-insight-panel');
        const globalStats = screen.getByTestId('mock-global-statistics-panel');

        const position = courseInsight.compareDocumentPosition(globalStats);
        expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it.each([
        [390, 'móvil'],
        [768, 'tablet'],
        [1366, 'portátil'],
        [1920, 'monitor grande'],
        [2560, 'monitor amplio'],
    ])('mantiene el contrato responsive en %s px (%s)', (viewportWidth) => {
        vi.stubGlobal('innerWidth', viewportWidth);
        render(<AdminDashboard />);

        const analyticsGrid = screen.getByTestId('admin-analytics-grid');
        const userGrid = screen.getByTestId('mock-user-search-panel').parentElement?.parentElement;

        expect(analyticsGrid).toHaveClass('grid-cols-1', '2xl:grid-cols-2');
        expect(userGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2');
        expect(analyticsGrid).not.toHaveClass('w-screen', 'min-w-max');
        expect(userGrid).not.toHaveClass('w-screen', 'min-w-max');
    });
});
