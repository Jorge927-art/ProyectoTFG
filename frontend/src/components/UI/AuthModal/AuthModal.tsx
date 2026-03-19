import { useState } from "react";
import { X } from 'lucide-react';
import Input from "../Input"; 

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoginView: boolean;
    setIsLoginView: (value: boolean) => void;
}

const initialFormState = { username: "", password: "" };

const AuthModal = ({ isOpen, onClose, isLoginView, setIsLoginView }: AuthModalProps) => {
    const [formData, setFormData] = useState(initialFormState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [uniqueId] = useState(() => crypto.randomUUID().substring(0, 8));

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const fieldName = name.includes("user") ? "username" : "password";
        setFormData(prev => ({ ...prev, [fieldName]: value }));
    };

    const handleClose = () => {
        setFormData(initialFormState);
        setError("");
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        if (formData.password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setLoading(true);
        try {
            const endpoint = isLoginView ? "/api/login" : "/api/register";
            console.log(`Enviando a ${endpoint}:`, formData);
            // Simulación de API
            setTimeout(() => {
                setLoading(false);
                handleClose();
            }, 1000);
        } catch {
            setError("Error de conexión con el servidor");
            setLoading(false);
        }
    };

    return (
        <div 
            onClick={handleClose} 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm"
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white p-8 rounded-xl shadow-xl w-96 relative animate-in fade-in zoom-in duration-200"
            >
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Cerrar modal"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-extrabold mb-6 text-gray-800">
                    {isLoginView ? "Iniciar Sesión" : "Regístrate aquí"}
                </h2>

                {error && (
                    <p className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">
                        {error}
                    </p>
                )}

                <form 
                    onSubmit={handleSubmit} 
                    className="flex flex-col gap-4">
                    {/* USANDO EL INPUT GENÉRICO */}
                    <Input
                        name={isLoginView ? "username" : `user_${uniqueId}`}
                        type="text"
                        placeholder="Nombre de usuario"
                        value={formData.username}
                        onChange={handleChange}
                        autoComplete={isLoginView ? "username" : "off"}
                        required
                    />
                    <Input
                        name={isLoginView ? "password" : `pass_${uniqueId}`}
                        type="password"
                        placeholder="Contraseña"
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete={isLoginView ? "current-password" : "new-password"}
                        required
                    />
                    <button 
                        type="submit"
                        disabled={loading}
                        className={`py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg ${
                            loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                        } text-white`}
                    >
                        {loading ? "Procesando..." : (isLoginView ? "Entrar" : "Crear Cuenta")}
                    </button>  
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    <p>
                        {isLoginView ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
                        <button 
                            onClick={() => { 
                                setIsLoginView(!isLoginView);
                                setError("");
                                setFormData(initialFormState);
                            }} 
                            className="text-blue-600 font-bold hover:underline ml-1"
                        >
                            {isLoginView ? "Regístrate aquí" : "Inicia sesión"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;


