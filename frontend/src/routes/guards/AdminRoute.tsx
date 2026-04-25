import ProtectedRoute from "./ProtectedRoute";

// Política de acceso específica para la zona de administración.
const ADMIN_ALLOWED_ROLES = ["ADMIN"];
const REDIRECT_IF_UNAUTHORIZED = "/acceso-denegado";

const AdminRoute = () => {
    // Esta guardia delega la validación de sesión/rol en ProtectedRoute
    // y solo define la política de autorización para ADMIN.
    return (
        <ProtectedRoute
            allowedRoles={ADMIN_ALLOWED_ROLES}
            redirectIfUnauthorized={REDIRECT_IF_UNAUTHORIZED}
        />
    );
};

export default AdminRoute;
