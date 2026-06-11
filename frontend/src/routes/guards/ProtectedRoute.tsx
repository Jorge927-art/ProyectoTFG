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
 * Guardia base para rutas privadas adaptada para flujos asíncronos JWT.
 */
const ProtectedRoute = ({
    allowedRoles,
    redirectIfUnauthorized = DEFAULT_REDIRECT_IF_UNAUTHORIZED,
}: ProtectedRouteProps) => {
    // Inyectamos isLoading desde el contexto global para controlar la hidratación del token
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // FRENO DE SEGURIDAD ASÍNCRONO: Mientras el interceptor y el proveedor validan 
    // el token contra el backend, pausamos la redirección para evitar falsos negativos.
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    {/* Spinner visual conceptual de carga */}
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-semibold animate-pulse">Verificando credenciales de seguridad...</p>
                </div>
            </div>
        );
    }

    // Si terminó la carga de validación técnica y no hay sesión, bloqueamos el acceso
    if (!isAuthenticated || !user) {
        return (
            <Navigate
                to={REDIRECT_IF_UNAUTHENTICATED}
                replace
                state={{ from: location }}
            />
        );
    }

    // Si hay política de roles, validamos que el rol actual esté permitido
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

    // Si la sesión es válida y el rol está autorizado, permitimos el renderizado de la ruta hija
    return <Outlet />;
};

export default ProtectedRoute;

