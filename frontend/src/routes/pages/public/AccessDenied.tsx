import { Link } from "react-router-dom";

const AccessDenied = () => {
    return (
        <main className="min-h-screen bg-slate-50 grid place-items-center px-6">
            <section className="max-w-xl w-full bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
                <h1 className="text-2xl font-bold text-slate-800">Acceso denegado</h1>
                <p className="mt-3 text-slate-600">
                    Tu usuario está autenticado, pero no tiene permisos para acceder a esta sección.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                    <Link
                        to="/"
                        className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </section>
        </main>
    );
};

export default AccessDenied;
