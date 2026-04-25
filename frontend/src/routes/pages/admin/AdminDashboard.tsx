import { MainNavbar } from "@/components/navbar";

const AdminDashboard = () => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <MainNavbar />
            <main className="max-w-4xl mx-auto px-6 py-28">
                <h1 className="text-3xl font-bold text-slate-800">Panel de administrador</h1>
                <p className="mt-3 text-slate-600">
                    Zona privada para tareas administrativas de la plataforma.
                </p>
            </main>
        </div>
    );
};

export default AdminDashboard;
