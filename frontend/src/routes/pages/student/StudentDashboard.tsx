import { MainNavbar } from "@/components/navbar";

const StudentDashboard = () => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <MainNavbar />
            <main className="max-w-4xl mx-auto px-6 py-28">
                <h1 className="text-3xl font-bold text-slate-800">Panel del estudiante</h1>
                <p className="mt-3 text-slate-600">
                    Esta es tu zona privada como estudiante. Aqui veras tus cursos, progreso y tareas.
                </p>
            </main>
        </div>
    );
};

export default StudentDashboard;
