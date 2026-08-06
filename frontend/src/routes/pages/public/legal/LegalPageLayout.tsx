import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface LegalPageLayoutProps {
    title: string;
    lastUpdated: string;
    children: ReactNode;
}

const LegalPageLayout = ({ title, lastUpdated, children }: LegalPageLayoutProps) => {
    useEffect(() => {
        document.title = `${title} | Gestión de Cursos Online`;
    }, [title]);

    return (
        <main className="min-h-screen bg-slate-50 px-6 py-10 md:py-14">
            <section className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-10">
                <header className="mb-8 border-b border-slate-200 pb-5">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">{title}</h1>
                    <p className="mt-2 text-sm text-slate-500">Actualizado: {lastUpdated}</p>
                </header>

                <div className="space-y-7 text-slate-700 leading-relaxed [&_h2]:text-slate-900 [&_h2]:font-semibold [&_h2]:text-xl [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2">
                    {children}
                </div>

                <div className="mt-10 pt-6 border-t border-slate-200">
                    <Link
                        to="/"
                        className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </section>
        </main>
    );
};

export default LegalPageLayout;
