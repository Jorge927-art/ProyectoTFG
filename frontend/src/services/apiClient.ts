import axios from 'axios';
import {
    clearStoredAuth,
    readStoredAuthUser,
    readStoredRefreshToken,
    readStoredToken,
    writeStoredAuthUser,
    writeStoredRefreshToken,
    writeStoredToken
} from '../auth/authStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Instancia centralizada de Axios personalizada para el proyecto.
 */
export const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 5000,
});

type RefreshResponse = {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
};

type RetriableRequestConfig = import('axios').InternalAxiosRequestConfig & {
    _retry?: boolean;
};

let refreshRequestInFlight: Promise<string | null> | null = null;

const AUTH_PATHS_WITHOUT_RETRY = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/logout'
];

function shouldBypassRefresh(url?: string): boolean {
    if (!url) {
        return false;
    }

    return AUTH_PATHS_WITHOUT_RETRY.some((path) => url.includes(path));
}

async function requestNewAccessToken(): Promise<string | null> {
    const refreshToken = readStoredRefreshToken();
    if (!refreshToken) {
        return null;
    }

    try {
        const response = await axios.post<RefreshResponse>(
            `${API_URL}/api/auth/refresh`,
            { refreshToken },
            { timeout: 5000 }
        );

        const newAccessToken = typeof response.data?.accessToken === 'string'
            ? response.data.accessToken.trim()
            : '';

        if (!newAccessToken) {
            return null;
        }

        writeStoredToken(newAccessToken);

        const newRefreshToken = typeof response.data?.refreshToken === 'string'
            ? response.data.refreshToken.trim()
            : '';
        if (newRefreshToken) {
            writeStoredRefreshToken(newRefreshToken);
        }

        const currentUser = readStoredAuthUser();
        if (currentUser) {
            const expiresIn = typeof response.data?.expiresIn === 'number' ? response.data.expiresIn : 0;
            const sessionLifespanMs = expiresIn > 0 ? expiresIn * 1000 : 15 * 60 * 1000;
            writeStoredAuthUser({
                ...currentUser,
                token: newAccessToken,
                refreshToken: newRefreshToken || currentUser.refreshToken,
                expiresAt: Date.now() + sessionLifespanMs
            });
        }

        return newAccessToken;
    } catch {
        return null;
    }
}

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
    async (error) => {
        if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
            return Promise.reject(error);
        }

        const originalRequest = error.config as RetriableRequestConfig;
        if (originalRequest._retry || shouldBypassRefresh(originalRequest.url)) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (!refreshRequestInFlight) {
            refreshRequestInFlight = requestNewAccessToken().finally(() => {
                refreshRequestInFlight = null;
            });
        }

        const renewedAccessToken = await refreshRequestInFlight;
        if (!renewedAccessToken) {
            clearStoredAuth();
            window.dispatchEvent(new Event('auth-session-expired'));
            return Promise.reject(error);
        }

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${renewedAccessToken}`;

        return apiClient.request(originalRequest);
    }
);

