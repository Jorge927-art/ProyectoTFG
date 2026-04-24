import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { X } from 'lucide-react';
import Input from '../Input';
import axios from 'axios';
import { useAuth } from '@/auth';

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
const REQUEST_TIMEOUT_MS = 5000;

const AuthModal = ({ isOpen, onClose, isLoginView, setIsLoginView, onSuccess }: AuthModalProps) => {
    const { login } = useAuth();
    const [formData, setFormData] = useState<AuthFormState>(initialFormState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
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
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
            const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/register';
            const response = await axios.post(`${apiUrl}${endpoint}`, formData, {
                timeout: REQUEST_TIMEOUT_MS,
            });

            if (!isMountedRef.current) return;

            if (response.status === 200 || response.status === 201) {
                login(response.data);
                handleClose();
                onSuccess?.(response.data);
            }
        } catch (error) {
            let message = 'Error de conexión con el servidor';

            if (axios.isAxiosError(error)) {
                const networkErrors = ['ECONNREFUSED', 'ECONNABORTED', 'ERR_NETWORK', 'ETIMEDOUT'];
                if (networkErrors.includes(error.code || '') || error.message?.includes('timeout') || !error.response) {
                    message = 'No se pudo conectar con el servidor. Verifica que el backend esté encendido';
                } else if (error.response) {
                    const serverResponse = error.response?.data;
                    if (typeof serverResponse === 'string') {
                        message = serverResponse;
                    } else if (serverResponse?.message) {
                        message = serverResponse.message;
                    } else if (error.response?.status === 409) {
                        message = 'El nombre de usuario ya existe';
                    }
                }
            } else {
                message = 'No se pudo conectar con el servidor. Verifica que el backend esté encendido';
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            onClick={handleClose}
            className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm'
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className='bg-white p-8 rounded-xl shadow-xl w-96 relative animate-in fade-in zoom-in duration-200'
            >
                <button
                    onClick={handleClose}
                    className='absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors'
                    aria-label='Cerrar modal'
                >
                    <X size={24} />
                </button>

                <h2 className='text-2xl font-extrabold mb-6 text-gray-800'>
                    {isLoginView ? 'Iniciar Sesión' : 'Regístrate aquí'}
                </h2>

                {error && (
                    <p className='bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium'>
                        {error}
                    </p>
                )}

                <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                    <Input
                        name='username'
                        type='text'
                        placeholder='Nombre de usuario'
                        value={formData.username}
                        onChange={handleChange}
                        autoComplete='off'
                        required
                    />
                    <Input
                        name='password'
                        type='password'
                        placeholder='Contraseña'
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete='new-password'
                        required
                    />
                    <button
                        type='submit'
                        disabled={loading}
                        className={`py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                    >
                        {loading ? 'Procesando...' : (isLoginView ? 'Entrar' : 'Crear Cuenta')}
                    </button>
                </form>

                <div className='mt-6 text-center text-sm text-gray-600'>
                    <p>
                        {isLoginView ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                        <button
                            onClick={() => {
                                setIsLoginView(!isLoginView);
                                setError('');
                                setFormData(initialFormState);
                            }}
                            className='text-blue-600 font-bold hover:underline ml-1'
                        >
                            {isLoginView ? 'Regístrate aquí' : 'Inicia sesión'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
