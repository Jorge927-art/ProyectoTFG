import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/auth";

// Ruta de retorno cuando no existe sesión autenticada.
const REDIRECT_IF_UNAUTHENTICATED = "/";
const DEFAULT_REDIRECT_IF_UNAUTHORIZED = "/acceso-denegado";

interface ProtectedRouteProps {
    // Lista de roles permitidos para esta ruta. Si se omite, solo valida sesión.
    allowedRoles?: string[];
    // Ruta de retorno cuando hay sesión pero el rol no está autorizado.
    redirectIfUnauthorized?: string;
}

/**
 * Guardia base para rutas privadas.
 *
 * RESPONSABILIDAD:
 * 1) Verificar que exista una sesión válida (usuario autenticado).
 * 2) (Opcional) Verificar si el rol del usuario pertenece a una lista permitida.
 * 3) Redirigir cuando no se cumplen las condiciones de acceso.
 * 4) Si pasa la validación, permitir renderizar la ruta hija con <Outlet />.
 *
 * NOTA:
 * Con este diseño, una guardia específica (por ejemplo StudentRoute) solo necesita
 * configurar `allowedRoles`, evitando duplicar lógica de sesión/redirect.
 */
const ProtectedRoute = ({
    allowedRoles,
    redirectIfUnauthorized = DEFAULT_REDIRECT_IF_UNAUTHORIZED,
}: ProtectedRouteProps) => {
    const { user, isAuthenticated } = useAuth();
    const location = useLocation();

    // Si no hay sesión, bloqueamos acceso a la ruta privada.
    if (!isAuthenticated || !user) {
        return (
            <Navigate
                to={REDIRECT_IF_UNAUTHENTICATED}
                replace
                state={{ from: location }}
            />
        );
    }

    // Si hay política de roles, validamos que el rol actual esté permitido.
    if (allowedRoles && allowedRoles.length > 0) {
        const normalizedRole = String(user.role ?? "").toUpperCase();
        const normalizedAllowedRoles = allowedRoles.map((role) => role.toUpperCase());

        if (!normalizedAllowedRoles.includes(normalizedRole)) {
            return (
                <Navigate
                    to={redirectIfUnauthorized}
                    replace
                    state={{ from: location }}
                />
            );
        }
    }

    // Si hay sesión válida, permitimos que se renderice la ruta hija.
    return <Outlet />;
};

export default ProtectedRoute;
