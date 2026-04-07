import { useEffect, useRef, useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { X } from 'lucide-react';
import Input from "../Input";
import axios from 'axios';

/**
 * Configuración de props para el modal de autenticación.
 */
interface AuthModalProps {
    /** Indicador de visibilidad del modal. */
    isOpen: boolean;
    /** Callback ejecutado al cerrar el modal. */
    onClose: () => void;
    /** Modo de formulario activo: login (`true`) o registro (`false`). */
    isLoginView: boolean;
    /** Setter para alternar entre login y registro. */
    setIsLoginView: (value: boolean) => void;
    /** Callback invocado cuando la autenticación es exitosa. */
    onSuccess?: (userData: { username: string; photo?: string }) => void;
}

/**
 * Modelo de datos del formulario de credenciales.
 */
interface AuthFormState {
    username: string;
    password: string;
}

const initialFormState: AuthFormState = { username: "", password: "" };

/**
 * Modal de autenticación que gestiona login y registro.
 *
 * @param isOpen - Indicador de renderizado del modal.
 * @param onClose - Callback para cerrar el modal y limpiar el estado interno.
 * @param isLoginView - Modo activo: `true` para login, `false` para registro.
 * @param setIsLoginView - Setter para alternar entre las vistas.
 */
const AuthModal = ({ isOpen, onClose, isLoginView, setIsLoginView, onSuccess }: AuthModalProps) => {
    // Estado local del formulario para controlar los valores de los inputs
    // sin exponerlos al árbol de componentes superior.
    const [formData, setFormData] = useState<AuthFormState>(initialFormState);
    // Estado de la petición para bloquear acciones mientras se procesa el login/registro.
    const [loading, setLoading] = useState(false);
    // Mensaje de error que se muestra dentro del modal sin navegar fuera de la vista.
    const [error, setError] = useState("");
    // Referencia que evita actualizar estado si el modal se desmonta durante la petición.
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    if (!isOpen) return null;

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleClose = () => {
        setFormData(initialFormState);
        setError("");
        onClose();
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (formData.password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setLoading(true);

        try {
            const endpoint = isLoginView ? "/api/auth/login" : "/api/auth/register";
            const response = await axios.post(`http://localhost:8080${endpoint}`, formData);

            if (!isMountedRef.current) return;

            if (response.status === 200 || response.status === 201) {
                // Persistimos el usuario en localStorage para mantener la sesión
                // incluso si el usuario recarga la página.
                localStorage.setItem('user', JSON.stringify(response.data));
                // Propagamos el usuario autenticado al padre para evitar
                // recargar la página y actualizar la interacción en caliente.
                onSuccess?.(response.data);
                onClose();
            }
        } catch (error) {
            if (!isMountedRef.current) return;

            let message = "Error de conexión con el servidor";

            if (axios.isAxiosError(error)) {
                const serverResponse = error.response?.data;

                if (typeof serverResponse === 'string') {
                    message = serverResponse;
                } else if (serverResponse?.message) {
                    message = serverResponse.message;
                } else if (error.response?.status === 409) {
                    message = "El nombre de usuario ya existe";
                }
            }

            setError(message);
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    };

    return (
        <div
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
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

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <Input
                        name="username"
                        type="text"
                        placeholder="Nombre de usuario"
                        value={formData.username}
                        onChange={handleChange}
                        autoComplete="off"
                        required
                    />
                    <Input
                        name="password"
                        type="password"
                        placeholder="Contraseña"
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className={`py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
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


