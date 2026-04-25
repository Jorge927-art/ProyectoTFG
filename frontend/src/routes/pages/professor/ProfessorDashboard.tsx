import { MainNavbar } from "@/components/navbar";

const ProfessorDashboard = () => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <MainNavbar />
            <main className="max-w-4xl mx-auto px-6 py-28">
                <h1 className="text-3xl font-bold text-slate-800">Panel del profesor</h1>
                <p className="mt-3 text-slate-600">
                    Zona privada para gestionar contenido, cursos y seguimiento de estudiantes.
                </p>
            </main>
        </div>
    );
};

export default ProfessorDashboard;
