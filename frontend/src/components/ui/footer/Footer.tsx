import { BookOpen, Mail, Github, Linkedin } from "lucide-react";
import type { MouseEvent } from "react";
import { Link, useLocation } from "react-router-dom";

const Footer = () => {
    const year = new Date().getFullYear();
    const location = useLocation();

    const handleHomeClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (location.pathname === "/") {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    return (
        <footer className="bg-slate-900 text-slate-300">
            <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
                <div className="md:col-span-2">
                    <div className="flex items-center gap-2 mb-3">
                        <BookOpen size={22} className="text-indigo-400" />
                        <span className="font-bold text-white text-lg tracking-tight">
                            GESTIÓN DE CURSOS ONLINE
                        </span>
                    </div>
                    <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                        Plataforma de formación online que conecta a estudiantes y profesores
                        con seguimiento de progreso en tiempo real, evaluaciones y
                        certificación de cursos.
                    </p>
                    <div className="flex items-center gap-3 mt-5">
                        <a
                            href="mailto:contacto@cursosonline.com"
                            aria-label="Enviar correo"
                            className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 transition-colors"
                        >
                            <Mail size={16} />
                        </a>
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Repositorio en GitHub"
                            className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 transition-colors"
                        >
                            <Github size={16} />
                        </a>
                        <a
                            href="https://linkedin.com"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="LinkedIn"
                            className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 transition-colors"
                        >
                            <Linkedin size={16} />
                        </a>
                    </div>
                </div >

                <div>
                    <h3 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
                        Plataforma
                    </h3>
                    <ul className="space-y-2.5 text-sm">
                        <li>
                            <a href="#features" className="hover:text-white transition-colors">
                                Características
                            </a>
                        </li>
                        <li>
                            <a href="#testimonials" className="hover:text-white transition-colors">
                                Testimonios
                            </a>
                        </li>
                        <li>
                            <Link to="/" onClick={handleHomeClick} className="hover:text-white transition-colors">
                                Inicio
                            </Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-white font-semibold text-sm uppercase tracking-wide mb-4">
                        Legal
                    </h3>
                    <ul className="space-y-2.5 text-sm">
                        <li>
                            <Link to="/privacidad" className="hover:text-white transition-colors">
                                Política de privacidad
                            </Link>
                        </li>
                        <li>
                            <Link to="/terminos" className="hover:text-white transition-colors">
                                Términos de uso
                            </Link>
                        </li>
                        <li>
                            <Link to="/cookies" className="hover:text-white transition-colors">
                                Cookies
                            </Link>
                        </li>
                    </ul>
                </div>
            </div >

            <div className="border-t border-slate-800">
                <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                        &copy; {year} Gestión de Cursos Online — Proyecto de Fin de Grado.
                    </p>
                    <p className="text-xs text-slate-500">
                        Hecho con React, Spring Boot y PostgreSQL.
                    </p>
                </div>
            </div>
        </footer >
    );
};

export default Footer;