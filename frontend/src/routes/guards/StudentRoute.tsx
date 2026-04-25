import ProtectedRoute from "./ProtectedRoute";

// Política de acceso específica para la zona de estudiante.
const STUDENT_ALLOWED_ROLES = ["STUDENT"];
const REDIRECT_IF_UNAUTHORIZED = "/acceso-denegado";

const StudentRoute = () => {
    // StudentRoute ya no duplica lógica de sesión.
    // Solo define la regla de rol y delega la validación en ProtectedRoute.
    return (
        <ProtectedRoute
            allowedRoles={STUDENT_ALLOWED_ROLES}
            redirectIfUnauthorized={REDIRECT_IF_UNAUTHORIZED}
        />
    );
};

export default StudentRoute;
