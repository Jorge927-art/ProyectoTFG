import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from './index';

const mockUseAuth = vi.fn();

vi.mock('../auth', () => ({
    useAuth: () => mockUseAuth(),
}));

vi.mock('../components/navbar/MainNavbar', () => ({
    default: () => <nav>Mock Navbar</nav>,
}));

vi.mock('./pages/public/LandingPage', () => ({
    default: () => <div>Mock Landing</div>,
}));

vi.mock('./pages/public/AccessDenied', () => ({
    default: () => <div>Mock Access Denied</div>,
}));

vi.mock('./pages/student/StudentDashboard', () => ({
    default: () => <div>Mock Student Dashboard</div>,
}));

vi.mock('./pages/admin/AdminDashboard', () => ({
    default: () => <div>Mock Admin Dashboard</div>,
}));

vi.mock('./pages/professor/ProfessorDashboard', () => ({
    default: () => <div>Mock Professor Dashboard</div>,
}));

vi.mock('./pages/student/StudentProfilePage', () => ({
    default: () => <div>Mock Student Profile</div>,
}));

vi.mock('./pages/admin/AdminProfilePage', () => ({
    default: () => <div>Mock Admin Profile</div>,
}));

vi.mock('./pages/professor/ProfessorProfilePage', () => ({
    default: () => <div>Mock Professor Profile</div>,
}));

const renderWithRoute = (route: string) => {
    return render(
        <MemoryRouter initialEntries={[route]}>
            <AppRoutes />
        </MemoryRouter>
    );
};

beforeEach(() => {
    mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
    });
});

describe('AppRoutes - autorizacion por rol', () => {
    it('redirecciona a landing cuando el usuario no esta autenticado e intenta /student', () => {
        renderWithRoute('/student');

        expect(screen.getByText('Mock Landing')).toBeInTheDocument();
        expect(screen.queryByText('Mock Student Dashboard')).not.toBeInTheDocument();
    });

    it('permite acceso a /student cuando el rol es STUDENT', () => {
        mockUseAuth.mockReturnValue({
            user: { username: 'student_user', role: 'STUDENT' },
            isAuthenticated: true,
            isLoading: false,
        });

        renderWithRoute('/student');

        expect(screen.getByText('Mock Student Dashboard')).toBeInTheDocument();
    });

    it('bloquea acceso a /admin para rol STUDENT y muestra acceso denegado', () => {
        mockUseAuth.mockReturnValue({
            user: { username: 'student_user', role: 'STUDENT' },
            isAuthenticated: true,
            isLoading: false,
        });

        renderWithRoute('/admin');

        expect(screen.getByText('Mock Access Denied')).toBeInTheDocument();
    });

    it('permite acceso a /admin cuando el rol es ADMIN', () => {
        mockUseAuth.mockReturnValue({
            user: { username: 'admin_user', role: 'ADMIN' },
            isAuthenticated: true,
            isLoading: false,
        });

        renderWithRoute('/admin');

        expect(screen.getByText('Mock Admin Dashboard')).toBeInTheDocument();
    });

    it('permite acceso a /professor cuando el rol es PROFESSOR', () => {
        mockUseAuth.mockReturnValue({
            user: { username: 'prof_user', role: 'PROFESSOR' },
            isAuthenticated: true,
            isLoading: false,
        });

        renderWithRoute('/professor');

        expect(screen.getByText('Mock Professor Dashboard')).toBeInTheDocument();
    });

    it('bloquea /student cuando el usuario autenticado no tiene rol', () => {
        mockUseAuth.mockReturnValue({
            user: { username: 'sin_rol' },
            isAuthenticated: true,
            isLoading: false,
        });

        renderWithRoute('/student');

        expect(screen.getByText('Mock Access Denied')).toBeInTheDocument();
    });

    it('permite /student aunque el rol venga en minusculas', () => {
        mockUseAuth.mockReturnValue({
            user: { username: 'student_lowercase', role: 'student' },
            isAuthenticated: true,
            isLoading: false,
        });

        renderWithRoute('/student');

        expect(screen.getByText('Mock Student Dashboard')).toBeInTheDocument();
    });

    it('redirecciona a landing cuando la ruta no existe', () => {
        renderWithRoute('/ruta-inexistente');

        expect(screen.getByText('Mock Landing')).toBeInTheDocument();
    });
});
