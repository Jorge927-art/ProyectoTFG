import axios from 'axios';
import { readStoredToken } from '../auth/authStorage'; // Helper para leer el JWT

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Instancia centralizada de Axios personalizada para el proyecto.
 */
export const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 5000,
});

/**
 * INTERCEPTOR DE PETICIONES (Request Interceptor)
 * Intercepta la solicitud HTTP saliente e inyecta el token automáticamente.
 */
apiClient.interceptors.request.use(
    (config) => {
        const token = readStoredToken();
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * INTERCEPTOR DE RESPUESTAS (Response Interceptor)
 */
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            // 1. Limpieza de traza inútil en producción
            console.warn('Sesión expirada. Desencadenando limpieza de seguridad...');
            
            // 2. SOLUCCIÓN DE INGENIERÍA: Emitir un evento global personalizado en el DOM
            // Esto avisa al AuthProvider de forma desacoplada para que limpie el estado
            window.dispatchEvent(new Event('auth-session-expired'));
        }
        return Promise.reject(error);
    }
);

