import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppRoutes from "./index";
import { AuthContext } from "@/auth/AuthContext";
import type { AuthContextValue } from "@/auth/AuthContext";
import type { AuthUser } from "@/auth";

const buildAuthValue = (user: AuthUser | null): AuthContextValue => ({
    user,
    isAuthenticated: Boolean(user),
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

        expect(screen.getByRole("button", { name: /Entrar \/ Registro/i })).toBeInTheDocument();
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

        expect(screen.getByText(/Panel de administrador/i)).toBeInTheDocument();
    });

    it("permite acceso a /professor cuando el rol es PROFESSOR", () => {
        renderWithRouteAndAuth("/professor", {
            username: "prof_user",
            role: "PROFESSOR",
        });

        expect(screen.getByText(/Panel del profesor/i)).toBeInTheDocument();
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
            role: "student",
        });

        expect(screen.getByText(/Panel del estudiante/i)).toBeInTheDocument();
    });

    it("redirecciona a landing cuando la ruta no existe", () => {
        renderWithRouteAndAuth("/ruta-inexistente", null);

        expect(screen.getByRole("button", { name: /Entrar \/ Registro/i })).toBeInTheDocument();
    });
});
