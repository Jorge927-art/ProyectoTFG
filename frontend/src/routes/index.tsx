import { Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute, ProfessorRoute, StudentRoute } from "./guards";
import LandingPage from "./pages/public/LandingPage";
import AccessDenied from "./pages/public/AccessDenied";
import StudentDashboard from "./pages/student/StudentDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProfessorDashboard from "./pages/professor/ProfessorDashboard";

const AppRoutes = () => {
    return (
        <Routes>
            {/* Rutas publicas */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/acceso-denegado" element={<AccessDenied />} />

            {/* Rutas protegidas por rol */}
            <Route element={<StudentRoute />}>
                <Route path="/student" element={<StudentDashboard />} />
            </Route>

            <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            <Route element={<ProfessorRoute />}>
                <Route path="/professor" element={<ProfessorDashboard />} />
            </Route>

            {/* Fallback de rutas no encontradas */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRoutes;
