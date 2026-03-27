import { useState } from "react";
import { Home, Search, LogIn } from 'lucide-react';
import GenericButton from "../UI/GenericButton/GenericButton";
import AuthModal from "../UI/AuthModal/AuthModal";

/**
 * Componente Navbar que contiene la barra de navegación principal de la aplicación.
 * Incluye botones para ir al inicio, buscar y abrir el modal de autenticación.
 * @returns 
 */
const Navbar = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoginView, setIsLoginView] = useState(true);

    return (
        <>
            <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3 z-50">
                <div className="w-full px-6 grid grid-cols-3 items-center h-16">
                    <div className="flex justify-start">
                        <GenericButton
                            text="Inicio"
                            icon={<Home size={18} />}
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        />
                    </div>

                    <div className="flex justify-center items-center font-bold text-gray-600">
                        <span className="text-3xl">GESTIÓN DE CURSOS ONLINE</span>
                    </div>

                    <div className="flex justify-end gap-2">
                        <GenericButton
                            text="¿Qué deseas aprender?"
                            variant="search"
                            icon={<Search size={20} className="text-gray-500" />}
                            onClick={() => console.log("Buscando...")}
                        />

                        <GenericButton
                            text="Entrar / Registro"
                            icon={<LogIn size={18} />}
                            onClick={() => {
                                setIsLoginView(true); // Por defecto abrir en Login
                                setIsModalOpen(true);
                            }}
                        />
                    </div>
                </div>
            </nav>

            {/* Inyectamos el Modal separado */}
            <AuthModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                isLoginView={isLoginView}
                setIsLoginView={setIsLoginView}
            />
        </>
    );
};

export default Navbar;
