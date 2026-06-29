import ProtectedRoute from "./ProtectedRoute";
// Importamos la constante centralizada de roles (ajusta la ruta '../auth/authTypes' según corresponda)
import { ROLES } from "../../auth/authTypes";

// Política de acceso específica para la zona de administración usando la constante blindada
const ADMIN_ALLOWED_ROLES = [ROLES.ADMIN];
const REDIRECT_IF_UNAUTHORIZED = "/acceso-denegado";

const AdminRoute = () => {
    // Esta guardia de seguridad delega la validación de sesión/rol en ProtectedRoute
    // y solo define la política de autorización para ADMIN de manera estricta.
    return (
        <ProtectedRoute
            allowedRoles={ADMIN_ALLOWED_ROLES}
            redirectIfUnauthorized={REDIRECT_IF_UNAUTHORIZED}
        />
    );
};

export default AdminRoute;
