import ProtectedRoute from "./ProtectedRoute";

// Política de acceso específica para la zona de profesor.
const PROFESSOR_ALLOWED_ROLES = ["PROFESSOR"];
const REDIRECT_IF_UNAUTHORIZED = "/acceso-denegado";

const ProfessorRoute = () => {
    // Esta guardia delega la validación de sesión/rol en ProtectedRoute
    // y solo define la política de autorización para PROFESSOR.
    return (
        <ProtectedRoute
            allowedRoles={PROFESSOR_ALLOWED_ROLES}
            redirectIfUnauthorized={REDIRECT_IF_UNAUTHORIZED}
        />
    );
};

export default ProfessorRoute;
