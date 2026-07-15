import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./guards/ProtectedRoute";
import LandingPage from "./pages/public/LandingPage";
import AccessDenied from "./pages/public/AccessDenied";
import StudentDashboard from "./pages/student/StudentDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProfessorDashboard from "./pages/professor/ProfessorDashboard";
import StudentProfilePage from "./pages/student/StudentProfilePage";
import ProfessorProfilePage from "./pages/professor/ProfessorProfilePage";
import AdminProfilePage from "./pages/admin/AdminProfilePage";


import { useAuth } from "../auth"; // <-- Escuchamos la fuente de verdad global

const AppRoutes = () => {
    const { user, isAuthenticated } = useAuth(); // <-- Escuchamos la fuente de verdad global

    return (
        <Routes>
            {/* 1. VISTAS PÚBLICAS Y REDIRECCIÓN AUTOMÁTICA POST-LOGIN */}
            {/* Si el usuario ya inició sesión con éxito (200 OK), la Landing Page 
                lo redirige de forma nativa e inmediata según su Rol exacto */}
            <Route
                path="/"
                element={
                    isAuthenticated && user ? (
                        user.role?.toUpperCase() === 'ADMIN' ? <Navigate to="/admin" replace /> :
                            user.role?.toUpperCase() === 'STUDENT' ? <Navigate to="/student" replace /> :
                                user.role?.toUpperCase() === 'PROFESSOR' ? <Navigate to="/professor" replace /> :
                                    <LandingPage />
                    ) : (
                        <LandingPage />
                    )
                }
            />
            <Route path="/acceso-denegado" element={<AccessDenied />} />

            {/* 2. PROTECCIÓN ALUMNO */}
            <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
                <Route path="/student" element={<StudentDashboard />} />
                <Route path="/student/profile" element={<StudentProfilePage />} />
            </Route>

            {/* 3. PROTECCIÓN ADMINISTRADOR */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/profile" element={<AdminProfilePage />} />
            </Route>

            {/* 4. PROTECCIÓN PROFESOR */}
            <Route element={<ProtectedRoute allowedRoles={['PROFESSOR']} />}>
                <Route path="/professor" element={<ProfessorDashboard />} />
                <Route path="/professor/profile" element={<ProfessorProfilePage />} />
            </Route>

            {/* Fallback automático de seguridad para rutas inexistentes */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRoutes;
