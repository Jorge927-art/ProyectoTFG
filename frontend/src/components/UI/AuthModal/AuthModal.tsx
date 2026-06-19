import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import Input from '../Input';
import axios from 'axios';
import { useAuth } from '@/auth';
import type { AuthTokenResponse } from '@/auth/authTypes';
import { apiClient } from '@/services/apiClient';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoginView: boolean;
    setIsLoginView: (value: boolean) => void;
    onSuccess?: (userData: { username: string; photo?: string }) => void;
}

interface AuthFormState {
    username: string;
    password: string;
}

const initialFormState: AuthFormState = { username: '', password: '' };

const AuthModal = ({ isOpen, onClose, isLoginView, setIsLoginView, onSuccess }: AuthModalProps) => {
    const { login } = useAuth();
    const [formData, setFormData] = useState<AuthFormState>(initialFormState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const isMountedRef = useRef(true);

    // Corregimos el ciclo de vida para React 18 Strict Mode
    useEffect(() => {
        isMountedRef.current = true; // Asegura que esté en true al montar definitivamente
        return () => {
            isMountedRef.current = false;
        };
    }, [isOpen]); // Se sincroniza cada vez que el modal se abre o cierra

    if (!isOpen) return null;

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleClose = () => {
        setFormData(initialFormState);
        setError('');
        setLoading(false);
        onClose();
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/register';
            const response = await apiClient.post(endpoint, formData);

            // Salvaguarda segura ante desmontaje real
            if (!isMountedRef.current) return;

            if (response.status === 200 || response.status === 201) {
                if (isLoginView) {
                    const tokenData = response.data as AuthTokenResponse;

                    if (!tokenData.role || tokenData.role.trim() === '') {
                        setError('El servidor emitió un token de autenticación corrupto o sin privilegios asignados.');
                        setLoading(false);
                        return;
                    }

                    // 1. Almacenamos la sesión en el estado global
                    login(tokenData);

                    // 2. Cerramos el modal de forma limpia
                    handleClose();
                    onSuccess?.({ username: tokenData.username });

                    // 3. Forzamos la redirección nativa según el rol asignado
                    const userRole = String(tokenData.role).toUpperCase().trim();
                    if (userRole === 'ADMIN') {
                        window.location.href = '/admin';
                    } else if (userRole === 'PROFESSOR') {
                        window.location.href = '/professor';
                    } else {
                        window.location.href = '/student';
                    }
                } else {
                    handleClose();
                    setIsLoginView(true);
                }
            }
        } catch (error) {
            if (!isMountedRef.current) return;
            let message = 'Error de conexión con el servidor';

            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    message = 'Nombre de usuario o contraseña incorrectos';
                } else if (error.response?.status === 409) {
                    message = 'El nombre de usuario ya existe';
                } else if (error.response) {
                    const serverResponse = error.response?.data;
                    if (typeof serverResponse === 'string' && serverResponse.trim().length > 0) {
                        message = serverResponse;
                    } else if (serverResponse?.message) {
                        message = serverResponse.message;
                    }
                }
            }
            setError(message);
        } finally {
            // Eliminamos la condición rota: garantizamos que el botón SIEMPRE se desbloquee
            setLoading(false);
        }
    };

    return (
        <div onClick={handleClose} className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm'>
            <div onClick={(e) => e.stopPropagation()} className='bg-white p-8 rounded-xl shadow-xl w-96 relative animate-in fade-in zoom-in duration-200'>
                <h2 className='text-2xl font-extrabold mb-6 text-gray-800'>
                    {isLoginView ? 'Iniciar Sesión' : 'Regístrate aquí'}
                </h2>

                {error && (
                    <p className='bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium'>
                        {error}
                    </p>
                )}

                <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                    <Input name='username' type='text' placeholder='Nombre de usuario' value={formData.username} onChange={handleChange} autoComplete='off' required />
                    <Input name='password' type='password' placeholder='Contraseña' value={formData.password} onChange={handleChange} autoComplete='current-password' required />
                    <button type='submit' disabled={loading} className={`py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
                        {loading ? 'Procesando...' : 'Entrar'}
                    </button>
                </form>

                <div className='mt-6 text-center text-sm text-gray-600'>
                    <p>
                        {isLoginView ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                        <button onClick={() => { setIsLoginView(!isLoginView); setError(''); setFormData(initialFormState); }} className='text-blue-600 font-bold hover:underline ml-1'>
                            {isLoginView ? 'Regístrate aquí' : 'Inicia sesión'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;

