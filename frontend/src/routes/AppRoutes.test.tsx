import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppRoutes from "./index";
import { AuthContext } from "@/auth/AuthContext";
import type { AuthContextValue } from "@/auth/AuthContext";
import type { AuthUser } from "@/auth";

// Intercepción exacta de la ruta relativa de la pasarela de red
vi.mock("../services/apiClient", () => ({
    apiClient: {
        get: vi.fn(() => Promise.resolve({ data: [] })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        interceptors: {
            request: { use: vi.fn(), eject: vi.fn() },
            response: { use: vi.fn(), eject: vi.fn() }
        }
    }
}));

const buildAuthValue = (user: AuthUser | null): AuthContextValue => ({
    user,
    isAuthenticated: Boolean(user),
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
});

const renderWithRouteAndAuth = (route: string, user: AuthUser | null) => {
    return render(
        <AuthContext.Provider value={buildAuthValue(user)}>
            <MemoryRouter initialEntries={[route]}>
                <AppRoutes />
            </MemoryRouter>
        </AuthContext.Provider>
    );
};

describe("AppRoutes - autorizacion por rol", () => {
    it("redirecciona a landing cuando el usuario no esta autenticado e intenta /student", () => {
        renderWithRouteAndAuth("/student", null);

        const buttons = screen.getAllByRole("button", { name: /Entrar \/ Registro/i });
        expect(buttons.length).toBeGreaterThan(0);
        expect(screen.queryByText(/Panel del estudiante/i)).not.toBeInTheDocument();
    });

    it("permite acceso a /student cuando el rol es STUDENT", () => {
        renderWithRouteAndAuth("/student", {
            username: "student_user",
            role: "STUDENT",
        });

        expect(screen.getByText(/Panel del estudiante/i)).toBeInTheDocument();
    });

    it("bloquea acceso a /admin para rol STUDENT y muestra acceso denegado", () => {
        renderWithRouteAndAuth("/admin", {
            username: "student_user",
            role: "STUDENT",
        });

        expect(screen.getByText(/Acceso denegado/i)).toBeInTheDocument();
    });

    it("permite acceso a /admin cuando el rol es ADMIN", () => {
        renderWithRouteAndAuth("/admin", {
            username: "admin_user",
            role: "ADMIN",
        });

        // Corregido: Tolera múltiples elementos de navegación duplicados en tu layout estructurado
        const navs = screen.getAllByRole("navigation");
        expect(navs.length).toBeGreaterThan(0);
    });

    it("permite acceso a /professor cuando el rol es PROFESSOR", () => {
        renderWithRouteAndAuth("/professor", {
            username: "prof_user",
            role: "PROFESSOR",
        });

        // Corregido: Tolera múltiples elementos de navegación duplicados en tu layout estructurado
        const navs = screen.getAllByRole("navigation");
        expect(navs.length).toBeGreaterThan(0);
    });

    it("bloquea /student cuando el usuario autenticado no tiene rol", () => {
        renderWithRouteAndAuth("/student", {
            username: "sin_rol",
        });

        expect(screen.getByText(/Acceso denegado/i)).toBeInTheDocument();
    });

    it("permite /student aunque el rol venga en minusculas", () => {
        renderWithRouteAndAuth("/student", {
            username: "student_lowercase",
            role: "student" as AuthUser["role"],
        });

        expect(screen.getByText(/Panel del estudiante/i)).toBeInTheDocument();
    });

    it("redirecciona a landing cuando la ruta no existe", () => {
        renderWithRouteAndAuth("/ruta-inexistente", null);

        const buttons = screen.getAllByRole("button", { name: /Entrar \/ Registro/i });
        expect(buttons.length).toBeGreaterThan(0);
    });
});
